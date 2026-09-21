#!/usr/bin/env node
/**
 * Syncs the full Roblox gear catalog into data/gears.json.
 *
 * Roblox's catalog API caps how deep a single query can paginate, so the
 * fetcher runs the same "Gear" category query under several sort orders and
 * merges the results by asset id. Item metadata (price, creator, on-sale
 * state, favourites) comes from the catalog details endpoint in batches.
 *
 * Usage:  node tools/fetch-gears.mjs [--max 5000] [--out data/gears.json]
 * Requires Node 18+ (uses global fetch).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SEARCH_URL = 'https://catalog.roblox.com/v1/search/items';
const DETAILS_URL = 'https://catalog.roblox.com/v1/catalog/items/details';

/** Same query, different orderings — together they reach far more of the category. */
const SORT_PASSES = [
  { label: 'relevance',     params: { sortType: 0 } },
  { label: 'most favorited', params: { sortType: 1 } },
  { label: 'best selling',  params: { sortType: 2 } },
  { label: 'recently updated', params: { sortType: 3 } },
  { label: 'price low→high', params: { sortType: 4 } },
  { label: 'price high→low', params: { sortType: 5 } },
  { label: 'made by Roblox', params: { sortType: 0, creatorTargetId: 1, creatorType: 'User' } }
];

const args = parseArgs(process.argv.slice(2));
const MAX_ITEMS = Number(args.max ?? 6000);
const OUT_FILE = resolve(ROOT, args.out ?? 'data/gears.json');

let csrfToken = null;

// Only self-run when invoked as a script; server.mjs imports syncCatalog().
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`\n\u2716 Sync failed: ${err.message}`);
    console.error('  If this is a network error, check that catalog.roblox.com is reachable from this machine.');
    process.exit(1);
  });
}

async function main() {
  console.log('Syncing Roblox gear catalog…\n');

  const ids = new Set();
  for (const pass of SORT_PASSES) {
    if (ids.size >= MAX_ITEMS) break;
    const before = ids.size;
    try {
      await collectIds(pass, ids);
    } catch (err) {
      console.warn(`  ! pass "${pass.label}" stopped early: ${err.message}`);
    }
    console.log(`  ${pass.label.padEnd(16)} +${ids.size - before} new  (${ids.size} total)`);
  }

  if (!ids.size) throw new Error('the catalog returned no gears');

  console.log(`\nFetching details for ${ids.size} gears…`);
  const items = await fetchDetails([...ids]);
  items.sort((a, b) => a.name.localeCompare(b.name));

  const payload = { source: 'roblox-catalog', fetchedAt: new Date().toISOString(), count: items.length, items };
  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 1));

  const onSale = items.filter((i) => i.onSale).length;
  console.log(`\n✔ Wrote ${items.length} gears to ${OUT_FILE}`);
  console.log(`  ${onSale} purchasable · ${items.length - onSale} off sale or unavailable`);
}

/** Walks every page of one sort order, adding asset ids to `ids`. */
async function collectIds(pass, ids) {
  let cursor = '';
  for (let page = 0; page < 400; page++) {
    const url = new URL(SEARCH_URL);
    url.searchParams.set('category', 'Gear');
    url.searchParams.set('limit', '30');
    if (cursor) url.searchParams.set('cursor', cursor);
    for (const [k, v] of Object.entries(pass.params)) url.searchParams.set(k, String(v));

    const body = await getJson(url);
    for (const entry of body.data ?? []) {
      if (entry?.id != null) ids.add(entry.id);
    }
    cursor = body.nextPageCursor;
    if (!cursor || ids.size >= MAX_ITEMS) return;
    process.stdout.write(`\r  ${pass.label.padEnd(16)} page ${page + 1}… (${ids.size} found)   `);
  }
}

/** Catalog details are batched 100 at a time and need a CSRF token. */
async function fetchDetails(ids) {
  const items = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100).map((id) => ({ itemType: 'Asset', id }));
    const body = await postJson(DETAILS_URL, { items: batch });
    for (const raw of body.data ?? []) items.push(normalize(raw));
    process.stdout.write(`\r  ${Math.min(i + 100, ids.length)}/${ids.length}   `);
    await sleep(120);
  }
  process.stdout.write('\r');
  return items;
}

function normalize(raw) {
  const restrictions = raw.itemRestrictions ?? [];
  const offSale = raw.priceStatus === 'Off Sale' || raw.priceStatus === 'No Resellers';
  return {
    id: raw.id,
    name: raw.name ?? 'Unknown gear',
    description: (raw.description ?? '').trim(),
    creator: raw.creatorName ?? 'Roblox',
    creatorId: raw.creatorTargetId ?? null,
    price: typeof raw.price === 'number' ? raw.price : null,
    lowestPrice: typeof raw.lowestPrice === 'number' ? raw.lowestPrice : null,
    priceStatus: raw.priceStatus ?? null,
    onSale: !offSale && (typeof raw.price === 'number' || typeof raw.lowestPrice === 'number'),
    limited: restrictions.includes('Limited') || restrictions.includes('LimitedUnique'),
    restrictions,
    favoriteCount: raw.favoriteCount ?? 0,
    created: raw.created ?? null
  };
}

async function getJson(url, attempt = 0) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 429) return backoff(() => getJson(url, attempt + 1), attempt);
  if (!res.ok) throw new Error(`GET ${url.pathname} → ${res.status}`);
  return res.json();
}

async function postJson(url, payload, attempt = 0) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) },
    body: JSON.stringify(payload)
  });

  // Roblox hands back a fresh CSRF token on the first rejected POST.
  const freshToken = res.headers.get('x-csrf-token');
  if (res.status === 403 && freshToken && freshToken !== csrfToken) {
    csrfToken = freshToken;
    return postJson(url, payload, attempt);
  }
  if (res.status === 429) return backoff(() => postJson(url, payload, attempt + 1), attempt);
  if (!res.ok) throw new Error(`POST ${new URL(url).pathname} → ${res.status}`);
  return res.json();
}

async function backoff(retry, attempt) {
  if (attempt >= 5) throw new Error('rate limited by Roblox (gave up after 5 retries)');
  const wait = 2000 * 2 ** attempt;
  process.stdout.write(`\r  rate limited, waiting ${wait / 1000}s…   `);
  await sleep(wait);
  return retry();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[++i];
  }
  return out;
}

export { main as syncCatalog };
