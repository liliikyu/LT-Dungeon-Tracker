#!/usr/bin/env python3
"""Sync Google Sheet tabs ``dungeon_id`` + ``dungeon_drop`` into assets/data.js.

These two normalized tabs are the website source of truth for dungeon identity,
entries, drop/codex rows, title recipes, and title unlock requirements.

``item_upgrade`` is intentionally NOT consumed by this website sync yet.
No third-party Python packages are required.
"""
from __future__ import annotations

import csv
import io
import json
import re
import urllib.parse
import urllib.request
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path

SHEET_ID = "15aKwZohEpEwa9fOOnrcqZvAQ-JdHrVLcRTKglM2g1EQ"
DUNGEON_ID_SHEET_NAME = "dungeon_id"
DUNGEON_DROP_SHEET_NAME = "dungeon_drop"
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "data.js"

UPGRADE_COLUMNS = [f"upgrade_item_{n}_id" for n in range(1, 15)]


def fetch_rows(sheet_name: str) -> list[list[str]]:
    url = (
        f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?"
        + urllib.parse.urlencode({"tqx": "out:csv", "sheet": sheet_name})
    )
    req = urllib.request.Request(url, headers={"User-Agent": "lt-normalized-dungeon-sync/2.0"})
    with urllib.request.urlopen(req, timeout=60) as response:
        text = response.read().decode("utf-8-sig")
    return list(csv.reader(io.StringIO(text)))


def normalized_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_")


def clean_text(value):
    text = str(value or "").strip()
    return text or None


def clean_number(value):
    text = str(value or "").strip().replace(",", "")
    if not text:
        return None
    try:
        number = float(text)
        return int(number) if number.is_integer() else number
    except ValueError:
        return clean_text(value)


def is_truthy(value) -> bool:
    return str(value or "").strip().lower() in {"true", "yes", "y", "1", "x"}


def rows_as_dicts(rows: list[list[str]], *, required: tuple[str, ...]) -> list[dict[str, str]]:
    if not rows:
        raise RuntimeError("Google Sheet returned no rows.")
    headers = [normalized_header(value) for value in rows[0]]
    missing = [name for name in required if name not in headers]
    if missing:
        raise RuntimeError(f"Missing expected columns: {', '.join(missing)}")
    result = []
    for source_row in rows[1:]:
        padded = source_row + [""] * max(0, len(headers) - len(source_row))
        row = {headers[i]: padded[i] if i < len(padded) else "" for i in range(len(headers))}
        if any(str(value or "").strip() for value in row.values()):
            result.append(row)
    return result


def level_info(raw):
    text = str(raw or "").strip().upper().replace(" ", "")
    match = re.match(r"^SL(?:V)?\.?([0-9]+)", text)
    if match:
        return "SLv", int(match.group(1)), "SLv. 1+"
    match = re.match(r"^UL(?:V)?\.?([0-9]+)", text)
    if match:
        value = int(match.group(1))
        if value <= 1000:
            category = "ULv. 1–1000"
        elif 1300 <= value <= 3500:
            category = "ULv. 1300–3500"
        elif 3700 <= value <= 8000:
            category = "ULv. 3700–8000"
        elif 8300 <= value <= 9999:
            category = "ULv. 8300–9999"
        else:
            category = "Other"
        return "ULv", value, category
    match = re.search(r"([0-9]+)", text)
    if match:
        value = int(match.group(1))
        return "Lv", value, "Lv. 1–199" if value <= 199 else "Lv. 200–235"
    return "Unknown", None, "Other"


def display_type_suffix(category: str | None) -> str:
    value = str(category or "").strip().lower()
    return {
        "equipment": "Equipment",
        "event": "Event",
        "etc": "ETC",
        "consume": "Consume",
    }.get(value, "")


def category_from_item_type(item_type: str | None) -> str | None:
    value = str(item_type or "").strip().lower()
    if not value:
        return None
    if value in {"upgrade_material", "upgrade_material_asc"}:
        return "event"
    if value in {"misc", "miisc"}:
        return "etc"
    if value == "consume":
        return "consume"
    if value in {"bank", "zodiac"}:
        return None
    # Remaining populated item_type values are equipment/progression item categories.
    return "equipment"


def with_type_suffix(name: str, category: str | None) -> str:
    name = str(name or "").strip()
    if not name:
        return ""
    suffix = display_type_suffix(category)
    if not suffix or re.search(r"\((?:Equipment|Event|ETC|Consume)\)\s*$", name, re.I):
        return name
    return f"{name} ({suffix})"


def item_key(name: str) -> str:
    value = str(name or "").lower()
    value = re.sub(r"\((event|etc|consume|equipment|equip)\)", "", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def add_item(items: list[dict], name: str, **flags) -> None:
    name = str(name or "").strip()
    if not name or name.lower() in {"not yet", "n/a", "na"}:
        return
    key = item_key(name)
    if not key:
        return
    existing = next((item for item in items if item["_key"] == key), None)
    if existing is None:
        existing = {
            "_key": key,
            "name": name,
            "codex": False,
            "titleMaterial": False,
            "badge5Material": False,
        }
        items.append(existing)
    elif re.search(r"\((?:Event|ETC|Consume|Equipment)\)\s*$", name, re.I) and not re.search(
        r"\((?:Event|ETC|Consume|Equipment)\)\s*$", existing["name"], re.I
    ):
        existing["name"] = name
    for flag_name in ("codex", "titleMaterial", "badge5Material"):
        existing[flag_name] = existing[flag_name] or bool(flags.get(flag_name))


def normalize_unlock_type(value: str | None) -> str | None:
    text = str(value or "").strip().lower()
    return text or None


def humanize_identifier(value: str | None) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    return re.sub(r"[_-]+", " ", text).strip().title()


def slug(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_")


def build_data(dungeon_rows: list[list[str]], drop_rows: list[list[str]]) -> dict:
    dungeon_records = rows_as_dicts(
        dungeon_rows,
        required=("dungeon_id", "dungeon_name", "dungeon_level", "entry_number_per_day"),
    )
    drop_records = rows_as_dicts(
        drop_rows,
        required=("dungeon_id", "item_type", "item_name"),
    )

    # Only populated master rows become website dungeons. Pre-filled future IDs with blank names are ignored.
    master = OrderedDict()
    for row in dungeon_records:
        dungeon_id = clean_text(row.get("dungeon_id"))
        dungeon_name = clean_text(row.get("dungeon_name"))
        if not dungeon_id or not dungeon_name:
            continue
        row = dict(row)
        row["dungeon_name"] = dungeon_name
        if dungeon_id in master:
            raise RuntimeError(f"Duplicate dungeon_id in {DUNGEON_ID_SHEET_NAME}: {dungeon_id}")
        master[dungeon_id] = row

    grouped_drops: dict[str, list[dict[str, str]]] = {dungeon_id: [] for dungeon_id in master}
    for row in drop_records:
        dungeon_id = clean_text(row.get("dungeon_id"))
        if not dungeon_id:
            continue
        if dungeon_id not in master:
            raise RuntimeError(
                f"{DUNGEON_DROP_SHEET_NAME} references {dungeon_id}, but it does not exist as a populated row in {DUNGEON_ID_SHEET_NAME}."
            )
        grouped_drops[dungeon_id].append(row)

    titles_by_id: OrderedDict[str, dict] = OrderedDict()
    dungeons = []

    for dungeon_id, meta in master.items():
        dungeon_name = clean_text(meta.get("dungeon_name"))
        raw_level = clean_text(meta.get("dungeon_level")) or ""
        level_type, numeric_level, category = level_info(raw_level)
        entries = clean_number(meta.get("entry_number_per_day"))
        account_limited = is_truthy(meta.get("entry_limit_per_account"))
        rows = grouped_drops.get(dungeon_id, [])

        items: list[dict] = []
        drops: list[str] = []
        codex_items: list[str] = []
        badge_materials: list[str] = []

        for row in rows:
            item_name = clean_text(row.get("item_name"))
            item_type = str(row.get("item_type") or "").strip().lower()
            if item_name:
                if item_name not in drops:
                    drops.append(item_name)

                codex = is_truthy(row.get("codex_material"))
                codex_name = clean_text(row.get("codex_name")) or item_name
                row_category = clean_text(row.get("codex_category")) if codex else None
                display_category = row_category or category_from_item_type(item_type)
                codex_display = with_type_suffix(codex_name, display_category) if codex else ""
                unlock_type = normalize_unlock_type(row.get("title_unlock_type"))
                title_material = unlock_type == "material" and bool(clean_text(row.get("title_id")) or clean_text(row.get("title_name")))
                upgrade_targets = [clean_text(row.get(col)) for col in UPGRADE_COLUMNS if clean_text(row.get(col))]
                badge5 = any(str(target).lower().endswith("_badge_5") for target in upgrade_targets)

                display_name = codex_display or with_type_suffix(item_name, display_category)
                add_item(items, display_name, codex=codex, titleMaterial=title_material, badge5Material=badge5)
                if codex and codex_display and codex_display not in codex_items:
                    codex_items.append(codex_display)
                if badge5 and item_name not in badge_materials:
                    badge_materials.append(item_name)

            title_id = clean_text(row.get("title_id"))
            title_name = clean_text(row.get("title_name"))
            if title_id or title_name:
                stable_title_id = title_id or f"{dungeon_id}_title_{len(titles_by_id) + 1}"
                unlock_type = normalize_unlock_type(row.get("title_unlock_type"))
                title = titles_by_id.get(stable_title_id)
                if title is not None and title_name and title.get("title") != title_name:
                    fallback_id = f"{stable_title_id}_{slug(title_name)}"
                    print(
                        f"WARNING: title_id {stable_title_id!r} is used for both {title.get('title')!r} and {title_name!r}; "
                        f"using temporary generated id {fallback_id!r}. Fix title_id in {DUNGEON_DROP_SHEET_NAME}."
                    )
                    stable_title_id = fallback_id
                    title = titles_by_id.get(stable_title_id)
                if title is None:
                    amount_required = clean_number(row.get("title_amount_mats_required"))
                    reputation_required = clean_text(row.get("title_reputation_required"))
                    if unlock_type == "reputation" and amount_required is None and reputation_required:
                        amount_required = f"{humanize_identifier(reputation_required)} reputation"
                    title = {
                        "id": stable_title_id,
                        "title": title_name or stable_title_id,
                        "dungeon": dungeon_name,
                        "dungeonId": dungeon_id,
                        "dungeonLevel": raw_level or None,
                        "amountRequired": amount_required,
                        "elyRequired": clean_number(row.get("title_ely_required")),
                        "materials": [],
                        "titleSet": clean_text(row.get("title_set")),
                        "coupon": clean_text(row.get("title_coupon")),
                        "unlockType": unlock_type,
                        "reputationRequired": reputation_required,
                    }
                    titles_by_id[stable_title_id] = title
                else:
                    # Fill optional values from another material row if the first row was blank.
                    if not title.get("title") and title_name:
                        title["title"] = title_name
                    if title.get("amountRequired") is None:
                        title["amountRequired"] = clean_number(row.get("title_amount_mats_required"))
                    if title.get("elyRequired") is None:
                        title["elyRequired"] = clean_number(row.get("title_ely_required"))
                    if not title.get("coupon"):
                        title["coupon"] = clean_text(row.get("title_coupon"))
                    if not title.get("titleSet"):
                        title["titleSet"] = clean_text(row.get("title_set"))

                if unlock_type == "material" and item_name:
                    title_material_name = with_type_suffix(
                        item_name, clean_text(row.get("codex_category")) or category_from_item_type(item_type)
                    )
                    if title_material_name not in title["materials"]:
                        title["materials"].append(title_material_name)

        # Preserve existing special metadata that is independent of the Google Sheet layout.
        legend_questing_by_dungeon = {
            "Rivera City Hall": {"Odd Magical Ring", "Odd Magical Bracelet"},
            "Big Tube": {"Bollywood Treasure Box"},
        }
        awakening_questing_items = {"Black Rose Ornament", "Kyrie's Fang", "Windy Seed Jewel Fragment"}
        for item in items:
            bare = re.sub(r"\s*\((?:ETC|Event|Equipment|Other|Consume)\)\s*$", "", item.get("name", ""), flags=re.I).strip()
            if bare in legend_questing_by_dungeon.get(dungeon_name, set()):
                item["legendQuesting"] = True
            if bare == "Windy Seed Jewel Frrament":
                item["name"] = "Windy Seed Jewel Fragment (Event)"
                bare = "Windy Seed Jewel Fragment"
            if bare in awakening_questing_items:
                item["awakeningQuesting"] = True

        dungeons.append({
            "id": dungeon_id,
            "dungeonId": dungeon_id,
            "level": raw_level,
            "numericLevel": numeric_level,
            "levelType": level_type,
            "levelCategory": category,
            "name": dungeon_name,
            "entriesPerDay": entries,
            "entryScope": "account" if account_limited else None,
            "bossName": clean_text(meta.get("boss_name")),
            "miniBosses": [
                value for value in (clean_text(meta.get("mini_boss_1")), clean_text(meta.get("mini_boss_2"))) if value
            ],
            "drops": drops,
            "badgeMaterials": badge_materials,
            "codexItems": codex_items,
            "loot": [
                {
                    key: value
                    for key, value in {
                        "name": item["name"],
                        "codex": item["codex"],
                        "titleMaterial": item["titleMaterial"],
                        "badge5Material": item["badge5Material"],
                        "awakeningQuesting": item.get("awakeningQuesting"),
                        "legendQuesting": item.get("legendQuesting"),
                    }.items()
                    if value is not None
                }
                for item in items
            ],
        })

    return {
        "lastSyncedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "generatedFrom": "Google Sheets — LT Boss Matts Tracker / dungeon_id + dungeon_drop",
        "schemaVersion": "v7",
        "levelFilters": [
            {"id": "all", "label": "All"},
            {"id": "lv-1-199", "label": "Lv. 1–199"},
            {"id": "lv-200-235", "label": "Lv. 200–235"},
            {"id": "ulv-1-1000", "label": "ULv. 1–1000"},
            {"id": "ulv-1300-3500", "label": "ULv. 1300–3500"},
            {"id": "ulv-3700-8000", "label": "ULv. 3700–8000"},
            {"id": "ulv-8300-9999", "label": "ULv. 8300–9999"},
            {"id": "slv-1-plus", "label": "SLv. 1+"},
        ],
        "dungeons": dungeons,
        "titles": list(titles_by_id.values()),
    }


def main() -> None:
    dungeon_rows = fetch_rows(DUNGEON_ID_SHEET_NAME)
    drop_rows = fetch_rows(DUNGEON_DROP_SHEET_NAME)
    data = build_data(dungeon_rows, drop_rows)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        "window.LT_DATA=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {len(data['dungeons'])} dungeons and {len(data['titles'])} titles to {OUTPUT} "
        f"from {DUNGEON_ID_SHEET_NAME} + {DUNGEON_DROP_SHEET_NAME}."
    )


if __name__ == "__main__":
    main()
