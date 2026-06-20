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

`examples/page.phtml` composes the transpiled components (buttons, badges, an alert, a card
built from its parts, avatar, separator, skeleton) into one page. It loads Tailwind via the
Play CDN and defines the shadcn theme tokens, so the components look like shadcn out of the box.

**Real Nette Latte engine (recommended):** renders the templates exactly as a Nette app would.

```bash
composer install -d examples
php -S localhost:8080 examples/index.php
# open http://localhost:8080
```

`examples/index.php` creates a `Latte\Engine`, points its `FileLoader` at `examples/`, and
renders `page.phtml`; the `{embed}` tags pull in `examples/components/*.phtml`.

**Zero-dependency preview (bun):** a built-in renderer for the emitted Latte subset, handy when
PHP is available later rather than now.

```bash
bun run demo
# open http://localhost:5173
```

To regenerate the demo components, run:

```bash
node dist/cli.js transpile button badge card alert input label separator skeleton avatar --out examples/components
```

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
