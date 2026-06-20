/**
 * Prepares the catalog after `transpile --all`:
 *  1. Writes examples/catalog/components.json — registry:ui groups that produced templates.
 *  2. Creates inline-SVG stubs for any lucide icon referenced via {include '<icon>.phtml'},
 *     so every template renders cleanly in real Latte.
 *
 * Run with: bun examples/scripts/prepare-catalog.ts
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchIndex } from '../../src/registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(here, '..', 'components');
const catalogDir = join(here, '..', 'catalog');

const files = readdirSync(componentsDir).filter((f) => f.endsWith('.phtml'));
const present = new Set(files.map((f) => f.replace('.phtml', '')));

// --- 1. icon stubs ----------------------------------------------------------
const ICONS: Record<string, string> = {
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevrons-up-down': '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  circle: '<circle cx="12" cy="12" r="10"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'panel-left': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
};

function svg(paths: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    `stroke-linejoin="round" aria-hidden="true">${paths}</svg>\n`
  );
}

const referenced = new Set<string>();
for (const f of files) {
  const src = readFileSync(join(componentsDir, f), 'utf8');
  for (const m of src.matchAll(/\{include '([^']+)\.phtml'\}/g)) referenced.add(m[1]);
}

let stubs = 0;
for (const name of referenced) {
  if (present.has(name)) continue;
  const paths = ICONS[name] ?? '<circle cx="12" cy="12" r="9"/>';
  writeFileSync(join(componentsDir, `${name}.phtml`), svg(paths), 'utf8');
  present.add(name);
  stubs++;
}

// --- 2. catalog groups ------------------------------------------------------
const index = await fetchIndex();
const uiNames = index
  .filter((i) => i.type === 'registry:ui')
  .map((i) => i.name)
  .sort((a, b) => b.length - a.length); // longest first for prefix matching

function groupOf(file: string): string | undefined {
  const stem = file.replace('.phtml', '');
  return uiNames.find((n) => stem === n || stem.startsWith(`${n}-`));
}

const groups: Record<string, string[]> = {};
for (const f of files) {
  const g = groupOf(f);
  if (!g) continue;
  (groups[g] ??= []).push(f);
}

const manifest = Object.keys(groups)
  .sort()
  .map((name) => ({ name, files: groups[name].sort() }));

if (!existsSync(catalogDir)) {
  throw new Error(`Catalog directory missing: ${catalogDir}`);
}
writeFileSync(join(catalogDir, 'components.json'), JSON.stringify(manifest, null, 2), 'utf8');

console.log(`Icon stubs created: ${stubs}`);
console.log(`Catalog groups: ${manifest.length}`);
