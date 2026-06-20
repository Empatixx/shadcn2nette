/**
 * Local preview server for the shadcn2nette composition demo.
 *
 * Renders examples/page.phtml (which {embed}s the transpiled components in
 * examples/components) and serves it. Run it with: bun examples/serve.ts
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../src/preview/render.js';

const here = dirname(fileURLToPath(import.meta.url));
const pagePath = join(here, 'page.phtml');

// Templates are referenced from page.phtml as 'components/<name>.phtml',
// resolved against the examples/ directory — matching Latte's FileLoader root.
const loadComponent = (name: string) => readFileSync(join(here, name), 'utf8');

function renderPage(): string {
  return render(readFileSync(pagePath, 'utf8'), {}, loadComponent);
}

const port = Number(process.env.PORT ?? 5173);

// @ts-expect-error Bun global is provided by the bun runtime.
Bun.serve({
  port,
  fetch() {
    return new Response(renderPage(), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
});

console.log(`shadcn2nette demo running at http://localhost:${port}`);
