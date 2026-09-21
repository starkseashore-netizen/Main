#!/usr/bin/env node
/**
 * Imports the gear catalog Roblox publishes at roblox.github.io/gear into
 * data/gears.json.
 *
 * The archive lives on the gh-pages branch of github.com/Roblox/gear and
 * carries each gear's name, description, creator, price, on-sale status,
 * favourite count and thumbnail URL.
 *
 * Usage: node tools/import-archive.mjs [--out data/gears.json]
 * Requires Node 18+ (uses global fetch).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_URL = 'https://raw.githubusercontent.com/Roblox/gear/gh-pages/data/catalog.json';

/**
 * Roblox renders a handful of gears — mostly internal build tools and the
 * unnamed ones — to a single blank image. Its URL is shared by every such
 * gear, which is how it was identified; other shared thumbnails are real
 * artwork reused across variants (the ROBLOX Tablet series, trophies), so
 * they are left alone.
 */
const BLANK_RENDER = 'https://tr.rbxcdn.com/180DAY-5d30ea2e004abe68a2db3b0d19fff763/420/420/Gear/Png/noFilter';

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, all) => (a.startsWith('--') ? [[a.slice(2), all[i + 1]]] : []))
);
const OUT_FILE = resolve(ROOT, args.out ?? 'data/gears.json');

const squash = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const named = (value) => /[A-Za-z0-9]/.test(value);

/** Trims leading punctuation ("): Red Grind…"); unnamed gears get an honest label. */
function displayName(raw, id) {
  const name = squash(raw).replace(/^[^\w(\['"]+/, '').trim();
  return named(name) ? name : `Unnamed gear #${id}`;
}

console.log('Importing the Roblox gear archive…');

const res = await fetch(CATALOG_URL, { headers: { accept: 'application/json' } });
if (!res.ok) {
  console.error(`✖ Could not read the archive: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const { items: source = [], generatedAt } = await res.json();
if (!source.length) {
  console.error('✖ The archive returned no gears.');
  process.exit(1);
}

let unnamed = 0;
let placeholders = 0;

const items = source.map((g) => {
  const name = displayName(g.name, g.id);
  if (name.startsWith('Unnamed gear #')) unnamed++;

  const blank = g.thumbnail === BLANK_RENDER;
  if (blank) placeholders++;

  const offSale = g.priceStatus === 'Off Sale' || g.priceStatus === 'No Resellers';
  const description = squash(g.description);

  return {
    id: g.id,
    name,
    description: named(description) ? description : '',
    creator: squash(g.creator) || 'Roblox',
    price: Number.isInteger(g.price) ? g.price : null,
    priceStatus: g.priceStatus ?? null,
    onSale: !offSale && Number.isInteger(g.price),
    favoriteCount: g.favorites || 0,
    created: g.created ?? null,
    // A placeholder render would show as an empty tile, so fall back to the glyph.
    thumbnail: blank ? null : g.thumbnail || null
  };
});

items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

const payload = {
  source: 'roblox-gear-archive',
  fetchedAt: generatedAt ?? null,
  note: 'Imported from the Roblox gear catalog archive (github.com/Roblox/gear, gh-pages branch).',
  count: items.length,
  items
};

await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(payload, null, 0));

const onSale = items.filter((i) => i.onSale).length;
console.log(`✔ ${items.length} gears → ${OUT_FILE}`);
console.log(`  ${onSale} purchasable · ${items.length - onSale} off sale`);
console.log(`  ${unnamed} unnamed in the catalog · ${placeholders} with a blank render`);
