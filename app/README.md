# Roblox Gear Catalog

A clean, fast browser for the Roblox gear catalog — every gear Roblox lists,
including the hundreds that are no longer purchasable. No build step, no
dependencies: plain HTML, CSS and JavaScript plus a ~150-line Node server.

## Features

- **Search** across name, creator, category, description and asset ID (press `/` to focus).
- **Sort** by name, price, favourites, category, or asset ID (newest/oldest).
- **Filter** by category and by availability: all, purchasable, free, off sale, or limited. Controls that need data the current dataset lacks hide themselves rather than showing blanks.
- **Per-row setting** — Auto (fits the screen) or a fixed 1–12 columns, plus a compact list view.
- **Built for phone and desktop** — touch-sized controls, no horizontal scroll, a bottom sheet for details on mobile and a centred dialog on desktop.
- **Light and dark themes**, following your system preference on first visit.
- Sort, filter, columns, layout and theme are **remembered** between visits.
- Thumbnails load from Roblox; anything that fails to load falls back to a category glyph instead of a broken image.

## On your phone

**With thumbnails — GitHub Pages.** In this repository: *Settings → Pages →
Source: Deploy from a branch →* pick this branch, folder `/ (root)` → Save.
After a minute the catalog is live at
`https://starkseashore-netizen.github.io/Main/app/` — real gear images, on any
device, permanently. The same files work on Netlify, Vercel or any static host,
and `npm run bundle` produces `dist/gear-catalog.html` if you'd rather drop one
self-contained file somewhere.

**Without thumbnails — the published artifact.**
https://claude.ai/artifact/7DfPtp82Afj5bd6GWhHAJJ (private to your Claude
account) carries all 2,317 gears, prices and filters, but its host's content
policy blocks images from other domains, so gears show a category glyph and tap
through to Roblox for the picture. Nothing in the app can change that — it is
the host's rule, not a setting.

**On your own Wi-Fi.** Run `npm start` on a computer and open
`http://<that computer's LAN IP>:4173` from your phone.

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

`data/gears.json` ships with **2,317 gears** taken from the catalog archive
that Roblox publishes on the `gh-pages` branch of
[Roblox/gear](https://github.com/Roblox/gear) — the data behind
[roblox.github.io/gear](https://roblox.github.io/gear/). Each gear carries its
name, description, creator, price, on-sale status, favourite count and the exact
CDN URL of its thumbnail. 1,312 are purchasable, 1,005 are off sale.

That archive is © Roblox under the Roblox Limited Use License, so check the
terms before putting a public copy of this data online.

The app falls back to Roblox's `asset-thumbnail` endpoint for any gear whose
record has no thumbnail URL, and to a category glyph if an image fails to load.

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
  data/gears.json         2,317 gears with prices + thumbnails (committed)
  data/gears.sample.js    tiny fallback when gears.json is missing
  tools/fetch-gears.mjs   live catalog sync (adds prices)
  tools/build-single-file.mjs   bundles everything into dist/
  server.mjs              static server + sync-on-first-run
```
