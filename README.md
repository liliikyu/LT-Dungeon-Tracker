# LaTale Dungeon Tracker — v13.9.4.68


## v13.9.4.68 — normalized dungeon data sync

- Rebuilt the website data layer around the live Google Sheet tabs `dungeon_id` + `dungeon_drop`.
- `dungeon_id` is the canonical dungeon list and supplies level / entry metadata.
- `dungeon_drop` supplies drop rows, Codex flags, title requirements, and upgrade-target relationships.
- Blank boss fields are valid, so bossless/daily-drop dungeon rows can still sync normally.
- Reserved `dng_###` rows with no dungeon name are ignored until populated.
- `item_upgrade` is intentionally excluded from the website sync for now.
- The GitHub Action continues regenerating only `assets/data.js`; Wiki-derived illustration, unique-loot, achievement, field, and scenario assets remain independent.

### v13.9.4.65
- Removed the Fields toolbar Monster Illustration / Item Codex legend.
- Added Soprano Snowfield to Jiendia so the current unmapped bucket can disappear.

Static GitHub Pages tracker with shared navigation:

**Fields | Dungeons | Titles | Wiki**

All three tracker pages use the same Light / Dark / System theme control and the same `?` Welcome/Help popup. Light mode uses the pink site accent; Dark mode uses blue. Semantic Illustration Book colors stay consistent: Monster Illustrations are pink and Item Codex is blue.

## v13.9.4.65

- Restyled Dungeon Achievement sections to match the approved preview hierarchy.
- Achievement header now shows a trophy icon, count, and Official Wiki shortcut.
- Achievement rows now group name/objective together with a compact points pill.
- Added responsive mobile styling while preserving the current dungeon card/data structure.


## Data sources

- Dungeons and Titles: project Google Sheet (`dungeon_id` + `dungeon_drop`)
- `dungeon_id` is the canonical dungeon master list; `dungeon_drop` supplies item/drop, Codex, title, and upgrade-target relationships.
- Dungeon Monster Illustrations: Official La Tale Wiki
- Fields Monster Illustrations and Item Codex: Official La Tale Wiki

## GitHub Actions

- `Sync Google Sheet`
- `Sync Monster Illustrations`
- `Sync Fields Illustration Data`

After first upload, run **Sync Fields Illustration Data** once (or let its push trigger run) so `assets/field-data.js` is populated from the current wiki. The script preserves the existing snapshot if parsing fails.

Field and Dungeon completion are intentionally stored separately, even when names match.


## Fields regions
The Fields tracker groups map locations into collapsible Jiendia, Freios, Western Freios, and Eastland regions. Unknown wiki locations remain visible under Other / Unmapped.

### v13.9.4.65
- Dungeon Monster Illustration summary returned to the neutral summary-row hierarchy used by Equipment/Title; detailed illustration tracking follows the dynamic theme accent (pink in Light, blue in Dark).
- Titles are grouped in a collapsible **Titles from Dungeons** section.
- Fields Illustration Book popup now mirrors Dungeons with the SHINING Codex disclaimer and Category / Total / Done / Left breakdown.

### v13.9.4.65
- Unified Dungeon and Field completion checkbox colors with the dynamic theme accent (Light pink / Dark blue).
- Monster Illustration headings remain neutral rather than accent-colored.
- Added regional aliases for Behemoth, Storm Watcher Ruins, Underworld Cave, and Snowfield.


### v13.9.4.65
- Added multi-select region filters to Fields: All, Jiendia, Freios, Western Freios, and Eastland.
- Reset restores the All-regions view.


## v13.9.4.65
- Added **Dungeon Conquest (BETA)** mode. When enabled, Codex checkboxes are disabled and each dungeon exposes a Conquest completion checkbox.
- Added Dungeon Conquest Preview page with translated SHINING update notes and official source link.
- Added Dungeon Conquest Preview navigation between Titles and Wiki.

## v13.9.4.65 — Dungeon Unique Loot
- Adds a **Unique Loot** section between Monster Illustration and Item Codex on expanded Dungeon cards.
- Unique Loot is informational only and does not affect Overall Progress.
- `assets/dungeon-unique-loot.js` is synchronized from the Official La Tale Wiki `Dungeons` page.
- `.github/workflows/sync-unique-loot.yml` refreshes the snapshot daily and can also be run manually.

## v13.9.4.65 — Unique Loot filter popover

- Replaces the dense Unique Loot chip row concept with one compact `Unique Loot ▾` control.
- Opens a grouped category popover for Equipment, Special Gear, and Zodiac Materials.
- Supports multi-select OR filtering.
- Dungeons without matching Unique Loot are hidden whenever a category filter is active.
- Reset clears search, level ranges, Unique Loot categories, and expanded-card state.


## v13.9.4.65
- Adds upgrade-related Achievement information below Unique Loot on Dungeon cards.
- Adds daily Achievement sync from the Official La Tale Wiki.
- Fixes the Unique Loot filter popover stacking above dungeon cards on mobile.


## v13.9.4.65
- Reordered expanded Dungeon sections: Unique Loot → Achievement → Item Codex → Monster Illustration → Dungeon Conquest → Title.
- Simplified Achievement presentation: no trophy icon or wiki link; heading, achievement title, and objective use regular font weight.


## v13.9.4.65b — Dungeon page cleanup

- Keeps expanded Dungeon order: Unique Loot → Achievement → Item Codex → Monster Illustration → Dungeon Conquest → Title.
- Simplifies Achievement to neutral rows; removes legacy accent-card styling, trophy/wiki-link CSS, and keeps regular-weight text.
- Ignores placeholder Unique Loot values such as `None` both during sync and at render time.
- Adds `Watch` and `Relic` to the Unique Loot category filter.
- Retains the mobile Unique Loot popover stacking fix.
- `Laititia` remains in the wiki Unique Loot snapshot but is intentionally not synthesized as a Dungeon card because the Dungeon list remains sourced from the project Google Sheet. Add it to `dungeon_id` if it should appear in the tracker.


## V13.9.4.65b
- Dungeon detail order: Monster Illustration → Unique Loot → Achievement → Item Codex → Title → Dungeon Conquest.
- Dungeon header preview meta now reads Illustration → Item Codex → Achievement → Title.
## v13.9.4.65
- Achievement rows now show their Achievement category as secondary text, e.g. `(via Challenge)`.
- Dungeon upgrade achievement sync stores the source category in `dungeon-achievements.js`.

