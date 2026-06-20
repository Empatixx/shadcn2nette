# nette-transpiler

CLI nástroj, který převádí [shadcn/ui](https://ui.shadcn.com) komponenty (React/TSX)
na **Nette `.phtml` šablony s Latte syntaxí**. Zaměřuje se na **vzhled**: markup,
Tailwind třídy a `cva` varianty jako parametry šablony. Klientská interaktivita
(Radix/React hooks) je mimo rozsah.

## Instalace

```bash
npm install
npm run build
```

## Použití

```bash
# konkrétní komponenty z oficiálního shadcn registry
node dist/cli.js transpile button card alert --out ./out

# nebo bez "transpile" (výchozí příkaz)
node dist/cli.js button badge input

# všechny registry:ui komponenty
node dist/cli.js transpile --all --out ./components

# bez buildu, přímo přes tsx
npm run transpile -- button card
```

### Přepínače

| Přepínač | Význam | Výchozí |
|---|---|---|
| `[components...]` | názvy komponent | – |
| `--all` | převést všechny `registry:ui` komponenty | – |
| `--style <s>` | shadcn styl (`new-york` \| `default`) | `new-york` |
| `--out <dir>` | výstupní adresář | `./out` |
| `--registry <url>` | základní URL registry | `https://ui.shadcn.com/r` |

## Jak vypadá výstup

Vstup (shadcn `Button`) → `button.phtml`:

```latte
{* Generated from shadcn/ui Button by nette-transpiler. Do not edit by hand. *}
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

### Použití šablony v Nette

`cva` varianty jsou parametry, obsah se předává blokem `content` přes `{embed}`:

```latte
{embed 'button.phtml', variant: 'destructive', size: 'sm'}
	{block content}Smazat{/block}
{/embed}
```

Komponenty složené z více částí (Card → CardHeader, CardTitle, …) se generují jako
samostatné `.phtml` a skládají se vnořenými `{embed}`.

## Architektura

Pipeline `TSX → AST → IR → .phtml`, kde IR je testovatelný seam:

```
src/
  cli.ts                CLI (commander)
  transpile.ts          orchestrace: registry → parse → emit
  registry.ts           klient shadcn registry
  ir.ts                 mezireprezentace
  parser/
    ast.ts              sdílené TypeScript AST helpery
    cva.ts              extrakce cva variant
    jsx.ts              JSX → IR uzly
    parseComponent.ts   celý soubor → Component[]
  emit/latte.ts         IR → .phtml (Latte)
  util/classes.ts       pojmenovací helpery
```

Vstup se parsuje přes **TypeScript Compiler API** (žádný Babel). Testy: `npm test` (vitest).

## Pravidla převodu

- `cva(base, { variants, defaultVariants })` → `{var $base}` + `{var $<group>Classes = [...]}` + `{default $<group>}`; třída se skládá lookupem `{$<group>Classes[$<group>] ?? ''}`.
- `className={cn(...)}` → statické třídy + variant lookupy + passthrough `{$class}`.
- `{children}` / `{...props}` → content slot `{block content}{/block}`.
- `{cond && <x/>}` a ternár → `{if}` / `{if}{else}{/if}`.
- `arr.map(i => …)` → `{foreach $arr as $i}`.
- `{prop}`, `prop.x` → `{$prop}`, `{$prop->x}`; referencované propsy dostanou `{default}`.
- `const Comp = asChild ? Slot : "button"` → tag se rozřeší na `button`.
- Zahazuje se: `ref`, `key`, `asChild`, event handlery (`onClick`…), TS typy, importy.

## Známé limity (v1 = jen vzhled)

- **Interaktivita** (Radix chování) se nepřevádí. Cílové prostředí používá **Alpine.js** —
  interaktivita je plánovaná jako budoucí rozšíření (emise Alpine direktiv jako atributů).
- **Radix primitivy** (`AvatarPrimitive.Image`, …) se renderují jako generický `<div>` se
  zachovanými třídami; sémantický tag (`img`, `span`) je případně třeba upravit ručně.
- **Ne-HTML propsy** explicitně předané primitivu (`orientation`, `decorative`) mohou zůstat
  jako atributy — případně odebrat ručně.
- Jen `.phtml` výstup (Latte). Přidání `.latte` emitteru je triviální díky IR seamu.
```
