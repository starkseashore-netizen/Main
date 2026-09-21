/* ---------------------------------------------------------------
   Roblox Gear Catalog — application logic
   No dependencies, no build step. Works from a static server or
   straight off the filesystem (falls back to the bundled sample).
   --------------------------------------------------------------- */
(() => {
  'use strict';

  const CONFIG = Object.assign({ thumbnails: true }, window.__GEAR_CONFIG__);
  const PAGE_SIZE = 60;
  const SETTINGS_KEY = 'gearcatalog:settings:v1';
  const THUMB = (id) => `https://www.roblox.com/asset-thumbnail/image?assetId=${id}&width=420&height=420&format=png`;
  const CATALOG_URL = (g) => (g.id ? `https://www.roblox.com/catalog/${g.id}/` : `https://www.roblox.com/catalog?Category=5&Keyword=${encodeURIComponent(g.name)}`);

  /* ---------------- categories ---------------- */

  const GLYPHS = {
    melee: '<path d="M14.5 3.5 20.5 9.5 9 21H3v-6z"/><path d="M12 6 18 12"/>',
    ranged: '<path d="M3 8h11l4 4h3"/><path d="M6 12v4"/><path d="M3 8v4h4"/>',
    explosive: '<circle cx="11" cy="14" r="7"/><path d="M16 9l2-2M18 7l3-1-1 3"/>',
    power: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    navigation: '<path d="M12 2 4 20l8-4 8 4z"/>',
    transport: '<circle cx="6" cy="18" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M4 12h16l-2 4"/>',
    musical: '<circle cx="7" cy="18" r="3"/><circle cx="18" cy="15" r="3"/><path d="M10 18V5l11-2v12"/>',
    social: '<path d="M20.8 5.6a5 5 0 0 0-8.8 3 5 5 0 0 0-8.8-3C1 8 2.5 12 12 20c9.5-8 11-12 8.8-14.4z"/>',
    building: '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M10 21v-6h4v6"/>',
    other: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>'
  };

  const CATEGORIES = [
    { id: 'melee', label: 'Melee' },
    { id: 'ranged', label: 'Ranged' },
    { id: 'explosive', label: 'Explosive' },
    { id: 'power', label: 'Power-up' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'transport', label: 'Transport' },
    { id: 'musical', label: 'Musical' },
    { id: 'building', label: 'Building' },
    { id: 'social', label: 'Social' },
    { id: 'other', label: 'Other' }
  ];

  /* The catalog API does not expose a gear's genre, so it is derived from the
     name (preferred) and then the description. First rule that matches wins,
     which is why navigation and transport are tested before explosives —
     "rocket boots" is not an explosive. */
  const RULES = [
    ['navigation', /jet ?pack|rocket boots|glider|wing|parachute|broom|carpet|teleport|portal|grappl|hookshot|flight|levitat|balloon pack/],
    ['transport', /skateboard|hoverboard|bicycle|\bbike\b|scooter|\bkart\b|\bcar\b|sled|surfboard|segway|unicycle|horse|saddle|wagon/],
    ['explosive', /bomb|grenade|\bmine\b|\btnt\b|dynamite|nuke|nuclear|missile|rocket|explos|detonat|firework|\bc4\b|blast/],
    ['ranged', /\bgun\b|blaster|rifle|pistol|laser|crossbow|\bbow\b|slingshot|shotgun|\bdart|\bray\b|beam|shuriken|throwing|boomerang|\bzap|sniper|revolver|musket|paintball|snowball|flamethrower|cannon|launcher|turret|arrow/],
    ['melee', /sword|blade|dagger|katana|knife|\baxe\b|hammer|mace|\bclub\b|spear|lance|scythe|sabre|saber|machete|cleaver|nunchuck|\bbat\b|staff|wand|whip|darkheart|illumina|venomshank|windforce|ghostwalker|firebrand|slayer|claw|fist|punch/],
    ['power', /potion|coil|cola|soda|drink|donut|cake|pizza|burger|\bfood\b|health|\bheal|elixir|serum|\bpill\b|candy|energy|boost|shield|armou?r|speed|gravity|regenerat|invisib|clone|morph/],
    ['musical', /guitar|drum|trumpet|\bhorn\b|flute|piano|violin|boombox|radio|music|kazoo|saxophone|\bbell\b|whistle|microphone|speaker|banjo|harp|tuba|record player/],
    ['building', /trowel|brick|build|wrench|blueprint|shovel|pickaxe|plank|hard ?hat|drill/],
    ['social', /confetti|balloon|\bflag\b|\bsign\b|camera|phone|\bgift\b|heart|party|cheer|banner|megaphone|emote|dance|plush|pet\b|friend|kiss|hug/]
  ];

  function categorize(gear) {
    if (gear.category) return gear.category;
    for (const field of [gear.name, gear.description]) {
      const text = (field || '').toLowerCase();
      if (!text) continue;
      for (const [id, re] of RULES) if (re.test(text)) return id;
    }
    return 'other';
  }

  /* ---------------- state ---------------- */

  const state = {
    all: [],
    view: [],
    shown: PAGE_SIZE,
    source: 'sample',
    fetchedAt: null,
    query: '',
    category: 'all',
    availability: 'all',
    sort: 'name-asc',
    columns: 'auto',
    layout: 'grid',
    theme: 'dark'
  };

  const el = (id) => document.getElementById(id);
  const dom = {
    grid: el('grid'), empty: el('empty'), more: el('more'), sentinel: el('sentinel'),
    chips: el('categoryChips'), search: el('search'), searchWrap: el('searchWrap'), searchClear: el('searchClear'),
    sort: el('sort'), availability: el('availability'), columns: el('columns'),
    viewGrid: el('viewGrid'), viewList: el('viewList'), theme: el('themeToggle'),
    count: el('resultCount'), sourcePill: el('sourcePill'), reset: el('resetFilters'),
    brandSub: el('brandSub'), sheet: el('sheet'), sheetPanel: el('sheetPanel')
  };

  /* ---------------- settings ---------------- */

  function loadSettings() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { /* ignore */ }
    for (const key of ['sort', 'availability', 'columns', 'layout', 'theme', 'category']) {
      if (saved[key] != null) state[key] = saved[key];
    }
    if (!saved.theme && window.matchMedia?.('(prefers-color-scheme: light)').matches) state.theme = 'light';
  }

  function saveSettings() {
    const { sort, availability, columns, layout, theme, category } = state;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sort, availability, columns, layout, theme, category })); } catch { /* ignore */ }
  }

  /* ---------------- data ---------------- */

  async function loadData() {
    const inlined = window.__GEAR_DATA__;
    if (inlined?.items?.length) {
      return { items: inlined.items, source: inlined.source || 'roblox-catalog', fetchedAt: inlined.fetchedAt || null };
    }
    try {
      const res = await fetch('data/gears.json', { cache: 'no-cache' });
      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body.items) && body.items.length) {
          return { items: body.items, source: body.source || 'roblox-catalog', fetchedAt: body.fetchedAt || null };
        }
      }
    } catch { /* not synced yet, or opened straight from the filesystem */ }
    const sample = window.__GEAR_SAMPLE__ || { items: [] };
    return { items: sample.items, source: 'sample', fetchedAt: null };
  }

  function prepare(items) {
    return items.map((raw, index) => {
      const gear = {
        id: raw.id ?? null,
        name: raw.name || 'Unknown gear',
        description: raw.description || '',
        creator: raw.creator || 'Roblox',
        price: typeof raw.price === 'number' ? raw.price : null,
        priceStatus: raw.priceStatus || null,
        limited: Boolean(raw.limited),
        favoriteCount: raw.favoriteCount || 0,
        created: raw.created || null
      };
      gear.category = categorize({ ...gear, category: raw.category });
      // Some sources (the bundled catalog dump) carry no pricing at all.
      gear.hasPricing = raw.price != null || raw.priceStatus != null || raw.onSale != null;
      gear.free = gear.price === 0;
      gear.onSale = raw.onSale != null ? Boolean(raw.onSale) : gear.price != null;
      gear.key = gear.id != null ? String(gear.id) : `n${index}`;
      gear.haystack = `${gear.name} ${gear.creator} ${gear.category} ${gear.id ?? ''} ${gear.description}`.toLowerCase();
      return gear;
    });
  }

  /* ---------------- filtering & sorting ---------------- */

  const COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

  const SORTS = {
    'name-asc': (a, b) => COLLATOR.compare(a.name, b.name),
    'name-desc': (a, b) => COLLATOR.compare(b.name, a.name),
    'price-asc': (a, b) => nullsLast(a.price, b.price) || COLLATOR.compare(a.name, b.name),
    'price-desc': (a, b) => nullsLast(b.price, a.price, true) || COLLATOR.compare(a.name, b.name),
    'favorites-desc': (a, b) => b.favoriteCount - a.favoriteCount || COLLATOR.compare(a.name, b.name),
    'category-asc': (a, b) => a.category.localeCompare(b.category) || COLLATOR.compare(a.name, b.name),
    'id-desc': (a, b) => (b.id ?? -1) - (a.id ?? -1),
    'id-asc': (a, b) => (a.id ?? Infinity) - (b.id ?? Infinity)
  };

  /** Gears with no price always sort to the bottom, whichever direction is chosen. */
  function nullsLast(x, y, descending = false) {
    if (x == null && y == null) return 0;
    if (x == null) return descending ? -1 : 1;
    if (y == null) return descending ? 1 : -1;
    return descending ? x - y : x - y;
  }

  const MATCHES = {
    all: () => true,
    onsale: (g) => g.onSale,
    free: (g) => g.free,
    offsale: (g) => !g.onSale,
    limited: (g) => g.limited
  };

  function applyFilters() {
    const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    const availability = MATCHES[state.availability] || MATCHES.all;

    state.view = state.all.filter((gear) => {
      if (state.category !== 'all' && gear.category !== state.category) return false;
      if (!availability(gear)) return false;
      return terms.every((term) => gear.haystack.includes(term));
    });

    state.view.sort(SORTS[state.sort] || SORTS['name-asc']);
    state.shown = PAGE_SIZE;
    render();
  }

  /* ---------------- rendering ---------------- */

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function priceMarkup(gear) {
    if (!gear.hasPricing) return '';
    if (gear.free) return '<span class="card__price card__price--free">Free</span>';
    if (gear.price != null && gear.onSale) return `<span class="card__price">R$ ${gear.price.toLocaleString()}</span>`;
    return '<span class="card__price card__price--off">Off sale</span>';
  }

  function thumbMarkup(gear, glyphClass) {
    const showGlyph = !gear.id || !CONFIG.thumbnails;
    const glyph = `<svg class="${glyphClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"${showGlyph ? '' : ' hidden'}>${GLYPHS[gear.category] || GLYPHS.other}</svg>`;
    const img = gear.id && CONFIG.thumbnails ? `<img src="${THUMB(gear.id)}" alt="" loading="lazy" decoding="async">` : '';
    return img + glyph;
  }

  function cardMarkup(gear) {
    return `
      <button class="card" type="button" data-key="${gear.key}" style="--cat: var(--cat-${gear.category})">
        <div class="card__thumb">
          ${thumbMarkup(gear, 'card__glyph')}
          ${gear.limited ? '<span class="badge badge--limited">Limited</span>' : ''}
        </div>
        <div class="card__body">
          <span class="card__name">${escapeHtml(gear.name)}</span>
          <span class="card__meta">
            <span class="card__cat">${gear.category === 'power' ? 'Power-up' : gear.category}</span>
            ${priceMarkup(gear)}
          </span>
        </div>
      </button>`;
  }

  function render() {
    const slice = state.view.slice(0, state.shown);
    dom.grid.innerHTML = slice.map(cardMarkup).join('');
    dom.grid.classList.toggle('grid--list', state.layout === 'list');

    if (state.columns === 'auto' || state.layout === 'list') {
      dom.grid.removeAttribute('data-columns');
      dom.grid.style.removeProperty('--columns');
    } else {
      dom.grid.setAttribute('data-columns', state.columns);
      dom.grid.style.setProperty('--columns', state.columns);
    }

    dom.empty.hidden = state.view.length > 0;
    const remaining = state.view.length - slice.length;
    dom.more.hidden = remaining <= 0;
    dom.more.textContent = remaining > 0 ? `Scroll for ${remaining.toLocaleString()} more…` : '';

    const total = state.all.length.toLocaleString();
    dom.count.innerHTML = state.view.length === state.all.length
      ? `<strong>${total}</strong> gears`
      : `<strong>${state.view.length.toLocaleString()}</strong> of ${total} gears`;

    const filtered = state.query || state.category !== 'all' || state.availability !== 'all';
    dom.reset.hidden = !filtered;
  }

  function renderChips() {
    const counts = new Map();
    for (const gear of state.all) counts.set(gear.category, (counts.get(gear.category) || 0) + 1);

    const chip = (id, label, count, color) => `
      <button class="chip" type="button" data-category="${id}" aria-pressed="${state.category === id}" style="--chip-color: ${color}">
        <span class="chip__dot"></span>${label}<span class="chip__count">${count.toLocaleString()}</span>
      </button>`;

    dom.chips.innerHTML =
      chip('all', 'All', state.all.length, 'var(--accent)') +
      CATEGORIES.filter((c) => counts.get(c.id)).map((c) => chip(c.id, c.label, counts.get(c.id), `var(--cat-${c.id})`)).join('');
  }

  function renderSourcePill() {
    if (state.source === 'sample') {
      dom.sourcePill.hidden = false;
      dom.sourcePill.className = 'pill pill--warn';
      dom.sourcePill.textContent = 'Offline sample — run a sync for the full catalog';
      dom.brandSub.textContent = 'Sample data';
      return;
    }
    dom.sourcePill.hidden = false;
    dom.sourcePill.className = 'pill';
    const when = state.fetchedAt ? new Date(state.fetchedAt) : null;
    dom.sourcePill.textContent = when
      ? `Synced ${when.toLocaleDateString()} ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Catalog dump — sync for live prices';
    dom.brandSub.textContent = `${state.all.length.toLocaleString()} gears`;
  }

  /* ---------------- detail sheet ---------------- */

  function openSheet(gear) {
    const facts = [
      ['Category', gear.category === 'power' ? 'Power-up' : capitalize(gear.category)],
      gear.hasPricing ? ['Price', gear.free ? 'Free' : gear.price != null && gear.onSale ? `R$ ${gear.price.toLocaleString()}` : (gear.priceStatus || 'Off sale')] : null,
      ['Creator', gear.creator],
      gear.id ? ['Asset ID', String(gear.id)] : null,
      gear.favoriteCount ? ['Favourites', gear.favoriteCount.toLocaleString()] : null,
      gear.limited ? ['Restriction', 'Limited'] : null
    ].filter(Boolean);

    dom.sheetPanel.style.setProperty('--cat', `var(--cat-${gear.category})`);
    dom.sheetPanel.innerHTML = `
      <button class="icon-btn sheet__close" type="button" data-close aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
      <div class="sheet__hero">${thumbMarkup(gear, 'sheet__glyph')}</div>
      <h2>${escapeHtml(gear.name)}</h2>
      <div class="sheet__sub">by ${escapeHtml(gear.creator)}</div>
      ${gear.description ? `<p class="sheet__desc">${escapeHtml(gear.description)}</p>` : ''}
      <div class="facts">${facts.map(([k, v]) => `<div class="fact"><div class="fact__k">${k}</div><div class="fact__v">${escapeHtml(v)}</div></div>`).join('')}</div>
      <a class="btn" href="${CATALOG_URL(gear)}" target="_blank" rel="noopener noreferrer">
        ${gear.id ? 'View on Roblox' : 'Search on Roblox'}
      </a>`;
    dom.sheet.showModal();
  }

  /** Price sorting and availability filtering only make sense when prices are known. */
  function applyPricingSupport() {
    if (state.all.some((gear) => gear.hasPricing)) return;

    dom.availability.closest('.field').hidden = true;
    state.availability = 'all';
    for (const option of [...dom.sort.options]) {
      if (option.value.startsWith('price-') || option.value === 'favorites-desc') option.remove();
    }
    if (!dom.sort.querySelector(`option[value="${state.sort}"]`)) state.sort = 'name-asc';
    dom.sort.value = state.sort;
  }

  const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

  /* ---------------- events ---------------- */

  function wireEvents() {
    let searchTimer;
    dom.search.addEventListener('input', () => {
      dom.searchWrap.classList.toggle('is-filled', dom.search.value !== '');
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.query = dom.search.value.trim(); applyFilters(); }, 120);
    });

    dom.searchClear.addEventListener('click', () => {
      dom.search.value = '';
      dom.searchWrap.classList.remove('is-filled');
      state.query = '';
      applyFilters();
      dom.search.focus();
    });

    dom.chips.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-category]');
      if (!chip) return;
      state.category = chip.dataset.category;
      for (const other of dom.chips.children) other.setAttribute('aria-pressed', String(other === chip));
      saveSettings();
      applyFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    for (const [node, key] of [[dom.sort, 'sort'], [dom.availability, 'availability'], [dom.columns, 'columns']]) {
      node.addEventListener('change', () => { state[key] = node.value; saveSettings(); applyFilters(); });
    }

    for (const [node, layout] of [[dom.viewGrid, 'grid'], [dom.viewList, 'list']]) {
      node.addEventListener('click', () => {
        state.layout = layout;
        dom.viewGrid.setAttribute('aria-pressed', String(layout === 'grid'));
        dom.viewList.setAttribute('aria-pressed', String(layout === 'list'));
        saveSettings();
        render();
      });
    }

    dom.theme.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      saveSettings();
    });

    dom.reset.addEventListener('click', () => {
      state.query = '';
      state.category = 'all';
      state.availability = 'all';
      dom.search.value = '';
      dom.searchWrap.classList.remove('is-filled');
      dom.availability.value = 'all';
      renderChips();
      saveSettings();
      applyFilters();
    });

    dom.grid.addEventListener('click', (event) => {
      const card = event.target.closest('.card');
      if (!card) return;
      const gear = state.all.find((g) => g.key === card.dataset.key);
      if (gear) openSheet(gear);
    });

    // A thumbnail that fails to load (deleted asset, offline, blocked) falls
    // back to the category glyph rather than a broken image.
    document.addEventListener('error', (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      const glyph = img.parentElement?.querySelector('svg');
      if (glyph) glyph.hidden = false;
      img.remove();
    }, true);

    dom.sheet.addEventListener('click', (event) => {
      if (event.target === dom.sheet || event.target.closest('[data-close]')) dom.sheet.close();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && document.activeElement !== dom.search) {
        event.preventDefault();
        dom.search.focus();
        dom.search.select();
      }
      if (event.key === 'Escape' && document.activeElement === dom.search) {
        dom.search.blur();
      }
    });

    new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && state.shown < state.view.length) {
        state.shown += PAGE_SIZE;
        render();
      }
    }, { rootMargin: '600px' }).observe(dom.sentinel);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const sun = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
    const moon = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>';
    dom.theme.innerHTML = state.theme === 'dark' ? sun : moon;
  }

  /* ---------------- boot ---------------- */

  async function init() {
    loadSettings();
    applyTheme();

    dom.sort.value = state.sort;
    dom.availability.value = state.availability;
    dom.columns.value = state.columns;
    dom.viewGrid.setAttribute('aria-pressed', String(state.layout === 'grid'));
    dom.viewList.setAttribute('aria-pressed', String(state.layout === 'list'));

    wireEvents();

    const data = await loadData();
    state.all = prepare(data.items);
    state.source = data.source;
    state.fetchedAt = data.fetchedAt;

    // A saved category filter is meaningless if this dataset has none of it.
    if (state.category !== 'all' && !state.all.some((g) => g.category === state.category)) state.category = 'all';

    applyPricingSupport();
    if (!CONFIG.thumbnails) document.body.classList.add('no-thumbs');
    dom.search.placeholder = `Search ${state.all.length.toLocaleString()} gears…` +
      (window.matchMedia?.('(hover: hover)').matches ? '  (press /)' : '');
    renderChips();
    renderSourcePill();
    applyFilters();
  }

  init();
})();
