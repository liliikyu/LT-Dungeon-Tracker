#!/usr/bin/env python3
"""Refresh assets/dungeon-unique-loot.js from Official La Tale Wiki sources.

Primary source: Dungeons page (Name + Unique Loot columns).
Supplemental source: Endgame page, which lists newer dungeon special gear that is
not always present in the Dungeons table yet.

If the wiki/API is unavailable or parsing returns no usable primary data, the
existing snapshot is left untouched.
"""
from __future__ import annotations

from html.parser import HTMLParser
import json
import re
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

DUNGEONS_PAGE = "Dungeons"
DUNGEONS_SOURCE = "https://latale.wiki.gg/wiki/Dungeons"
ENDGAME_PAGE = "Endgame"
ENDGAME_SOURCE = "https://latale.wiki.gg/wiki/Endgame"
API = "https://latale.wiki.gg/api.php"
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "dungeon-unique-loot.js"

ALIASES = {
    "Dragon's Lair": "Dragon Lair",
    "Garden of the Priring": "Garden Of the Priring",
    "Jewel Forest": "Jewell Forest",
    "Champion's Memorial": "Champions' Memorial",
    "Oblivion Lake": "Oblivon Lake",
    "Promised Sanctuary": "Promised Sancutary",
    "Heart of Reminiscence": "Heart of Reminiscience",
    "Purgatory Azrael": "Purgatory Azreal",
    "Munchkin Storage": "Muchkin Storage",
    "Plemora": "Pleroma",
    "Emereldia": "Emeraldia",
    "Trial of Iron": "Trials of Iron",
}

# Explicit Endgame entries that are documented on the page but are not expressed
# as a simple "Obtain X from Y" sentence (or need tracker-name normalization).
ENDGAME_KNOWN = {
    "Pseudaria": ["Sealed First Gems"],
}


def clean_text(value: str) -> str:
    value = re.sub(r"\[[^\]]+\]", "", value or "")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def positive_int(value: str | None, default: int = 1) -> int:
    try:
        return max(1, int(str(value or default)))
    except (TypeError, ValueError):
        return default


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables: list[list[list[dict]]] = []
        self._table_depth = 0
        self._rows = None
        self._row = None
        self._cell_parts = None
        self._cell_attrs = {}

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attrs = dict(attrs)
        if tag == "table":
            self._table_depth += 1
            if self._table_depth == 1:
                self._rows = []
        elif self._table_depth == 1 and tag == "tr":
            self._row = []
        elif self._table_depth == 1 and tag in {"td", "th"} and self._row is not None:
            self._cell_parts = []
            self._cell_attrs = attrs
        elif self._cell_parts is not None and tag in {"br", "p", "div", "li"}:
            self._cell_parts.append(" | ")

    def handle_data(self, data):
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
                self.tables.append(self._rows)
                self._rows = None
            self._table_depth -= 1


class ListTextParser(HTMLParser):
    """Collect list-item text from a wiki page while preserving item boundaries."""
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.parts: list[str] = []
        self.items: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "li":
            if self.depth == 0:
                self.parts = []
            self.depth += 1
        elif self.depth and tag.lower() in {"br", "p", "div"}:
            self.parts.append(" ")

    def handle_data(self, data):
        if self.depth:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "li" and self.depth:
            self.depth -= 1
            if self.depth == 0:
                text = clean_text("".join(self.parts))
                if text:
                    self.items.append(text)
                self.parts = []


def expand_spans(raw_rows: list[list[dict]]) -> list[list[str]]:
    active: dict[int, tuple[int, str]] = {}
    expanded: list[list[str]] = []
    for raw_row in raw_rows:
        row_map: dict[int, str] = {}
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
    width = max((len(row) for row in expanded), default=0)
    return [row + [""] * (width - len(row)) for row in expanded]


def fetch_page_html(page: str) -> str:
    query = urllib.parse.urlencode({
        "action": "parse", "page": page, "prop": "text",
        "format": "json", "formatversion": "2",
    })
    req = urllib.request.Request(
        f"{API}?{query}",
        headers={"User-Agent": "LtDungeonTracker/1.0 (GitHub Pages data sync)", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        payload = json.loads(response.read().decode("utf-8"))
    html = payload.get("parse", {}).get("text", "")
    if not html:
        raise RuntimeError(f"Wiki API returned no parsed HTML for {page}")
    return html


def split_loot(value: str) -> list[str]:
    value = clean_text(value)
    if not value or value in {"-", "—"}:
        return []
    parts = re.split(r"\s*(?:,|;|\|)\s*", value)
    result = []
    ignored = {"none", "n/a", "na", "no unique loot", "not applicable"}
    for part in parts:
        part = clean_text(part)
        if not part or part.lower() in ignored:
            continue
        if part not in result:
            result.append(part)
    return result


def parse_dungeons_page(html: str) -> dict[str, list[str]]:
    parser = TableParser()
    parser.feed(html)
    dungeons: dict[str, list[str]] = {}
    for raw_table in parser.tables:
        table = expand_spans(raw_table)
        if not table:
            continue
        header_index = name_index = loot_index = None
        for idx, row in enumerate(table[:8]):
            headers = [clean_text(v).lower() for v in row]
            if "name" in headers and "unique loot" in headers:
                header_index = idx
                name_index = headers.index("name")
                loot_index = headers.index("unique loot")
                break
        if header_index is None:
            continue
        for row in table[header_index + 1:]:
            if name_index >= len(row) or loot_index >= len(row):
                continue
            name = clean_text(row[name_index])
            loot = split_loot(row[loot_index])
            if not name or not loot:
                continue
            name = ALIASES.get(name, name)
            bucket = dungeons.setdefault(name, [])
            for item in loot:
                if item not in bucket:
                    bucket.append(item)
    if not dungeons:
        raise RuntimeError("No Dungeon Unique Loot could be parsed; keeping existing snapshot")
    return dungeons


def parse_endgame_page(html: str) -> dict[str, list[str]]:
    parser = ListTextParser()
    parser.feed(html)
    result: dict[str, list[str]] = {}
    # e.g. "Obtain Notoria Sticker from Eroded Arcane Hall ( Lv.8300)"
    pattern = re.compile(r"\bObtain\s+(.+?)\s+from\s+(.+?)(?:\s*\(\s*Lv\.?\s*[0-9]+\s*\)|$)", re.I)
    for item_text in parser.items:
        match = pattern.search(item_text)
        if not match:
            continue
        item = clean_text(match.group(1))
        dungeon = clean_text(match.group(2))
        # Trim guidance phrases that are not part of an item name.
        item = re.sub(r"^the latest version of\s+", "", item, flags=re.I)
        dungeon = ALIASES.get(dungeon, dungeon)
        if not item or not dungeon:
            continue
        bucket = result.setdefault(dungeon, [])
        if item not in bucket:
            bucket.append(item)
    for dungeon, items in ENDGAME_KNOWN.items():
        bucket = result.setdefault(ALIASES.get(dungeon, dungeon), [])
        for item in items:
            if item not in bucket:
                bucket.append(item)
    return result


def merge_data(primary: dict[str, list[str]], supplemental: dict[str, list[str]]) -> dict[str, list[str]]:
    merged = {name: list(items) for name, items in primary.items()}
    for name, items in supplemental.items():
        bucket = merged.setdefault(name, [])
        for item in items:
            if item not in bucket:
                bucket.append(item)
    return merged


def read_existing() -> dict:
    if not OUTPUT.exists():
        return {}
    text = OUTPUT.read_text(encoding="utf-8")
    match = re.search(r"window\.LT_DUNGEON_UNIQUE_LOOT\s*=\s*(\{.*\})\s*;?\s*$", text, flags=re.S)
    if not match:
        return {}
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return {}


def self_test() -> None:
    sample = '''<table><tr><th>Name</th><th>Unique Loot</th></tr>
      <tr><td>Dragon's Lair</td><td>Invoke Set</td></tr>
      <tr><td>Icicle Prison</td><td>Argos Belt<br>Argos Gem</td></tr>
      <tr><td>No Loot</td><td>None</td></tr></table>'''
    parsed = parse_dungeons_page(sample)
    assert parsed["Dragon Lair"] == ["Invoke Set"]
    assert parsed["Icicle Prison"] == ["Argos Belt", "Argos Gem"]
    assert "No Loot" not in parsed
    end_sample = '''<ul><li>Obtain Notoria Sticker from Eroded Arcane Hall ( Lv.8300)</li>
      <li>Obtain Bunny Bunny Belt from Munchkin Storage ( Lv.8800)</li></ul>'''
    end = parse_endgame_page(end_sample)
    assert end["Eroded Arcane Hall"] == ["Notoria Sticker"]
    assert end["Muchkin Storage"] == ["Bunny Bunny Belt"]
    assert end["Pseudaria"] == ["Sealed First Gems"]


def main() -> None:
    self_test()
    primary = parse_dungeons_page(fetch_page_html(DUNGEONS_PAGE))
    try:
        supplemental = parse_endgame_page(fetch_page_html(ENDGAME_PAGE))
    except Exception as exc:
        print(f"Warning: Endgame supplemental source unavailable: {exc}")
        supplemental = {}
    dungeons = merge_data(primary, supplemental)
    existing = read_existing()
    if existing.get("dungeons") == dungeons:
        print(f"Dungeon Unique Loot unchanged ({sum(map(len, dungeons.values()))} entries).")
        return
    data = {
        "sources": [DUNGEONS_SOURCE, ENDGAME_SOURCE],
        "source": DUNGEONS_SOURCE,
        "updated": date.today().isoformat(),
        "dungeons": dungeons,
    }
    OUTPUT.write_text(
        "window.LT_DUNGEON_UNIQUE_LOOT = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {sum(map(len, dungeons.values()))} Unique Loot entries across {len(dungeons)} dungeons.")


if __name__ == "__main__":
    main()
