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

Requires Node 18+. Nothing to install.

## Where the data comes from

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

`data/gears.sample.js` is a small hand-written shortlist of classic gears so the
page renders before you sync. It carries no asset IDs — deliberately, so it can
never show a wrong thumbnail for a gear — and the header flags it as sample
data. A real sync replaces it entirely.

## Opening without a server

`index.html` works when opened straight from disk, but browsers block
`fetch()` on `file://`, so it shows the offline sample only. Run `npm start`
for the full catalog.

## Layout

```
app/
  index.html              markup
  assets/styles.css       theming, grid, responsive rules
  assets/app.js           filtering, sorting, rendering, settings
  data/gears.sample.js    offline sample (committed)
  data/gears.json         synced catalog (generated, gitignored)
  tools/fetch-gears.mjs   catalog sync
  server.mjs              static server + sync-on-first-run
```
