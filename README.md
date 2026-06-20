# shadcn2nette

A CLI tool that converts [shadcn/ui](https://ui.shadcn.com) components (React/TSX)
into **Nette `.phtml` templates with Latte syntax**. It focuses on the **visual layer**:
markup, Tailwind classes, and `cva` variants as template parameters. Client-side
interactivity (Radix / React hooks) is out of scope.

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# specific components from the official shadcn registry
node dist/cli.js transpile button card alert --out ./out

# or without "transpile" (it is the default command)
node dist/cli.js button badge input

# all registry:ui components
node dist/cli.js transpile --all --out ./components

# without building, straight through tsx
npm run transpile -- button card
```

### Options

| Option | Meaning | Default |
|---|---|---|
| `[components...]` | component names | – |
| `--all` | transpile all `registry:ui` components | – |
| `--style <s>` | shadcn style (`new-york` \| `default`) | `new-york` |
| `--out <dir>` | output directory | `./out` |
| `--registry <url>` | registry base URL | `https://ui.shadcn.com/r` |

## What the output looks like

Input (shadcn `Button`) → `button.phtml`:

```latte
{* Generated from shadcn/ui Button by shadcn2nette. Do not edit by hand. *}
{default $variant = 'default'}
{default $size = 'default'}
{default $class = ''}
{var $base = 'inline-flex items-center justify-center ...'}
{var $variantClasses = [
	'default' => 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
	'destructive' => '...',
]}
{var $sizeClasses = [
	'default' => 'h-9 px-4 py-2',
	'sm' => 'h-8 rounded-md px-3 text-xs',
]}
<button class="{$base} {$variantClasses[$variant] ?? ''} {$sizeClasses[$size] ?? ''} {$class}">
	{block content}{/block}
</button>
```

### Using the template in Nette

`cva` variants are parameters; content is passed through the `content` block via `{embed}`:

```latte
{embed 'button.phtml', variant: 'destructive', size: 'sm'}
	{block content}Delete{/block}
{/embed}
```

Components made of several parts (Card → CardHeader, CardTitle, …) are generated as
separate `.phtml` files and composed with nested `{embed}`.

## Live demo

Two demos render the transpiled templates with the **real Nette Latte engine**:

```bash
composer install -d examples
php -S localhost:8080 examples/catalog.php
# open http://localhost:8080
```

- **Catalog** (`/`) — browse every transpiled component from the sidebar; each entry shows a
  live Latte-rendered preview and its `.phtml` source.
- **Showcase** (`/?view=showcase`) — a hand-composed page (buttons, badges, alert, a card built
  from its parts, avatar, separator, skeleton).
- **Interactive** (`/?view=interactive`) — accordion, switch, checkbox and toggle working via the
  injected Alpine.js layer (see below).
- **Compare** (`/?view=compare`) — side-by-side with the real React shadcn (see the comparison
  section below).

Both load Tailwind via the Play CDN and define the shadcn theme tokens.

**Zero-dependency preview (bun):** a built-in renderer for the emitted Latte subset.

```bash
bun run demo            # http://localhost:5173 (showcase page)
```

### Regenerate the catalog

```bash
node dist/cli.js transpile --all --out examples/components
bun examples/scripts/prepare-catalog.ts   # icon stubs + catalog manifest
```

## Interactivity (Alpine.js)

Interactivity is always emitted — the `.phtml` ships functional, not just visual. The transpiler
adds [Alpine.js](https://alpinejs.dev) directives on top of the markup via recipes:

- **Disclosure** (accordion, collapsible) — `x-data="{ open }"`, `@click` toggle, `x-show` +
  `x-collapse`, `:data-state` so the existing Tailwind state styles (chevron rotation) react.
- **Overlays** (dialog, alert-dialog, sheet) — a synthetic `x-data` root wrapper, `x-show` on
  overlay + content, `x-trap` (focus plugin), `@keydown.escape` and click-outside to close.
- **Floating** (dropdown-menu, popover, tooltip, hover-card) — `x-show` + `x-anchor` (anchor
  plugin) positions the content next to the trigger; click-outside / hover toggles it.
- **Toggles** (switch, checkbox, toggle) — self-contained `x-data` + `@click`, `:data-state` bound
  on every element with a `data-[state=…]` class.

Many shadcn roots are bare `XPrimitive.Root` re-exports with no template, yet hold the open state;
for those the transpiler emits a synthetic `<div x-data>` wrapper so trigger and content share an
Alpine scope. Load Alpine once with the `collapse`, `anchor` and `focus` plugins.

> **Scope:** the visual layer covers every component, the interactivity layer covers disclosures,
> overlays, floating menus and toggles. Value-selection components (tabs, select, radio-group) wire
> their value at usage; client-only components (chart via Recharts, calendar, carousel) render only
> their container.

## Comparing with real shadcn/ui — side by side

`reference/` is a Vite + React app with the real, interactive shadcn components. Run both servers,
then open the comparison view to see each component **side by side** (React vs transpiled Latte):

```bash
# 1. real shadcn (React)
cd reference && bun install && bun run dev      # http://localhost:5174

# 2. transpiled Nette catalog (Latte + Alpine)
composer install -d examples
php -S localhost:8080 examples/catalog.php

# 3. open the side-by-side compare view
#    http://localhost:8080/?view=compare
```

The compare view sidebar switches components; the left iframe is real shadcn, the right is the
transpiled `.phtml` rendered by Nette Latte. Button/badge/card/alert/table/… are pixel-equivalent;
accordion expands, dialog opens (focus-trapped), and the dropdown anchors — on the Latte side too.

## Architecture

A `TSX → AST → IR → .phtml` pipeline, where the IR is a testable seam:

```
src/
  cli.ts                CLI (commander)
  transpile.ts          orchestration: registry → parse → emit
  registry.ts           shadcn registry client
  ir.ts                 intermediate representation
  parser/
    ast.ts              shared TypeScript AST helpers
    cva.ts              cva variant extraction
    jsx.ts              JSX → IR nodes
    parseComponent.ts   whole file → Component[]
  emit/latte.ts         IR → .phtml (Latte)
  preview/render.ts     Latte-subset renderer for the local bun demo
  util/classes.ts       naming helpers
```

Input is parsed via the **TypeScript Compiler API** (no Babel). Tests: `npm test` (vitest).

## Conversion rules

- `cva(base, { variants, defaultVariants })` → `{var $base}` + `{var $<group>Classes = [...]}` + `{default $<group>}`; the class is composed via the lookup `{$<group>Classes[$<group>] ?? ''}`.
- `className={cn(...)}` → static classes + variant lookups + passthrough `{$class}`.
- `{children}` / `{...props}` → content slot `{block content}{/block}`.
- `{cond && <x/>}` and ternaries → `{if}` / `{if}{else}{/if}`.
- `arr.map(i => …)` → `{foreach $arr as $i}`.
- `{prop}`, `prop.x` → `{$prop}`, `{$prop->x}`; referenced props get a `{default}`.
- `const Comp = asChild ? Slot : "button"` → the tag resolves to `button`.
- Dropped: `ref`, `key`, `asChild`, event handlers (`onClick`…), TS types, imports.

## Known limitations (v1 = visual only)

- **Interactivity** (Radix behavior) is not converted. The target environment uses **Alpine.js** —
  interactivity is planned as a future extension (emitting Alpine directives as attributes).
- **Radix primitives** (`AvatarPrimitive.Image`, …) are rendered as a generic `<div>` with the
  classes preserved; the semantic tag (`img`, `span`) may need a manual fix.
- **Non-HTML props** passed explicitly to a primitive (`orientation`, `decorative`) may remain
  as attributes — remove them manually if needed.
- `.phtml` (Latte) output only. Adding a `.latte` emitter is trivial thanks to the IR seam.
```
