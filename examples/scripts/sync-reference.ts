/**
 * Make the React reference use the SAME classic radix shadcn components the
 * transpiler consumes, so the comparison is 1:1. Fetches each component's .tsx
 * from the registry and writes it into reference/src/components/ui, and prints
 * the npm dependencies to install.
 *
 *   bun examples/scripts/sync-reference.ts
 */
import { writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchComponent } from '../../src/registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const uiDir = join(here, '..', '..', 'reference', 'src', 'components', 'ui');

const names = [
  'button', 'badge', 'alert', 'card', 'input', 'textarea', 'accordion', 'tabs',
  'dialog', 'dropdown-menu', 'popover', 'tooltip', 'switch', 'checkbox', 'toggle',
  'progress', 'avatar', 'separator', 'skeleton', 'breadcrumb', 'table', 'label',
];

const deps = new Set<string>(['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge']);
let written = 0;
for (const name of names) {
  const src = await fetchComponent(name);
  for (const d of src.dependencies ?? []) deps.add(d);
  for (const f of src.files) {
    writeFileSync(join(uiDir, basename(f.path)), f.content, 'utf8');
    written++;
  }
}
console.log(`Wrote ${written} component files.`);
console.log('DEPS ' + [...deps].join(' '));
