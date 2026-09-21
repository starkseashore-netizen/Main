#!/usr/bin/env node
/**
 * Tiny zero-dependency static server for the gear catalog.
 *
 * On first run it syncs the real Roblox catalog into data/gears.json (the
 * browser can't call Roblox's API directly because of CORS, so the sync
 * happens here). Pass --no-sync to skip it, or --refresh to force a re-sync.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncCatalog } from './tools/fetch-gears.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const flags = new Set(process.argv.slice(2));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const dataFile = resolve(ROOT, 'data/gears.json');
const hasData = await stat(dataFile).then(() => true, () => false);

if (flags.has('--refresh') || (!hasData && !flags.has('--no-sync'))) {
  try {
    await syncCatalog();
  } catch (err) {
    console.warn(`\n! Catalog sync failed (${err.message}). Serving the offline sample instead.\n`);
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/refresh' && req.method === 'POST') {
    try {
      await syncCatalog();
      return send(res, 200, JSON.stringify({ ok: true }), TYPES['.json']);
    } catch (err) {
      return send(res, 502, JSON.stringify({ ok: false, error: err.message }), TYPES['.json']);
    }
  }

  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = join(ROOT, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');

  try {
    const body = await readFile(filePath);
    send(res, 200, body, TYPES[extname(filePath)] || 'application/octet-stream');
  } catch {
    send(res, 404, 'Not found');
  }
}).listen(PORT, () => {
  console.log(`\n  Gear catalog → http://localhost:${PORT}\n  (Ctrl+C to stop)\n`);
});

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-cache' });
  res.end(body);
}
