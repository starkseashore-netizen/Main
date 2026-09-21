# Roblox Gear Catalog

A clean, fast browser for the Roblox gear catalog — every gear Roblox lists,
including the hundreds that are no longer purchasable. No build step, no
dependencies: plain HTML, CSS and JavaScript plus a ~150-line Node server.

## Features

- **Search** across name, creator, category, description and asset ID (press `/` to focus).
- **Sort** by name, price, favourites, category, or asset ID (newest/oldest).
- **Filter** by category and by availability: all, purchasable, free, off sale, or limited.
- **Per-row setting** — Auto (fits the screen) or a fixed 1–12 columns, plus a compact list view.
- **Built for phone and desktop** — touch-sized controls, no horizontal scroll, a bottom sheet for details on mobile and a centred dialog on desktop.
- **Light and dark themes**, following your system preference on first visit.
- Sort, filter, columns, layout and theme are **remembered** between visits.
- Thumbnails load from Roblox; anything that fails to load falls back to a category glyph instead of a broken image.

## On your phone

The published catalog is a link you can open on any device:
**https://claude.ai/artifact/7DfPtp82Afj5bd6GWhHAJJ** (private to your Claude
account). That page bundles all 2,276 gears, but its host blocks external
images, so gears show a category glyph and tap through to Roblox for the
picture.

For thumbnails on your phone, serve the app yourself — `npm run bundle`
produces `dist/gear-catalog.html`, one self-contained file you can drop on any
static host (GitHub Pages, Netlify, a folder on your own server). Or run
`npm start` on a computer and open `http://<that computer's LAN IP>:4173` from
your phone on the same Wi-Fi.

## Quick start

```bash
cd app
npm start          # syncs the catalog on first run, then serves http://localhost:4173
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm start` | Sync (first run only), then serve |
| `npm run serve` | Serve without syncing |
| `npm run sync` | Re-sync `data/gears.json` only |
| `npm run refresh` | Force a re-sync, then serve |
| `npm run bundle` | Build the self-contained files in `dist/` |

Requires Node 18+. Nothing to install.

## Where the data comes from

`data/gears.json` ships with **2,276 gears**, merged from two sources:

- the official [Roblox/Catalog](https://github.com/Roblox/Catalog) repository,
  which stores one `.rbxmx` file per gear named by its real asset ID (1,922 gears);
- a community catalog dump, which supplies human-readable display names for
  2,073 gears — the official files mostly carry internal names like
  `DualDarkhearts`.

Where both have a gear, the display name wins; official-only gears get their
internal name split into words. Neither source carries prices, so the price
sort and the availability filter stay hidden until you sync.

`tools/fetch-gears.mjs` pulls the whole **Gear** category from Roblox's public
catalog API (`catalog.roblox.com`) and writes `data/gears.json`. The browser
can't call that API directly — Roblox doesn't send CORS headers — which is why
the sync runs in Node.

The API caps how deep any single query can paginate, so the fetcher runs the
same category query under seven different orderings (relevance, favourites,
sales, recency, price ascending/descending, and Roblox-created only) and merges
the results by asset ID. That reaches far more of the category than one pass,
and dedupes automatically. Use `--max` to cap the total:

```bash
node tools/fetch-gears.mjs --max 2000
```

Roblox does not expose a gear's genre through that API, so the category shown
in the UI (melee, ranged, explosive, power-up, navigation, transport, musical,
building, social) is derived from each gear's name and description by the rules
at the top of `assets/app.js`. Edit the rules there if you want different
buckets.

### Offline sample

`data/gears.sample.js` is a 31-gear fallback used only if `data/gears.json` is
missing (for example when `index.html` is opened straight off the filesystem,
where browsers block `fetch`). It carries no asset IDs, so it can never show a
wrong thumbnail, and the header flags it as sample data.

## Opening without a server

`index.html` opened straight from disk falls back to the 31-gear sample,
because browsers block `fetch()` on `file://`. Use `dist/gear-catalog.html`
(from `npm run bundle`) instead — it has the data inlined, so it works from a
file, a USB stick or any static host.

## Layout

```
app/
  index.html              markup
  assets/styles.css       theming, grid, responsive rules
  assets/app.js           filtering, sorting, rendering, settings
  data/gears.json         2,276 gears, names + asset IDs (committed)
  data/gears.sample.js    tiny fallback when gears.json is missing
  tools/fetch-gears.mjs   live catalog sync (adds prices)
  tools/build-single-file.mjs   bundles everything into dist/
  server.mjs              static server + sync-on-first-run
```
