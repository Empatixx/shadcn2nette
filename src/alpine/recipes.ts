/**
 * Alpine.js interactivity layer (always applied).
 *
 * The transpiler emits the visual markup; these recipes add behavior so the
 * `.phtml` ships functional, equivalent to Radix:
 *  - `parts`: directives injected onto a component's root element, plus an optional
 *    `:data-state` binding on every element carrying a `data-[state=…]` class.
 *  - `roots`: many shadcn roots are bare `XPrimitive.Root` re-exports with no
 *    template, yet that is where the open/close state lives. For those we emit a
 *    synthetic `<div x-data>` wrapper so triggers and content share Alpine scope.
 *
 * Floating content uses the `@alpinejs/anchor` plugin (`x-anchor`); dialogs use
 * `@alpinejs/focus` (`x-trap`); disclosures use `@alpinejs/collapse` (`x-collapse`).
 */
import type { Component, Node, ElementNode, ClassExpr } from '../ir.js';

interface PartRecipe {
  root?: Record<string, string>;
  dataState?: string;
  /** x-show expression for the indicator (first child element) — Radix renders it conditionally. */
  indicator?: string;
}

interface SyntheticRoot {
  name: string;
  reactName: string;
  when: string[];
  attrs: Record<string, string>;
}

const OPEN = "open ? 'open' : 'closed'";

const PARTS: Record<string, PartRecipe> = {
  // Self-contained toggles.
  Switch: { root: { 'x-data': '{ on: false }', '@click': 'on = !on', role: 'switch', ':aria-checked': 'on', tabindex: '0' }, dataState: "on ? 'checked' : 'unchecked'" },
  Checkbox: { root: { 'x-data': '{ on: false }', '@click': 'on = !on', role: 'checkbox', ':aria-checked': 'on', tabindex: '0' }, dataState: "on ? 'checked' : 'unchecked'", indicator: 'on' },
  RadioGroupItem: { root: { 'x-data': '{ on: false }', '@click': 'on = !on', role: 'radio', ':aria-checked': 'on', tabindex: '0' }, dataState: "on ? 'checked' : 'unchecked'", indicator: 'on' },
  Toggle: { root: { 'x-data': '{ on: false }', '@click': 'on = !on', ':aria-pressed': 'on', tabindex: '0' }, dataState: "on ? 'on' : 'off'" },

  // Accordion — state per item.
  AccordionItem: { root: { 'x-data': '{ open: false }' } },
  AccordionTrigger: { root: { '@click': 'open = !open', role: 'button', tabindex: '0' }, dataState: OPEN },
  AccordionContent: { root: { 'x-show': 'open', 'x-collapse': '', 'x-cloak': '' }, dataState: OPEN },

  // Collapsible.
  CollapsibleContent: { root: { 'x-show': 'open', 'x-collapse': '', 'x-cloak': '' }, dataState: OPEN },

  // Dialog family (focus-trapped overlays).
  DialogOverlay: { root: { 'x-show': 'open', '@click': 'open = false', 'x-transition.opacity': '', 'x-cloak': '' }, dataState: OPEN },
  DialogContent: { root: { 'x-show': 'open', 'x-trap.noscroll': 'open', '@keydown.escape.window': 'open = false', 'x-transition': '', 'x-cloak': '' }, dataState: OPEN },
  AlertDialogOverlay: { root: { 'x-show': 'open', 'x-transition.opacity': '', 'x-cloak': '' }, dataState: OPEN },
  AlertDialogContent: { root: { 'x-show': 'open', 'x-trap.noscroll': 'open', 'x-transition': '', 'x-cloak': '' }, dataState: OPEN },
  SheetOverlay: { root: { 'x-show': 'open', '@click': 'open = false', 'x-transition.opacity': '', 'x-cloak': '' }, dataState: OPEN },
  SheetContent: { root: { 'x-show': 'open', 'x-trap.noscroll': 'open', '@keydown.escape.window': 'open = false', 'x-transition': '', 'x-cloak': '' }, dataState: OPEN },

  // Floating content (anchored to a trigger via $refs.trg).
  DropdownMenuContent: { root: { 'x-show': 'open', 'x-anchor.bottom-start': '$refs.trg', '@click.outside': 'open = false', 'x-transition': '', 'x-cloak': '' }, dataState: OPEN },
  PopoverContent: { root: { 'x-show': 'open', 'x-anchor.bottom': '$refs.trg', '@click.outside': 'open = false', 'x-transition': '', 'x-cloak': '' }, dataState: OPEN },
  TooltipContent: { root: { 'x-show': 'open', 'x-anchor.top': '$refs.trg', 'x-transition': '', 'x-cloak': '' }, dataState: OPEN },
  HoverCardContent: { root: { 'x-show': 'open', 'x-anchor.bottom': '$refs.trg', 'x-transition': '', 'x-cloak': '' }, dataState: OPEN },
};

const ROOTS: SyntheticRoot[] = [
  { name: 'collapsible', reactName: 'Collapsible', when: ['CollapsibleContent'], attrs: { 'x-data': '{ open: false }' } },
  { name: 'dialog', reactName: 'Dialog', when: ['DialogContent'], attrs: { 'x-data': '{ open: false }', class: 'contents' } },
  { name: 'alert-dialog', reactName: 'AlertDialog', when: ['AlertDialogContent'], attrs: { 'x-data': '{ open: false }', class: 'contents' } },
  { name: 'sheet', reactName: 'Sheet', when: ['SheetContent'], attrs: { 'x-data': '{ open: false }', class: 'contents' } },
  { name: 'dropdown-menu', reactName: 'DropdownMenu', when: ['DropdownMenuContent'], attrs: { 'x-data': '{ open: false }', '@keydown.escape.window': 'open = false', class: 'relative inline-block' } },
  { name: 'popover', reactName: 'Popover', when: ['PopoverContent'], attrs: { 'x-data': '{ open: false }', class: 'relative inline-block' } },
  { name: 'tooltip', reactName: 'Tooltip', when: ['TooltipContent'], attrs: { 'x-data': '{ open: false }', class: 'relative inline-block' } },
  { name: 'hover-card', reactName: 'HoverCard', when: ['HoverCardContent'], attrs: { 'x-data': '{ open: false }', class: 'relative inline-block' } },
];

/** Inject Alpine directives and append synthetic root wrappers. Mutates and returns. */
export function applyAlpine(components: Component[]): Component[] {
  for (const c of components) {
    const recipe = PARTS[c.reactName];
    if (!recipe) continue;
    const root = c.nodes.find(isElement);
    if (root && recipe.root) {
      for (const [name, value] of Object.entries(recipe.root)) setAttr(root, name, value);
    }
    if (recipe.dataState) bindDataState(c.nodes, recipe.dataState);
    if (recipe.indicator && root) {
      const indicator = root.children.find(isElement);
      if (indicator) {
        setAttr(indicator, 'x-show', recipe.indicator);
        setAttr(indicator, 'x-cloak', '');
      }
    }
  }

  const reactNames = new Set(components.map((c) => c.reactName));
  const templateNames = new Set(components.map((c) => c.name));
  for (const sr of ROOTS) {
    if (templateNames.has(sr.name)) continue;
    if (!sr.when.some((w) => reactNames.has(w))) continue;
    components.push(makeRoot(sr));
  }
  return components;
}

function makeRoot(sr: SyntheticRoot): Component {
  const attrs = Object.entries(sr.attrs)
    .filter(([k]) => k !== 'class')
    .map(([name, value]) => ({ name, value: { kind: 'static' as const, value } }));
  const classVal = sr.attrs.class;
  const parts: ClassExpr['parts'] = classVal
    ? [{ kind: 'static', value: classVal }, { kind: 'passthrough' }]
    : [{ kind: 'passthrough' }];
  return {
    name: sr.name,
    reactName: sr.reactName,
    params: [{ name: 'class', kind: 'class', default: '' }],
    nodes: [
      { type: 'element', tag: 'div', classExpr: { parts }, attrs, children: [{ type: 'slot', name: 'content' }] },
    ],
  };
}

function isElement(n: Node): n is ElementNode {
  return n.type === 'element';
}

function setAttr(el: ElementNode, name: string, value: string): void {
  el.attrs = el.attrs.filter((a) => a.name !== name);
  el.attrs.push({ name, value: { kind: 'static', value } });
}

function bindDataState(nodes: Node[], expr: string): void {
  for (const n of nodes) {
    if (n.type === 'element') {
      if (n.classExpr && hasStateClass(n.classExpr)) setAttr(n, ':data-state', expr);
      bindDataState(n.children, expr);
    } else if (n.type === 'if') {
      bindDataState(n.then, expr);
      bindDataState(n.else ?? [], expr);
    } else if (n.type === 'foreach') {
      bindDataState(n.body, expr);
    }
  }
}

function hasStateClass(classExpr: ClassExpr): boolean {
  const text = classExpr.parts
    .filter((p): p is { kind: 'static'; value: string } => p.kind === 'static')
    .map((p) => p.value)
    .join(' ');
  return text.includes('data-[state=') || text.includes('data-state=');
}
