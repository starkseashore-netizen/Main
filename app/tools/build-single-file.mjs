#!/usr/bin/env node
/**
 * Bundles the catalog into single self-contained HTML files.
 *
 *   dist/gear-catalog.html  — a complete page for any static host; thumbnails
 *                             load from Roblox.
 *   dist/artifact.html      — body-only, for hosts that wrap the page in their
 *                             own skeleton and block external images
 *                             (claude.ai artifacts): category glyphs instead of
 *                             thumbnails, every gear still links to Roblox.
 *
 * Usage: node tools/build-single-file.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFile(resolve(ROOT, p), 'utf8');

const [html, css, js, dataRaw] = await Promise.all([
  read('index.html'), read('assets/styles.css'), read('assets/app.js'), read('data/gears.json')
]);

// Inline data must not terminate the script element that carries it.
const data = dataRaw.replace(/<\//g, '<\\/');
const count = JSON.parse(dataRaw).items.length;

function bundle({ thumbnails, bodyOnly }) {
  let out = html
    .replace('<link rel="stylesheet" href="assets/styles.css">', `<style>\n${css}\n</style>`)
    .replace(
      '<script src="data/gears.sample.js"></script>',
      `<script>window.__GEAR_CONFIG__ = ${JSON.stringify({ thumbnails })};\nwindow.__GEAR_DATA__ = ${data};</script>`
    )
    .replace('<script src="assets/app.js"></script>', `<script>\n${js}\n</script>`);

  if (!thumbnails) {
    out = out.replace(
      '<span class="pill" id="sourcePill" hidden></span>',
      '<span class="pill" id="sourcePill" hidden></span>\n  <span class="pill">Tap a gear to see it on Roblox</span>'
    );
  }

  if (bodyOnly) {
    // The host supplies doctype, head, charset and viewport; keep title + styles.
    out = out
      .replace(/^[\s\S]*?<title>/, '<title>')
      .replace(/<link rel="icon"[^>]*>\s*/g, '')
      .replace(/<\/head>\s*<body>\s*/, '\n')
      .replace(/\s*<\/body>\s*<\/html>\s*$/, '\n');
  }

  return out;
}

await mkdir(resolve(ROOT, 'dist'), { recursive: true });
for (const [file, opts] of [
  ['dist/gear-catalog.html', { thumbnails: true, bodyOnly: false }],
  ['dist/artifact.html', { thumbnails: false, bodyOnly: true }]
]) {
  const body = bundle(opts);
  await writeFile(resolve(ROOT, file), body);
  console.log(`${file.padEnd(24)} ${(body.length / 1024).toFixed(0)} KB · ${count} gears`);
}
