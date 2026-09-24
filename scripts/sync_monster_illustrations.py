#!/usr/bin/env python3
"""Refresh assets/monster-illustrations.js from the Official La Tale Wiki.

This version expands HTML rowspan/colspan before reading table columns. That is
important because wiki.gg uses merged Location cells for long dungeon groups;
without span expansion, later monster rows can shift left and lose their dungeon.

If the wiki/API is unavailable or parsing produces no dungeon data, the script
fails without replacing the existing snapshot.
"""
from __future__ import annotations

from html.parser import HTMLParser
import json
import re
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

PAGE = "Monster_Illustrations"
SOURCE = "https://latale.wiki.gg/wiki/Monster_Illustrations"
API = "https://latale.wiki.gg/api.php"
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "monster-illustrations.js"

MONSTER_NAME_FIXES = {
    "Shadow SaElemental Intensity Steed": "Saint Steed",
}

ALIASES = {
    "Dragon's Lair": "Dragon Lair",
    "Shangri-La": "Shangri-la",
    "Pyramid": "Treasure Vault",
    "Phantom Ship": "Captain Johnny's Room",
    "Ktuka Underworld": "Heart of Ktuka",
    "Challenge Choco Garden": "TAID Choco Garden",
    "Taid: Dragon Garden": "TAID Dragon Garden",
    "TAID: Dragon Garden": "TAID Dragon Garden",
    "World Genesis": "World's Genesis",
    "Jewell Forest": "Jewel Forest",
    "Promised Sanctuary": "Promised Sancutary",
    "Oblivion Lake": "Oblivon Lake",
    "Munchkin Storage": "Muchkin Storage",
    "Purgatory Azrael": "Purgatory Azreal",
    "Ymir Institute": "Ymir Institute",
    "Forgotten Garden": "Forgotten Garden",
}


# Tracker-side authoritative corrections for wiki table groups that have historically
# been mis-assigned when Location cells span many rows. These values mirror the
# Official La Tale Wiki Monster Illustrations page and replace (not append to)
# the parsed group so monsters cannot bleed in from an adjacent dungeon.
DUNGEON_MONSTER_LEVEL_FIXES = {
    # In-game Illustration Book places the regular Invoke / Dragon Lair monsters
    # in the Lv. 21 ~ 40 group. The wiki HTML currently associates them with the
    # preceding Lv. 1 ~ 20 collapsible band.
    ("Dragon Lair", "Mabem"): "Lv. 21 ~ 40",
    ("Dragon Lair", "Mabem Soul"): "Lv. 21 ~ 40",
    ("Dragon Lair", "Sir Percival"): "Lv. 21 ~ 40",
    ("Dragon Lair", "Fierie"): "Lv. 21 ~ 40",
    ("Dragon Lair", "Chimera"): "Lv. 21 ~ 40",
}

KNOWN_DUNGEON_ILLUSTRATIONS = {
    "Acro Coffin": [
        "Drowsy Liocat", "Aquila Warrior", "Aquila Champion", "Wind Star Squirrel",
        "Snow Star Squirrel", "Lightning Star Squirrel", "Elixir Homun",
        "Nakun Ranger", "Nakun Chaser", "Minos",
    ],
    "Purgatory Azreal": [
        "Likely Gamaliel", "Probably Gamaliel", "Burning Golacav", "Mashed Golacav",
        "Seductive Golacav", "Sad Girion", "Joyful Girion", "Happy Girion",
        "Samael of Justice", "Samael of Truth", "Samael of Trust", "Red Beaked Harab",
        "Gha'agsheblah of Greed", "Gha'agsheblah of Stupor", "Thamiel", "Vice The Sinner",
    ],
    "Moksha": [
        "Insidious Kilesa", "Vicious Kilesa", "Water Lila", "Fire Lila",
        "Wind Lila", "Lightning Lila", "Joyful Griffon", "Energetic Griffon",
        "Lefica",
    ],
    "Mushroom Swamp": [
        "Sylphin of the South", "Sylphin of the North", "Blue Berserker",
        "Poison Berserker", "Tired Agoste", "Crazy Agoste", "Yankas",
    ],
    "Pleroma": [
        "Kitty Nous", "Doggy Nous", "Deer Nous", "Hammy Nous", "Cool Ratscy",
        "Shocked Ratscy", "Excellent Ratscy", "Acquired Logona", "Realized Logona",
        "Training Logona", "Fate Danamis", "Miracle Danamis", "Fractured Danamis",
        "Hard Working Phrone", "Training Phrone", "Habitual Phrone", "Mr. Demonic",
        "Demiurge",
    ],
    "Eroded Arcane Hall": [
        "Magistrate Owl Wizard", "Veteran Owl Wizard", "Master Owl Wizard",
        "Darkness Book Golem", "Holy Book Golem", "Lab 1 Magic Researcher",
        "Lab 2 Magic Researcher", "Lab 3 Magic Researcher", "Ego Notoria",
    ],
    "Muchkin Storage": [
        "Flying Bronze Mimic", "Flying Silver Mimic", "Flying Gold Mimic",
        "Messy Cooking Master", "Messy Cooking Chef", "Munchkin Euphonist",
        "Munchkin Basoonist", "Bunny Bunny Luseria",
    ],
    "Zerenis Headquarters": [
        "Lazy Spirit Of Intelligence", "Doctor Vampire", "Engineer Vampire",
        "Precious Succubus", "Timid Succubus", "Gardener Souly",
        "Remu Remu", "Epu Epu", "Nemu Nemu", "Calm Q-riring",
        "Famous Q-riring", "Einhorn", "Chloris",
    ],
    "Mare Ingenii": [
        "Spike Vogas", "Electric Vogas", "Poison Vogas", "Joyful Jellypi",
        "Happy Jellypi", "Cheerful Jellypi", "Taciturn Oll-Ruwool",
        "Calm Oll-Ruwool", "Composed Oll-Ruwool", "Ruthless Oll-Ruwool", "Gabriella",
    ],
}


def clean_text(value: str) -> str:
    value = re.sub(r"\[[^\]]+\]", "", value or "")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def positive_int(value: str | None, default: int = 1) -> int:
    try:
        n = int(str(value or default))
        return max(1, n)
    except (TypeError, ValueError):
        return default


def level_section(text: str) -> str:
    """Extract the most recent wiki Monster Illustration level band."""
    h = clean_text(text)
    matches = list(re.finditer(r"((?:S?Lv\.?\s*)?\d+\s*[~\-–—]\s*\d+)\s*(?:Monsters?)?", h, flags=re.I))
    if not matches:
        return ""
    # The parser keeps a short rolling text window. When a new section starts,
    # that window can contain both the previous and current level headings.
    # Always use the last band mentioned so the next table gets the current one.
    label = clean_text(matches[-1].group(1))
    label = re.sub(r"^Lv\s+", "Lv. ", label, flags=re.I)
    label = re.sub(r"^SLv\s+", "SLv. ", label, flags=re.I)
    return label


def monster_section(text: str) -> str:
    """Extract the Illustration Book category applying to the following table."""
    h = clean_text(text)
    level = level_section(h)
    if level:
        return level
    # Check Mutant before Boss because the rolling text window can still contain
    # the preceding "Boss Monster" heading when the Mutant section starts.
    if re.search(r"\bMutant\s+Monsters?\b", h, flags=re.I):
        return "Mutant Monster"
    if re.search(r"\b(?:5Lv\s*)?Boss\s+Monsters?\b", h, flags=re.I):
        return "Boss Monster"
    return ""


class TableParser(HTMLParser):
    """Capture top-level wiki tables while preserving rowspan/colspan metadata."""

    def __init__(self):
        super().__init__()
        self.tables: list[tuple[str, list[list[dict]]]] = []
        self._table_depth = 0
        self._current_section = ""
        self._table_section = ""
        self._recent_text: list[str] = []
        self._rows: list[list[dict]] | None = None
        self._row: list[dict] | None = None
        self._cell_parts: list[str] | None = None
        self._cell_attrs: dict[str, str] = {}

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attrs = dict(attrs)
        if tag == "table":
            self._table_depth += 1
            if self._table_depth == 1:
                self._rows = []
                self._table_section = self._current_section
        elif self._table_depth == 1 and tag == "tr":
            self._row = []
        elif self._table_depth == 1 and tag in {"td", "th"} and self._row is not None:
            self._cell_parts = []
            self._cell_attrs = attrs
        elif self._cell_parts is not None and tag in {"br", "p", "div", "li"}:
            self._cell_parts.append(" ")

    def handle_data(self, data):
        if data:
            self._recent_text.append(data)
            self._recent_text = self._recent_text[-12:]
            detected = monster_section(" ".join(self._recent_text))
            if detected:
                self._current_section = detected
                # Wiki level/category labels can appear inside the collapsible
                # table wrapper after <table> has already opened. Update the
                # active table too, otherwise every section is shifted back by
                # one band (for example Shangri-la appearing as 1~20/21~40).
                if self._table_depth == 1:
                    self._table_section = detected
        if self._cell_parts is not None:
            self._cell_parts.append(data)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if self._table_depth == 1 and tag in {"td", "th"} and self._cell_parts is not None:
            self._row.append({
                "text": clean_text("".join(self._cell_parts)),
                "rowspan": positive_int(self._cell_attrs.get("rowspan")),
                "colspan": positive_int(self._cell_attrs.get("colspan")),
            })
            self._cell_parts = None
            self._cell_attrs = {}
        elif self._table_depth == 1 and tag == "tr" and self._row is not None:
            if self._row:
                self._rows.append(self._row)
            self._row = None
        elif tag == "table" and self._table_depth:
            if self._table_depth == 1 and self._rows is not None:
                self.tables.append((self._table_section or self._current_section, self._rows))
                self._rows = None
            self._table_depth -= 1


def expand_spans(raw_rows: list[list[dict]]) -> list[list[str]]:
    """Expand HTML rowspan/colspan into a rectangular logical table."""
    active: dict[int, tuple[int, str]] = {}  # column -> (future rows remaining, text)
    expanded: list[list[str]] = []

    for raw_row in raw_rows:
        row_map: dict[int, str] = {}

        # Cells inherited from a rowspan occupy their original logical columns.
        for col, (remaining, text) in list(active.items()):
            row_map[col] = text
            if remaining <= 1:
                del active[col]
            else:
                active[col] = (remaining - 1, text)

        col = 0
        for cell in raw_row:
            while col in row_map:
                col += 1
            text = clean_text(cell.get("text", ""))
            rowspan = positive_int(cell.get("rowspan"))
            colspan = positive_int(cell.get("colspan"))
            for offset in range(colspan):
                target = col + offset
                row_map[target] = text
                if rowspan > 1:
                    active[target] = (rowspan - 1, text)
            col += colspan

        width = max(row_map.keys(), default=-1) + 1
        expanded.append([row_map.get(i, "") for i in range(width)])

    # Normalize all rows to the same width for safe column indexing.
    width = max((len(row) for row in expanded), default=0)
    return [row + [""] * (width - len(row)) for row in expanded]


def fetch_html() -> str:
    query = urllib.parse.urlencode({
        "action": "parse",
        "page": PAGE,
        "prop": "text",
        "format": "json",
        "formatversion": "2",
    })
    req = urllib.request.Request(
        f"{API}?{query}",
        headers={
            "User-Agent": "LtBossMaterialRegister/1.1 (GitHub Pages data sync)",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    html = payload.get("parse", {}).get("text", "")
    if not html:
        raise RuntimeError("Wiki API returned no parsed HTML")
    return html


def canonical_dungeon(location: str) -> str | None:
    location = clean_text(location)
    # wiki location cells can contain line breaks; clean_text already flattens them.
    match = re.match(r"^(.*?)\s*\(Dungeon\)\s*$", location, flags=re.I)
    if not match:
        return None
    name = clean_text(match.group(1))
    return ALIASES.get(name, name)


def section_score(section: str) -> tuple[int, int]:
    """Prefer explicit special categories, otherwise the later/higher level band."""
    s = clean_text(section)
    if s == "Mutant Monster":
        return (4, 0)
    if s == "Boss Monster":
        return (3, 0)
    m = re.search(r"(\d+)", s)
    if re.match(r"^(?:S?Lv\.)", s, flags=re.I) and m:
        return (2, int(m.group(1)))
    return (0, 0)


def better_section(current: str, candidate: str) -> str:
    return candidate if section_score(candidate) > section_score(current) else current


def parse_dungeons(html: str) -> dict[str, list[dict]]:
    parser = TableParser()
    parser.feed(html)
    dungeons: dict[str, list[dict]] = {}
    section_by_monster: dict[tuple[str, str], str] = {}
    sections_by_name: dict[str, set[str]] = {}

    for table_section, raw_table in parser.tables:
        table = expand_spans(raw_table)
        if not table:
            continue

        header_index = None
        name_index = location_index = None
        for idx, row in enumerate(table[:8]):
            headers = [clean_text(v).lower() for v in row]
            if "name" in headers and "location" in headers:
                header_index = idx
                name_index = headers.index("name")
                location_index = headers.index("location")
                break
        if header_index is None or name_index is None or location_index is None:
            continue

        for row in table[header_index + 1:]:
            if name_index >= len(row) or location_index >= len(row):
                continue
            name = MONSTER_NAME_FIXES.get(clean_text(row[name_index]), clean_text(row[name_index]))
            location = clean_text(row[location_index])
            if not name or not location:
                continue
            dungeon = canonical_dungeon(location)
            if not dungeon:
                continue

            section = DUNGEON_MONSTER_LEVEL_FIXES.get((dungeon, name), table_section)
            if re.match(r"^Mutant\s+", name, flags=re.I):
                section = "Mutant Monster"

            pair = (dungeon, name)
            if section:
                section_by_monster[pair] = better_section(section_by_monster.get(pair, ""), section)
                sections_by_name.setdefault(name, set()).add(section)

            chosen = section_by_monster.get(pair, section)
            level = chosen if re.match(r"^(?:S?Lv\.)", chosen or "", flags=re.I) else ""
            bucket = dungeons.setdefault(dungeon, [])
            existing = next((entry for entry in bucket if entry.get("name") == name), None)
            if existing is None:
                bucket.append({"name": name, "group": chosen, "level": level})
            else:
                existing["group"] = chosen
                existing["level"] = level

    if not dungeons:
        raise RuntimeError("No dungeon Monster Illustrations could be parsed; keeping existing snapshot")

    def resolved_section(dungeon: str, monster: str) -> str:
        exact = section_by_monster.get((dungeon, monster), "")
        if exact:
            return exact
        candidates = {s for s in sections_by_name.get(monster, set()) if s}
        if len(candidates) == 1:
            return next(iter(candidates))
        return ""

    for dungeon, monsters in KNOWN_DUNGEON_ILLUSTRATIONS.items():
        fixed = []
        for monster in monsters:
            section = resolved_section(dungeon, monster)
            level = section if re.match(r"^(?:S?Lv\.)", section or "", flags=re.I) else ""
            fixed.append({"name": monster, "group": section, "level": level})
        dungeons[dungeon] = fixed

    return dungeons


def read_existing() -> dict:
    if not OUTPUT.exists():
        return {}
    text = OUTPUT.read_text(encoding="utf-8")
    match = re.search(r"window\.LT_MONSTER_ILLUSTRATIONS\s*=\s*(\{.*\})\s*;?\s*$", text, flags=re.S)
    if not match:
        return {}
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return {}


def self_test() -> None:
    # The key regression case: one Location cell spans multiple monster rows.
    sample = '''<table><tr><th>Name</th><th>Stat</th><th>Location</th></tr>
      <tr><td>A</td><td>+1</td><td rowspan="3">Forgotten Garden<br>(Dungeon)</td></tr>
      <tr><td>B</td><td>+2</td></tr><tr><td>C</td><td>+3</td></tr></table>'''
    parsed = parse_dungeons(sample)
    assert [entry["name"] for entry in parsed.get("Forgotten Garden", [])] == ["A", "B", "C"], parsed


def main():
    self_test()
    dungeons = parse_dungeons(fetch_html())
    existing = read_existing()
    if existing.get("dungeons") == dungeons:
        print(f"Monster Illustration list unchanged ({sum(map(len, dungeons.values()))} entries).")
        return

    data = {
        "source": SOURCE,
        "updated": date.today().isoformat(),
        "dungeons": dungeons,
    }
    OUTPUT.write_text(
        "window.LT_MONSTER_ILLUSTRATIONS = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {sum(map(len, dungeons.values()))} Monster Illustrations across {len(dungeons)} dungeons.")


if __name__ == "__main__":
    main()
