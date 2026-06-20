---
name: shadcn2nette
description: This skill should be used when the user asks to "transpile a shadcn component", "convert shadcn to Nette", "generate a .phtml from shadcn", "use shadcn2nette", or works with the shadcn2nette CLI in this repository. It explains how to run the bun-based transpiler and how to use the generated Latte templates.
version: 0.1.0
---

# shadcn2nette

shadcn2nette converts shadcn/ui React components into Nette `.phtml` templates with Latte
syntax. It covers the visual layer: markup, Tailwind classes, and `cva` variants exposed as
template parameters. The pipeline is `TSX → AST → IR → .phtml`, built on the TypeScript
Compiler API. Run everything with **bun**.

## Setup

Install dependencies once:

```bash
bun install
```

## Golden flow: generate templates

Bun runs the TypeScript source directly, so a single command produces templates.

Transpile specific components from the official shadcn registry:

```bash
bun src/cli.ts transpile button card alert --out ./out
```

Transpile the whole `registry:ui` set:

```bash
bun src/cli.ts transpile --all --out ./components
```

Each component becomes one `.phtml`. Composite components (Card → CardHeader, CardTitle, …)
produce one file per part.

### Options

| Option | Meaning | Default |
|---|---|---|
| `[components...]` | component names | – |
| `--all` | transpile every `registry:ui` component | – |
| `--style <s>` | shadcn style (`new-york` or `default`) | `new-york` |
| `--out <dir>` | output directory | `./out` |
| `--registry <url>` | registry base URL | `https://ui.shadcn.com/r` |

## Golden flow: use a template in Nette

Variants are parameters; content flows through the `content` block via `{embed}`:

```latte
{embed 'button.phtml', variant: 'destructive', size: 'sm'}
	{block content}Delete{/block}
{/embed}
```

Pass data props as named arguments the same way (for example `type: 'email'` for `input.phtml`).

## How it works

- `src/cli.ts` — CLI built with commander (command, args, options).
- `src/registry.ts` — fetches the shadcn registry JSON.
- `src/parser/` — `cva.ts` reads variants, `jsx.ts` maps JSX to IR, `parseComponent.ts` ties it together.
- `src/emit/latte.ts` — renders the IR to `.phtml`.

To refresh templates after a shadcn update, run the transpile command again.

## Development

Run the test suite with bun:

```bash
bun run test
```

Add a new conversion rule by writing a failing test first, then growing the parser or emitter
to make it pass. Keep the IR (`src/ir.ts`) as the shared contract between parser and emitter.
