/**
 * Proof-of-concept: transpile components WITHOUT the Alpine layer (clean markup),
 * for the Zag.js adapter. The Zag vanilla runtime (examples/zag/main.ts) hydrates
 * this markup with the real Radix-equivalent state machines.
 *
 *   bun examples/scripts/transpile-zag.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseComponentSource } from '../../src/parser/parseComponent.js';
import { emitComponent } from '../../src/emit/latte.js';

const here = dirname(fileURLToPath(import.meta.url));
const uiDir = join(here, '..', '..', 'reference', 'src', 'components', 'ui');
const outDir = join(here, '..', 'zag-components');
mkdirSync(outDir, { recursive: true });

const files = ['accordion', 'switch'];
let n = 0;
for (const name of files) {
  const src = readFileSync(join(uiDir, `${name}.tsx`), 'utf8');
  for (const comp of parseComponentSource(src)) {
    writeFileSync(join(outDir, `${comp.name}.phtml`), emitComponent(comp), 'utf8');
    n++;
  }
}
console.log(`Transpiled ${n} clean templates (no Alpine) for Zag into zag-components/`);
