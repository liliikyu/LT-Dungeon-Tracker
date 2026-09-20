(() => {
  const D = window.LT_DATA || { dungeons: [], titles: [] };
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

  const normalize = (value) => String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const THEME_KEY = "lt-theme";
  const COMPLETION_KEY = "lt-item-completion-v1";
  const MONSTER_COMPLETION_KEY = "lt-monster-illustration-completion-v1";
  const TITLE_PROGRESS_KEY = "lt-title-progress-v1";
  const ACHIEVEMENT_COMPLETION_KEY = "lt-dungeon-achievement-completion-v1";
  const CONQUEST_COMPLETION_KEY = "lt-dungeon-conquest-completion-v1";
  const CONQUEST_MODE_KEY = "lt-dungeon-conquest-mode-v1";
  const MI = window.LT_MONSTER_ILLUSTRATIONS || { dungeons: {} };

  // Dungeon-card title names can differ from Title Tracker titlebook recipes.
  const DUNGEON_TITLE_OVERRIDES = {
    "champion's memorial": ["Randine"]
  };
  const UL = window.LT_DUNGEON_UNIQUE_LOOT || { dungeons: {} };
  const ACH = window.LT_DUNGEON_ACHIEVEMENTS || { dungeons: {} };
  const SCENARIO = window.LT_SCENARIO_DATA || { dungeons: {} };


  function loadAchievementCompletion() {
    try {
      const raw = JSON.parse(localStorage.getItem(ACHIEVEMENT_COMPLETION_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  const achievementCompletionState = loadAchievementCompletion();

  function achievementCompletionKey(dungeonName, achievement) {
    return `${normalize(dungeonName)}::${normalize(achievement?.name)}::${normalize(achievement?.objective)}`;
  }

  function saveAchievementCompletion() {
    localStorage.setItem(ACHIEVEMENT_COMPLETION_KEY, JSON.stringify(achievementCompletionState));
  }

  function loadTitleProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(TITLE_PROGRESS_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  function titleRecordsForDungeon(dungeonName) {
    const wanted = normalize(dungeonName);
    return (D.titles || []).filter((title) => normalize(title.dungeon) === wanted);
  }

  function loadCompletion() {
    try {
      const raw = JSON.parse(localStorage.getItem(COMPLETION_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  const completionState = loadCompletion();

  // v13.9.4.50: migrate Frozen World Codex completion keys from old sheet labels.
  (() => {
    const migrations = [
      ["Frozen World", "Lucent Evil Boots (Equipment)", "Lucent Evil Shoes (Equipment)"],
      ["Frozen World", "Luce... (Equipment)", "Lucent Evil Headpiece (Equipment)"]
    ];
    let changed = false;
    migrations.forEach(([dungeon, oldItem, newItem]) => {
      const oldKey = `${normalize(dungeon)}::${normalize(oldItem)}`;
      const newKey = `${normalize(dungeon)}::${normalize(newItem)}`;
      if (completionState[oldKey] === true && completionState[newKey] !== true) {
        completionState[newKey] = true;
        changed = true;
      }
    });
    if (changed) localStorage.setItem(COMPLETION_KEY, JSON.stringify(completionState));
  })();

  function loadMonsterCompletion() {
    try {
      const raw = JSON.parse(localStorage.getItem(MONSTER_COMPLETION_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  const monsterCompletionState = loadMonsterCompletion();

  function monsterEntryName(monster) {
    return typeof monster === "string" ? monster : String(monster?.name || "");
  }

  function monsterEntryLevel(monster) {
    if (!monster || typeof monster === "string") return "";
    return String(monster.level || "").trim();
  }

  function monsterEntryGroup(monster) {
    if (!monster || typeof monster === "string") return "";
    return String(monster.group || "").trim();
  }

  function monsterEntryLabel(monster) {
    const name = monsterEntryName(monster);
    const level = monsterEntryLevel(monster);
    const group = monsterEntryGroup(monster);
    const tag = level || ((group === "Boss Monster" || group === "Mutant Monster") ? group : "");
    return tag ? `${name} (${tag})` : name;
  }

  function monsterCompletionKey(dungeonName, monsterName) {
    return `${normalize(dungeonName)}::${normalize(monsterEntryName(monsterName))}`;
  }

  function saveMonsterCompletion() {
    localStorage.setItem(MONSTER_COMPLETION_KEY, JSON.stringify(monsterCompletionState));
  }

  function monsterIllustrationsFor(dungeonName) {
    const direct = MI.dungeons?.[dungeonName];
    if (Array.isArray(direct)) return direct;
    const wanted = normalize(dungeonName);
    const match = Object.entries(MI.dungeons || {}).find(([name]) => normalize(name) === wanted);
    return match ? match[1] : [];
  }

  function uniqueLootFor(dungeonName) {
    const cleanLoot = (items) => (Array.isArray(items) ? items : []).filter((item) => {
      const value = normalize(item);
      return value && !["none", "n a", "na", "no unique loot", "not applicable"].includes(value);
    });
    const direct = UL.dungeons?.[dungeonName];
    if (Array.isArray(direct)) return cleanLoot(direct);
    const wanted = normalize(dungeonName);
    const match = Object.entries(UL.dungeons || {}).find(([name]) => normalize(name) === wanted);
    return match ? cleanLoot(match[1]) : [];
  }

  function achievementsFor(dungeonName) {
    const direct = ACH.dungeons?.[dungeonName];
    if (Array.isArray(direct)) return direct;
    const wanted = normalize(dungeonName);
    const match = Object.entries(ACH.dungeons || {}).find(([name]) => normalize(name) === wanted);
    return match ? match[1] : [];
  }

  function scenarioFor(dungeonName) {
    const direct = SCENARIO.dungeons?.[dungeonName];
    if (direct && typeof direct === "object") {
      return {
        main: Array.isArray(direct.main) ? direct.main : [],
        sub: Array.isArray(direct.sub) ? direct.sub : []
      };
    }
    const wanted = normalize(dungeonName);
    const match = Object.entries(SCENARIO.dungeons || {}).find(([name]) => normalize(name) === wanted);
    const value = match?.[1] || {};
    return {
      main: Array.isArray(value.main) ? value.main : [],
      sub: Array.isArray(value.sub) ? value.sub : []
    };
  }

  const UNIQUE_LOOT_CATEGORY_LABELS = {
    weapon: "Weapon",
    armor: "Armor",
    accessories: "Accessories",
    badge: "Badge",
    textbook: "Textbook",
    necklace: "Necklace",
    belt: "Belt",
    sticker: "Sticker",
    brooch: "Brooch",
    charm: "Charm",
    totem: "Totem",
    gem: "Gem",
    watch: "Watch",
    relic: "Relic",
    "zodiac-materials": "Zodiac Materials"
  };

  function uniqueLootCategory(itemName) {
    const text = String(itemName || "").toLowerCase();
    if (/bottle of (?:blue|shining|orange) stars|zodiac/.test(text)) return "zodiac-materials";
    if (/badge/.test(text)) return "badge";
    if (/textbook|manual|tome/.test(text)) return "textbook";
    if (/necklace/.test(text)) return "necklace";
    if (/belt/.test(text)) return "belt";
    if (/sticker/.test(text)) return "sticker";
    if (/brooch/.test(text)) return "brooch";
    if (/charm/.test(text)) return "charm";
    if (/totem/.test(text)) return "totem";
    if (/watch/.test(text)) return "watch";
    if (/relic/.test(text)) return "relic";
    if (/gem/.test(text)) return "gem";
    if (/sword|blade|dagger|bow|gun|staff|rod|spear|lance|mace|hammer|axe|orb|wand|weapon|knuckle|guitar|shield/.test(text)) return "weapon";
    if (/helmet|helm|armor|armour|glove|gauntlet|boot|shoe|pants|stockings|coat|robe|jacket|top|bottom|set\b/.test(text)) return "armor";
    if (/ring|earring|glasses|goggles|earmuff|bracelet|accessor|tattoo/.test(text)) return "accessories";
    return "accessories";
  }

  function itemCompletionKey(dungeonName, itemName) {
    return `${normalize(dungeonName)}::${normalize(itemName)}`;
  }

  function saveCompletion() {
    localStorage.setItem(COMPLETION_KEY, JSON.stringify(completionState));
  }

  function loadConquestCompletion() {
    try {
      const raw = JSON.parse(localStorage.getItem(CONQUEST_COMPLETION_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  const conquestCompletionState = loadConquestCompletion();
  let conquestMode = false;
  try { conquestMode = localStorage.getItem(CONQUEST_MODE_KEY) === "1"; } catch {}

  function conquestCompletionKey(dungeonName) {
    return normalize(dungeonName);
  }

  function saveConquestCompletion() {
    localStorage.setItem(CONQUEST_COMPLETION_KEY, JSON.stringify(conquestCompletionState));
  }

  function saveConquestMode() {
    try { localStorage.setItem(CONQUEST_MODE_KEY, conquestMode ? "1" : "0"); } catch {}
  }

  function renderLastSync() {
    const el = $("last-sync");
    if (!el) return;
    const raw = D.lastSyncedAt;
    if (!raw) {
      el.textContent = "Not available";
      el.removeAttribute("datetime");
      return;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      el.textContent = String(raw);
      return;
    }
    el.dateTime = date.toISOString();
    el.textContent = date.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short"
    });
    el.title = `Google Sheet sync completed at ${date.toISOString()}`;
  }
  const expandedState = new Map();

  function preferredTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function savedThemeMode() {
    const saved = localStorage.getItem(THEME_KEY);
    return ["system", "light", "dark"].includes(saved) ? saved : "system";
  }

  function applyTheme(mode) {
    const resolved = mode === "system" ? preferredTheme() : mode;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    const button = $("theme-toggle");
    if (button) {
      const icon = mode === "light" ? "☀" : mode === "dark" ? "☾" : "◐";
      const label = mode.charAt(0).toUpperCase() + mode.slice(1);
      button.textContent = icon;
      button.title = `Theme: ${label}`;
      button.setAttribute("aria-label", `Theme: ${label}. Click to switch theme.`);
      button.dataset.mode = mode;
    }
  }

  function cycleTheme() {
    const current = savedThemeMode();
    const next = current === "system" ? "light" : current === "light" ? "dark" : "system";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  function parseLevel(raw) {
    const text = String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
    let match;
    if ((match = text.match(/^SL(?:V)?\.?([0-9]+)/))) return { type: "slv", value: Number(match[1]) };
    if ((match = text.match(/^UL(?:V)?\.?([0-9]+)/))) return { type: "ulv", value: Number(match[1]) };
    if ((match = text.match(/^LV\.?([0-9]+)/))) return { type: "lv", value: Number(match[1]) };
    if ((match = text.match(/^([0-9]+)/))) return { type: "lv", value: Number(match[1]) };
    return { type: "other", value: 0 };
  }

  function categoryFor(raw) {
    const { type, value } = parseLevel(raw);
    if (type === "lv" && value >= 1 && value <= 235) return "lv-1-235";
    if (type === "ulv" && value >= 1 && value <= 9999) return "ulv-1-9999";
    if (type === "slv") return "slv-1-plus";
    return "other";
  }

  function displayLevel(raw) {
    const { type, value } = parseLevel(raw);
    if (type === "ulv") return `ULv. ${value}`;
    if (type === "slv") return `SLv. ${value}`;
    if (type === "lv") return `Lv. ${value}`;
    return String(raw || "—");
  }

  function addOrMergeItem(items, name, flags = {}) {
    if (!name) return;
    const key = normalize(name.replace(/\s*\(event\)\s*$/i, ""));
    let item = items.find((entry) => normalize(entry.name.replace(/\s*\(event\)\s*$/i, "")) === key);
    if (!item) {
      item = { name, codex: false, titleMaterial: false, badge5Material: false, awakeningQuesting: false, legendQuesting: false };
      items.push(item);
    }
    item.codex = item.codex || Boolean(flags.codex);
    item.titleMaterial = item.titleMaterial || Boolean(flags.titleMaterial);
    item.badge5Material = item.badge5Material || Boolean(flags.badge5Material);
    item.awakeningQuesting = item.awakeningQuesting || Boolean(flags.awakeningQuesting);
    item.legendQuesting = item.legendQuesting || Boolean(flags.legendQuesting);
  }

  function buildDungeonList() {
    const map = new Map();

    for (const dungeon of D.dungeons || []) {
      const key = normalize(dungeon.name);
      const entry = {
        ...dungeon,
        name: dungeon.name,
        level: dungeon.level,
        items: [],
        titleNames: []
      };
      for (const item of dungeon.loot || []) addOrMergeItem(entry.items, item.name, item);
      for (const item of dungeon.codexItems || []) addOrMergeItem(entry.items, item, { codex: true });
      for (const item of dungeon.badgeMaterials || []) addOrMergeItem(entry.items, item, { badge5Material: true });
      map.set(key, entry);
    }

    for (const title of D.titles || []) {
      if (!title.dungeon) continue;
      const key = normalize(title.dungeon);
      let entry = map.get(key);
      if (!entry) {
        entry = {
          name: title.dungeon,
          level: title.dungeonLevel || title.level || "",
          entriesPerDay: null,
          badgeMaterials: [],
          codexItems: [],
          items: [],
          titleNames: []
        };
        map.set(key, entry);
      }
      if (!entry.level && title.dungeonLevel) entry.level = title.dungeonLevel;
      if (title.title && !entry.titleNames.includes(title.title)) entry.titleNames.push(title.title);
      for (const material of title.materials || []) {
        if (/^\s*[\d,.]+\s+ely\s*$/i.test(material)) continue;
        addOrMergeItem(entry.items, material, { titleMaterial: true });
      }
    }

    return [...map.values()].sort((a, b) => {
      const pa = parseLevel(a.level), pb = parseLevel(b.level);
      const order = { lv: 0, ulv: 1, slv: 2, other: 3 };
      return (order[pa.type] - order[pb.type]) || (pa.value - pb.value) || a.name.localeCompare(b.name);
    });
  }

  const dungeons = buildDungeonList();
  const checkboxes = [...document.querySelectorAll('#range-filters input[type="checkbox"]')];
  const allBox = checkboxes.find((box) => box.value === "all");
  const rangeBoxes = checkboxes.filter((box) => box.value !== "all");
  const lootFilterToggle = $("loot-filter-toggle");
  const lootFilterPopover = $("loot-filter-popover");
  const lootFilterLabel = $("loot-filter-label");
  const lootFilterClear = $("loot-filter-clear");
  const lootCategoryBoxes = [...document.querySelectorAll('#loot-filter-popover input[type="checkbox"]')];

  function selectedLootCategories() {
    return new Set(lootCategoryBoxes.filter((box) => box.checked).map((box) => box.value));
  }

  function updateLootFilterLabel() {
    if (!lootFilterLabel) return;
    const selected = [...selectedLootCategories()];
    if (!selected.length) lootFilterLabel.textContent = "Unique Loot";
    else if (selected.length === 1) lootFilterLabel.textContent = `Unique Loot: ${UNIQUE_LOOT_CATEGORY_LABELS[selected[0]] || selected[0]}`;
    else lootFilterLabel.textContent = `Unique Loot: ${UNIQUE_LOOT_CATEGORY_LABELS[selected[0]] || selected[0]} + ${selected.length - 1}`;
    lootFilterToggle?.classList.toggle("active", selected.length > 0);
  }

  function setLootPopoverOpen(open) {
    if (!lootFilterPopover || !lootFilterToggle) return;
    lootFilterPopover.classList.toggle("hidden", !open);
    lootFilterToggle.setAttribute("aria-expanded", String(open));
  }

  function selectedRanges() {
    if (allBox.checked) return new Set(["all"]);
    return new Set(rangeBoxes.filter((box) => box.checked).map((box) => box.value));
  }

  function dungeonOverallState(dungeon) {
    const illustrations = monsterIllustrationsFor(dungeon.name);
    const titles = titleRecordsForDungeon(dungeon.name);
    const titleProgressState = loadTitleProgress();
    const achievements = achievementsFor(dungeon.name);
    const monsterDone = illustrations.filter((monster) => monsterCompletionState[monsterCompletionKey(dungeon.name, monster)] === true).length;
    const titleDone = titles.filter((title) => titleProgressState?.[title.id]?.complete === true).length;
    const achievementDone = achievements.filter((achievement) => achievementCompletionState[achievementCompletionKey(dungeon.name, achievement)] === true).length;
    const conquestTotal = conquestMode ? 1 : 0;
    const conquestDone = conquestMode && conquestCompletionState[conquestCompletionKey(dungeon.name)] === true ? 1 : 0;
    const total = illustrations.length + titles.length + achievements.length + conquestTotal;
    const done = monsterDone + titleDone + achievementDone + conquestDone;
    return { total, done, complete: total === 0 || done === total };
  }

  function itemType(item) {
    const name = String(item?.name || "");
    if (/\(Equipment\)\s*$/i.test(name)) return "equipment";
    if (/\(Event\)\s*$/i.test(name)) return "event";
    if (/\(ETC\)\s*$/i.test(name)) return "etc";
    return "other";
  }

  function cleanItemName(name) {
    return String(name || "").replace(/\s*\((?:Equipment|Event|ETC)\)\s*$/i, "").trim();
  }

  function isPlaceholderItem(item) {
    return normalize(cleanItemName(item?.name)) === "not yet";
  }

  function isTrackable(item) {
    return Boolean(item?.codex) && !isPlaceholderItem(item);
  }

  function updateProgressSummary() {
    // Item Codex completion is intentionally not summarized or counted here.
    let monsterTotal = 0;
    let monsterDone = 0;
    for (const dungeon of dungeons) {
      const monsters = monsterIllustrationsFor(dungeon.name);
      monsterTotal += monsters.length;
      monsterDone += monsters.filter((monster) => monsterCompletionState[monsterCompletionKey(dungeon.name, monster)] === true).length;
    }
    const monsterLeft = Math.max(0, monsterTotal - monsterDone);
    const monsterTotalEl = $("monster-progress-total");
    if (monsterTotalEl) monsterTotalEl.textContent = monsterTotal ? `${monsterDone}/${monsterTotal} complete · ${monsterLeft} left` : "No illustrations listed";
  }

  function updateExpandAllButton() {
    const button = $("expand-all");
    const cards = [...document.querySelectorAll("#dungeon-grid .dungeon-card.expandable")];
    const allExpanded = cards.length > 0 && cards.every((card) => card.classList.contains("expanded"));
    button.textContent = allExpanded ? "Close All" : "Expand All";
    button.setAttribute("aria-label", allExpanded ? "Close all dungeon details" : "Expand all dungeon details");
    button.title = allExpanded ? "Return all dungeons to summary view" : "Show full lists for all visible dungeons";
  }

  function render() {
    const query = normalize($("search").value);
    const ranges = selectedRanges();
    const selectedLoot = selectedLootCategories();
    const completionStatus = $("completion-status")?.value || "all";
    const visible = dungeons.filter((dungeon) => {
      const category = categoryFor(dungeon.level);
      if (!ranges.has("all") && !ranges.has(category)) return false;

      if (completionStatus !== "all") {
        const overall = dungeonOverallState(dungeon);
        if (completionStatus === "complete" && !overall.complete) return false;
        if (completionStatus === "incomplete" && overall.complete) return false;
      }

      const dungeonUniqueLoot = uniqueLootFor(dungeon.name);
      if (selectedLoot.size > 0) {
        if (!dungeonUniqueLoot.length) return false;
        const categories = new Set(dungeonUniqueLoot.map(uniqueLootCategory));
        if (![...selectedLoot].some((lootCategory) => categories.has(lootCategory))) return false;
      }

      if (!query) return true;
      const haystack = normalize([
        dungeon.name,
        displayLevel(dungeon.level),
        ...(dungeon.items || []).filter((item) => !(conquestMode && item.codex && !item.titleMaterial && !item.badge5Material && !item.awakeningQuesting && !item.legendQuesting)).map((item) => item.name),
        ...monsterIllustrationsFor(dungeon.name).map(monsterEntryLabel),
        ...dungeonUniqueLoot,
        ...(dungeon.titleNames || [])
      ].join(" "));
      return haystack.includes(query);
    });

    $("dungeon-grid").innerHTML = visible.map((dungeon) => {
      const itemPriority = (item) => {
        if (item.codex && item.titleMaterial) return 0;
        if (item.codex) return 1;
        if (item.titleMaterial) return 2;
        if (item.badge5Material) return 3;
        return 4;
      };

      const grouped = { equipment: [], event: [], etc: [], other: [] };
      const visibleItems = (dungeon.items || []).filter((item) => !(conquestMode && item.codex && !item.titleMaterial && !item.badge5Material && !item.awakeningQuesting && !item.legendQuesting));
      for (const item of visibleItems) grouped[itemType(item)].push(item);
      for (const group of Object.values(grouped)) {
        group.sort((a, b) => itemPriority(a) - itemPriority(b) || cleanItemName(a.name).localeCompare(cleanItemName(b.name)));
      }

      const renderFlags = (item) => [
        item.codex && !conquestMode ? '<span class="flag codex" title="Can be registered in Codex">Codex</span>' : "",
        item.titleMaterial ? '<span class="flag title" title="Used for a title">Title</span>' : "",
        item.badge5Material ? '<span class="flag badge5" title="Material used for Badge 5">Badge 5</span>' : "",
        item.awakeningQuesting ? '<span class="flag questing-tag awakening-questing" title="Awakening Questing">AQ</span>' : "",
        item.legendQuesting ? '<span class="flag questing-tag legend-questing" title="Legend Questing">LQ</span>' : ""
      ].join("");

      const renderGroup = (key, label) => {
        const items = grouped[key];
        const rows = items.length ? items.map((item) => {
          const flags = renderFlags(item);
          const trackable = isTrackable(item);
          const completionKey = itemCompletionKey(dungeon.name, item.name);
          const completed = trackable && completionState[completionKey] === true;
          const checkboxHtml = trackable && !conquestMode
            ? `<input class="item-check" type="checkbox" ${completed ? "checked" : ""} aria-label="Mark ${esc(cleanItemName(item.name))} as completed">`
            : `<span class="item-check-spacer" aria-hidden="true"></span>`;
          return `<li class="item-row${completed ? " completed" : ""}${trackable && !conquestMode ? " trackable" : ""}" ${trackable ? `data-completion-key="${esc(completionKey)}"` : ""}>
            <span class="item-main">
              ${checkboxHtml}
              <span class="item-name">${esc(cleanItemName(item.name))}</span>
            </span>
            <span class="item-flags">${flags}</span>
          </li>`;
        }).join("") : '<li class="column-empty">—</li>';
        return `<section class="item-column item-column-${key}">
          <div class="item-column-head">${esc(label)}</div>
          <ul class="item-list">${rows}</ul>
        </section>`;
      };

      const illustrations = monsterIllustrationsFor(dungeon.name);
      const monsterDone = illustrations.filter((monster) => monsterCompletionState[monsterCompletionKey(dungeon.name, monster)] === true).length;
      const monsterRows = illustrations.map((monster) => {
        const name = monsterEntryName(monster);
        const label = monsterEntryLabel(monster);
        const key = monsterCompletionKey(dungeon.name, monster);
        const checked = monsterCompletionState[key] === true;
        return `<label class="monster-illustration-row${checked ? " completed" : ""}" data-monster-key="${esc(key)}">
          <input class="monster-check" type="checkbox" ${checked ? "checked" : ""} aria-label="Mark ${esc(name)} illustration as completed">
          <span>${esc(label)}</span>
        </label>`;
      }).join("");
      const monsterSectionHtml = illustrations.length ? `<section class="monster-illustration-section">
        <div class="monster-illustration-head">
          <strong>Monster Illustration</strong>
          <span class="monster-head-actions">
            <label class="monster-select-all" title="Select or clear all Monster Illustrations for ${esc(dungeon.name)}">
              <input class="monster-select-all-check" type="checkbox" ${monsterDone === illustrations.length ? "checked" : ""} aria-label="Select all Monster Illustrations for ${esc(dungeon.name)}">
              <span>All</span>
            </label>
            <span class="monster-progress">Done ${monsterDone}/${illustrations.length}</span>
          </span>
        </div>
        <div class="monster-illustration-list">${monsterRows}</div>
      </section>` : "";

      const uniqueLoot = uniqueLootFor(dungeon.name);
      const uniqueLootSectionHtml = uniqueLoot.length ? `<section class="unique-loot-section">
        <div class="unique-loot-head"><strong>Unique Loot</strong><span class="unique-loot-items">${uniqueLoot.map(esc).join(" · ")}</span></div>
      </section>` : "";

      const achievements = achievementsFor(dungeon.name);
      const achievementDone = achievements.filter((achievement) => achievementCompletionState[achievementCompletionKey(dungeon.name, achievement)] === true).length;
      const achievementSectionHtml = achievements.length ? `<section class="dungeon-achievement-section">
        <div class="dungeon-achievement-head">
          <div class="dungeon-achievement-title"><span class="dungeon-achievement-heading">Achievement</span><span class="achievement-count">${achievements.length}</span></div>
          <span class="dungeon-achievement-progress">Done ${achievementDone}/${achievements.length}</span>
        </div>
        <div class="dungeon-achievement-list">${achievements.map((achievement) => {
          const key = achievementCompletionKey(dungeon.name, achievement);
          const checked = achievementCompletionState[key] === true;
          return `<label class="dungeon-achievement-row${checked ? " completed" : ""}" data-achievement-key="${esc(key)}">
            <input class="achievement-check" type="checkbox" ${checked ? "checked" : ""} aria-label="Mark ${esc(achievement.name)} achievement as completed">
            <span class="dungeon-achievement-copy">
              <span class="dungeon-achievement-name">${esc(achievement.name)}${achievement.category ? ` <span class="dungeon-achievement-via">(via ${esc(achievement.category)})</span>` : ""}</span>
              <span class="dungeon-achievement-objective">${esc(achievement.objective)}</span>
            </span>
            ${achievement.points ? `<span class="dungeon-achievement-points">${esc(achievement.points)} pts</span>` : ""}
          </label>`;
        }).join("")}</div>
      </section>` : "";

      const hasAnyItems = (dungeon.items || []).length > 0;
      const columnsHtml = hasAnyItems ? `
        <div class="item-columns">
          ${renderGroup("equipment", "Equipment")}
          ${renderGroup("event", "Event")}
          ${renderGroup("etc", "ETC")}
          ${renderGroup("other", "Other")}
        </div>` : "";

      const meta = dungeon.entriesPerDay ? `${esc(dungeon.entriesPerDay)} ${Number(dungeon.entriesPerDay) === 1 ? "entry" : "entries"}/day${dungeon.entryScope === "account" ? "/account" : ""}` : "";
      const titleOverride = DUNGEON_TITLE_OVERRIDES[normalize(dungeon.name)];
      const displayedTitles = titleOverride || dungeon.titleNames || [];
      const titleText = displayedTitles.length ? displayedTitles.map(esc).join(" · ") : "";
      const titleCount = displayedTitles.length;
      const dungeonTitleRecords = titleRecordsForDungeon(dungeon.name);
      const titleBadgeProgressState = loadTitleProgress();
      const titleDoneCount = dungeonTitleRecords.filter((title) => titleBadgeProgressState?.[title.id]?.complete === true).length;
      const titleProgressBadge = dungeonTitleRecords.length
        ? `<span class="dungeon-title-status ${titleDoneCount === dungeonTitleRecords.length ? "complete" : "incomplete"}" title="Title Tracker completion">${titleDoneCount === dungeonTitleRecords.length ? "✓ " : ""}${titleDoneCount}/${dungeonTitleRecords.length} complete</span>`
        : "";
      const titleNote = `<div class="title-summary-row"><span><strong class="title-summary-label" title="Track title completion in the Title Tracker">Title</strong> ${titleCount}</span><span class="title-summary-names">${titleText}</span>${titleProgressBadge}</div>`;

      const scenario = scenarioFor(dungeon.name);
      const scenarioList = (items) => items.length
        ? items.map((chapter) => `<span class="scenario-chip">${esc(chapter)}</span>`).join("")
        : `<span class="scenario-empty">—</span>`;
      const scenarioHtml = `<section class="dungeon-scenario-section">
        <div class="dungeon-scenario-column">
          <strong class="dungeon-scenario-heading">Main Scenario</strong>
          <div class="dungeon-scenario-values">${scenarioList(scenario.main)}</div>
        </div>
        <div class="dungeon-scenario-column">
          <strong class="dungeon-scenario-heading">Sub Scenario</strong>
          <div class="dungeon-scenario-values">${scenarioList(scenario.sub)}</div>
        </div>
      </section>`;

      const dungeonKey = normalize(dungeon.name);
      const hasDrops = hasAnyItems;
      const isExpandable = conquestMode || hasDrops || illustrations.length > 0 || uniqueLoot.length > 0 || achievements.length > 0 || Boolean(titleText);
      const isExpanded = isExpandable && (expandedState.get(dungeonKey) === true);
      const trackableItems = (dungeon.items || []).filter(isTrackable);
      const completedCount = trackableItems.filter((item) => completionState[itemCompletionKey(dungeon.name, item.name)] === true).length;
      const titleRecords = titleRecordsForDungeon(dungeon.name);
      const titleProgressState = loadTitleProgress();
      const completedTitles = titleRecords.filter((title) => titleProgressState?.[title.id]?.complete === true).length;
      const conquestComplete = conquestCompletionState[conquestCompletionKey(dungeon.name)] === true;
      const conquestTotal = conquestMode ? 1 : 0;
      const overallTotal = illustrations.length + titleRecords.length + achievements.length + conquestTotal;
      const overallDone = monsterDone + completedTitles + achievementDone + (conquestMode && conquestComplete ? 1 : 0);
      const overallPct = overallTotal ? Math.round((overallDone / overallTotal) * 100) : 100;
      const overallHtml = `<div class="dungeon-overall-progress" data-overall-progress>
        <span><strong>Overall Progress</strong></span>
        <span class="overall-progress-track" aria-hidden="true"><i style="width:${overallPct}%"></i></span>
        <span class="overall-progress-count"><strong>Done</strong> ${overallDone}/${overallTotal}</span>
      </div>`;
      const monsterSummaryHtml = `<div class="monster-summary" aria-hidden="${isExpanded ? "true" : "false"}">
        <span><strong>Monster Illustration</strong> ${illustrations.length}</span>
        <span class="summary-progress"><strong>Done</strong> ${monsterDone}/${illustrations.length}</span>
      </div>`;
      const summaryHtml = `<div class="dungeon-summary" aria-hidden="${isExpanded ? "true" : "false"}">
        <span><strong>Equipment</strong> ${grouped.equipment.length}</span>
        <span><strong>Event</strong> ${grouped.event.length}</span>
        <span><strong>ETC</strong> ${grouped.etc.length}</span>
        <span><strong>Other</strong> ${grouped.other.length}</span>
      </div>`;

      const codexCount = conquestMode ? 0 : (dungeon.items || []).filter((item) => item.codex && !isPlaceholderItem(item)).length;
      const codexSubmeta = conquestMode ? "" : ` · ${codexCount} ${codexCount === 1 ? "codex" : "codex"}`;

      const headerHtml = isExpandable ? `<button class="dungeon-toggle" type="button" aria-expanded="${isExpanded ? "true" : "false"}" title="${isExpanded ? "Return to summary" : "Show full list"} ${esc(dungeon.name)}">
        <div class="dungeon-title-wrap">
          <div class="dungeon-name-row">
            <div class="dungeon-name">${esc(dungeon.name)}</div>
            ${meta ? `<span class="dungeon-meta-inline">${meta}</span>` : ""}
          </div>
          <div class="dungeon-card-submeta">${illustrations.length} ${illustrations.length > 1 ? "illustrations" : "illustration"} · ${achievements.length} ${achievements.length > 1 ? "achievements" : "achievement"} · ${titleCount} ${titleCount > 1 ? "titles" : "title"}${codexSubmeta}</div>
        </div>
        <span class="dungeon-head-right">
          <span class="level-badge">${esc(displayLevel(dungeon.level))}</span>
          <span class="collapse-chevron" aria-hidden="true">▼</span>
        </span>
      </button>` : `<div class="dungeon-static-head">
        <div class="dungeon-title-wrap">
          <div class="dungeon-name-row">
            <div class="dungeon-name">${esc(dungeon.name)}</div>
            ${meta ? `<span class="dungeon-meta-inline">${meta}</span>` : ""}
          </div>
          <div class="dungeon-card-submeta">${illustrations.length} ${illustrations.length > 1 ? "illustrations" : "illustration"} · ${achievements.length} ${achievements.length > 1 ? "achievements" : "achievement"} · ${titleCount} ${titleCount > 1 ? "titles" : "title"}${codexSubmeta}</div>
        </div>
        <span class="level-badge">${esc(displayLevel(dungeon.level))}</span>
      </div>`;

      const conquestSectionHtml = conquestMode ? `<section class="dungeon-conquest-section enabled">
        <div class="dungeon-conquest-head">
          <div><strong>Dungeon Conquest</strong><span class="beta-badge">BETA</span></div>
          <label class="dungeon-conquest-check-row" data-conquest-key="${esc(conquestCompletionKey(dungeon.name))}">
            <input class="dungeon-conquest-check" type="checkbox" ${conquestComplete ? "checked" : ""} aria-label="Mark ${esc(dungeon.name)} Dungeon Conquest as completed">
            <span>Conquest complete</span>
          </label>
        </div>
      </section>` : `<section class="dungeon-conquest-section disabled"><div class="dungeon-conquest-head"><div><strong>Dungeon Conquest</strong><span class="beta-badge">BETA</span></div><span class="conquest-disabled-note">Enable Dungeon Conquest (BETA) above to track this.</span></div></section>`;

      const cardContentHtml = `
        ${overallHtml}
        ${monsterSummaryHtml}
        ${summaryHtml}
        ${isExpandable ? `<div class="dungeon-body">${monsterSectionHtml}${uniqueLootSectionHtml}${achievementSectionHtml}${columnsHtml}${titleNote}${scenarioHtml}${conquestSectionHtml}</div>` : ""}
      `;

      return `<article class="dungeon-card${isExpanded ? " expanded" : ""}${isExpandable ? " expandable" : ""}${hasDrops ? " has-drops" : " no-drops"}${conquestMode ? " conquest-mode" : ""}" data-category="${categoryFor(dungeon.level)}" data-dungeon-key="${esc(dungeonKey)}">
        <header class="dungeon-head">${headerHtml}</header>
        ${cardContentHtml}
      </article>`;
    }).join("");
    $("result-count").textContent = `${visible.length} dungeon${visible.length === 1 ? "" : "s"}`;
    $("empty-state").classList.toggle("hidden", visible.length > 0);
    updateExpandAllButton();
    updateProgressSummary();
  }

  function chooseAll() {
    allBox.checked = true;
    rangeBoxes.forEach((box) => { box.checked = false; });
  }

  allBox.addEventListener("change", () => {
    if (allBox.checked) rangeBoxes.forEach((box) => { box.checked = false; });
    else if (!rangeBoxes.some((box) => box.checked)) allBox.checked = true;
    render();
  });

  rangeBoxes.forEach((box) => box.addEventListener("change", () => {
    if (box.checked) allBox.checked = false;
    if (!rangeBoxes.some((item) => item.checked)) allBox.checked = true;
    render();
  }));

  lootFilterToggle?.addEventListener("click", () => {
    setLootPopoverOpen(lootFilterToggle.getAttribute("aria-expanded") !== "true");
  });

  lootCategoryBoxes.forEach((box) => box.addEventListener("change", () => {
    updateLootFilterLabel();
    render();
  }));

  lootFilterClear?.addEventListener("click", () => {
    lootCategoryBoxes.forEach((box) => { box.checked = false; });
    updateLootFilterLabel();
    render();
  });

  document.addEventListener("click", (event) => {
    if (!lootFilterPopover || lootFilterPopover.classList.contains("hidden")) return;
    if (event.target.closest(".loot-filter-wrap")) return;
    setLootPopoverOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setLootPopoverOpen(false);
  });

  $("search").addEventListener("input", render);
  $("completion-status")?.addEventListener("change", render);
  $("clear-filters").addEventListener("click", () => {
    $("search").value = "";
    if ($("completion-status")) $("completion-status").value = "all";
    chooseAll();
    lootCategoryBoxes.forEach((box) => { box.checked = false; });
    updateLootFilterLabel();
    setLootPopoverOpen(false);
    expandedState.clear();
    render();
  });

  $("expand-all").addEventListener("click", () => {
    const cards = [...document.querySelectorAll("#dungeon-grid .dungeon-card.expandable")];
    const allExpanded = cards.length > 0 && cards.every((card) => card.classList.contains("expanded"));

    if (allExpanded) {
      expandedState.clear();
    } else {
      cards.forEach((card) => expandedState.set(card.dataset.dungeonKey, true));
    }
    render();
  });

  $("dungeon-grid").addEventListener("click", (event) => {
    const toggle = event.target.closest(".dungeon-toggle");
    if (!toggle) return;
    const card = toggle.closest(".dungeon-card");
    const key = card.dataset.dungeonKey;
    const nextExpanded = !card.classList.contains("expanded");
    expandedState.set(key, nextExpanded);
    card.classList.toggle("expanded", nextExpanded);
    toggle.setAttribute("aria-expanded", String(nextExpanded));
    toggle.title = `${nextExpanded ? "Return to summary" : "Show full list"} ${card.querySelector(".dungeon-name")?.textContent || "dungeon"}`;
    updateExpandAllButton();
  });


  function updateDungeonOverall(card, dungeon) {
    if (!card || !dungeon) return;
    const illustrations = monsterIllustrationsFor(dungeon.name);
    const monsterDone = illustrations.filter((monster) => monsterCompletionState[monsterCompletionKey(dungeon.name, monster)] === true).length;
    const titleProgressState = loadTitleProgress();
    const titles = titleRecordsForDungeon(dungeon.name);
    const titleDone = titles.filter((title) => titleProgressState?.[title.id]?.complete === true).length;
    const achievements = achievementsFor(dungeon.name);
    const achievementDone = achievements.filter((achievement) => achievementCompletionState[achievementCompletionKey(dungeon.name, achievement)] === true).length;
    const conquestDone = conquestMode && conquestCompletionState[conquestCompletionKey(dungeon.name)] === true ? 1 : 0;
    const total = illustrations.length + titles.length + achievements.length + (conquestMode ? 1 : 0);
    const done = monsterDone + titleDone + achievementDone + conquestDone;
    const pct = total ? Math.round((done / total) * 100) : 100;
    const row = card.querySelector("[data-overall-progress]");
    if (!row) return;
    const count = row.querySelector(".overall-progress-count");
    const bar = row.querySelector(".overall-progress-track i");
    if (count) count.innerHTML = `<strong>Done</strong> ${done}/${total}`;
    if (bar) bar.style.width = `${pct}%`;
  }

  $("dungeon-grid").addEventListener("change", (event) => {
    const monsterSelectAll = event.target.closest(".monster-select-all-check");
    if (monsterSelectAll) {
      const card = monsterSelectAll.closest(".dungeon-card");
      const dungeonKey = card?.dataset.dungeonKey;
      const dungeon = dungeons.find((entry) => normalize(entry.name) === dungeonKey);
      if (!dungeon) return;
      const illustrations = monsterIllustrationsFor(dungeon.name);
      illustrations.forEach((monster) => {
        const key = monsterCompletionKey(dungeon.name, monster);
        if (monsterSelectAll.checked) monsterCompletionState[key] = true;
        else delete monsterCompletionState[key];
      });
      saveMonsterCompletion();
      render();
      return;
    }

    const monsterCheckbox = event.target.closest(".monster-check");
    if (monsterCheckbox) {
      const row = monsterCheckbox.closest(".monster-illustration-row");
      const key = row?.dataset.monsterKey;
      if (!key) return;
      if (monsterCheckbox.checked) monsterCompletionState[key] = true;
      else delete monsterCompletionState[key];
      saveMonsterCompletion();
      row.classList.toggle("completed", monsterCheckbox.checked);

      const card = monsterCheckbox.closest(".dungeon-card");
      const dungeonKey = card?.dataset.dungeonKey;
      const dungeon = dungeons.find((entry) => normalize(entry.name) === dungeonKey);
      if (dungeon) {
        const monsters = monsterIllustrationsFor(dungeon.name);
        const done = monsters.filter((monster) => monsterCompletionState[monsterCompletionKey(dungeon.name, monster)] === true).length;
        const summary = card.querySelector(".monster-summary-progress");
        const detail = card.querySelector(".monster-progress");
        if (summary) summary.textContent = `Done ${done}/${monsters.length}`;
        if (detail) detail.textContent = `Done ${done}/${monsters.length}`;
        updateDungeonOverall(card, dungeon);
      }
      // Keep illustration progress live while the popup is open.
      updateProgressSummary();
      if (($("completion-status")?.value || "all") !== "all") render();
      return;
    }

    const achievementCheckbox = event.target.closest(".achievement-check");
    if (achievementCheckbox) {
      const row = achievementCheckbox.closest(".dungeon-achievement-row");
      const key = row?.dataset.achievementKey;
      if (!key) return;
      if (achievementCheckbox.checked) achievementCompletionState[key] = true;
      else delete achievementCompletionState[key];
      saveAchievementCompletion();
      row.classList.toggle("completed", achievementCheckbox.checked);

      const card = achievementCheckbox.closest(".dungeon-card");
      const dungeonKey = card?.dataset.dungeonKey;
      const dungeon = dungeons.find((entry) => normalize(entry.name) === dungeonKey);
      if (dungeon) {
        const achievements = achievementsFor(dungeon.name);
        const done = achievements.filter((achievement) => achievementCompletionState[achievementCompletionKey(dungeon.name, achievement)] === true).length;
        const progress = card.querySelector(".dungeon-achievement-progress");
        if (progress) progress.textContent = `Done ${done}/${achievements.length}`;
        updateDungeonOverall(card, dungeon);
      }
      if (($("completion-status")?.value || "all") !== "all") render();
      return;
    }

    const conquestCheckbox = event.target.closest(".dungeon-conquest-check");
    if (conquestCheckbox) {
      const row = conquestCheckbox.closest("[data-conquest-key]");
      const key = row?.dataset.conquestKey;
      if (!key) return;
      if (conquestCheckbox.checked) conquestCompletionState[key] = true;
      else delete conquestCompletionState[key];
      saveConquestCompletion();
      const card = conquestCheckbox.closest(".dungeon-card");
      const dungeonKey = card?.dataset.dungeonKey;
      const dungeon = dungeons.find((entry) => normalize(entry.name) === dungeonKey);
      if (dungeon) updateDungeonOverall(card, dungeon);
      if (($("completion-status")?.value || "all") !== "all") render();
      return;
    }

    const checkbox = event.target.closest(".item-check");
    if (!checkbox || checkbox.disabled) return;
    const row = checkbox.closest(".item-row");
    const key = row?.dataset.completionKey;
    if (!key) return;
    if (checkbox.checked) completionState[key] = true;
    else delete completionState[key];
    saveCompletion();
    row.classList.toggle("completed", checkbox.checked);

    const card = checkbox.closest(".dungeon-card");
    const dungeonKey = card?.dataset.dungeonKey;
    const dungeon = dungeons.find((entry) => normalize(entry.name) === dungeonKey);
    if (dungeon) updateDungeonOverall(card, dungeon);
    if (($("completion-status")?.value || "all") !== "all") render();
  });

  const progressToggle = $("progress-toggle");
  const progressToggleImage = $("progress-toggle-image");
  const progressPanel = $("progress-panel");
  const clearMonsterProgress = $("clear-monster-progress");
  const conquestModeToggle = $("conquest-mode-toggle");

  function syncProgressToggleVisual() {
    if (!progressToggle || !progressPanel) return;
    const isOpen = !progressPanel.classList.contains("hidden");
    progressToggle.hidden = false;
    progressToggle.style.removeProperty("display");
    progressToggle.setAttribute("aria-expanded", String(isOpen));
    progressToggle.setAttribute("aria-label", isOpen ? "Close Dungeon Illustration Progress" : "Open Dungeon Illustration Progress");
    if (progressToggleImage) progressToggleImage.src = isOpen ? progressToggleImage.dataset.openSrc : progressToggleImage.dataset.closedSrc;
  }

  progressToggle?.addEventListener("click", () => {
    const willOpen = progressPanel.classList.contains("hidden");
    progressPanel.classList.toggle("hidden", !willOpen);
    syncProgressToggleVisual();
    if (willOpen) updateProgressSummary();
  });

  if (conquestModeToggle) conquestModeToggle.checked = conquestMode;
  document.body.classList.toggle("conquest-mode-active", conquestMode);
  window.addEventListener("latale:conquest-mode-change", (event) => {
    conquestMode = !!event.detail?.enabled;
    if (conquestModeToggle) conquestModeToggle.checked = conquestMode;
    document.body.classList.toggle("conquest-mode-active", conquestMode);
    render();
  });

  if (clearMonsterProgress) clearMonsterProgress.addEventListener("click", () => {
    if (!confirm("Clear all saved Monster Illustration progress for the Dungeons tab?")) return;
    for (const key of Object.keys(monsterCompletionState)) delete monsterCompletionState[key];
    saveMonsterCompletion();
    render();
    updateProgressSummary();
  });


  window.addEventListener("pageshow", () => {
    syncProgressToggleVisual();
    render();
    updateProgressSummary();
  });
  window.addEventListener("storage", (event) => {
    if ([TITLE_PROGRESS_KEY, CONQUEST_COMPLETION_KEY, CONQUEST_MODE_KEY].includes(event.key)) {
      if (event.key === CONQUEST_MODE_KEY) {
        conquestMode = localStorage.getItem(CONQUEST_MODE_KEY) === "1";
        if (conquestModeToggle) conquestModeToggle.checked = conquestMode;
        document.body.classList.toggle("conquest-mode-active", conquestMode);
      }
      render();
    }
  });
  syncProgressToggleVisual();


  // Welcome / help popup. Show once per browser session, and reopen from the ? button.
  const WELCOME_SESSION_KEY = "lt-welcome-seen-v1";
  const welcomeOverlay = $("welcome-overlay");
  const helpToggle = $("help-toggle");
  const welcomeClose = $("welcome-close");

  function openWelcomePopup() {
    if (!welcomeOverlay) return;
    welcomeOverlay.classList.remove("hidden");
    welcomeOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("welcome-open");
    requestAnimationFrame(() => welcomeClose?.focus());
  }

  function closeWelcomePopup() {
    if (!welcomeOverlay) return;
    welcomeOverlay.classList.add("hidden");
    welcomeOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("welcome-open");
    try { sessionStorage.setItem(WELCOME_SESSION_KEY, "1"); } catch {}
    helpToggle?.focus();
  }

  helpToggle?.addEventListener("click", openWelcomePopup);
  welcomeClose?.addEventListener("click", closeWelcomePopup);
  welcomeOverlay?.addEventListener("click", (event) => {
    if (event.target === welcomeOverlay) closeWelcomePopup();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && welcomeOverlay && !welcomeOverlay.classList.contains("hidden")) closeWelcomePopup();
  });

  let welcomeSeen = false;
  try { welcomeSeen = sessionStorage.getItem(WELCOME_SESSION_KEY) === "1"; } catch {}
  if (!welcomeSeen) openWelcomePopup();

  $("theme-toggle").addEventListener("click", cycleTheme);
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
  if (media) media.addEventListener("change", () => {
    if (savedThemeMode() === "system") applyTheme("system");
  });
  applyTheme(savedThemeMode());
  renderLastSync();
  updateLootFilterLabel();
  render();
})();
