/**
 * Alpine.js interactivity layer.
 *
 * The transpiler emits the visual markup; these recipes add behavior by injecting
 * Alpine directives. Each recipe targets a component by its React name:
 *  - `root`: directives placed on the component's root element (state + handlers)
 *  - `dataState`: a `:data-state` binding placed on every element that already
 *    carries a `data-[state=…]` (or `[data-state=…]`) class, so the existing
 *    Tailwind state styles light up from Alpine state.
 */
import type { Component, Node, ElementNode, ClassExpr } from '../ir.js';

interface Recipe {
  root?: Record<string, string>;
  dataState?: string;
}

export const RECIPES: Record<string, Recipe> = {
  // Accordion: open state lives on each item; the trigger toggles it; the content shows.
  AccordionItem: { root: { 'x-data': '{ open: false }' } },
  AccordionTrigger: {
    root: { '@click': 'open = !open', role: 'button', tabindex: '0' },
    dataState: "open ? 'open' : 'closed'",
  },
  AccordionContent: {
    root: { 'x-show': 'open', 'x-collapse': '', 'x-cloak': '' },
    dataState: "open ? 'open' : 'closed'",
  },

  // Self-contained toggles.
  Switch: {
    root: { 'x-data': '{ on: false }', '@click': 'on = !on', role: 'switch', ':aria-checked': 'on', tabindex: '0' },
    dataState: "on ? 'checked' : 'unchecked'",
  },
  Checkbox: {
    root: { 'x-data': '{ on: false }', '@click': 'on = !on', role: 'checkbox', ':aria-checked': 'on', tabindex: '0' },
    dataState: "on ? 'checked' : 'unchecked'",
  },
  Toggle: {
    root: { 'x-data': '{ on: false }', '@click': 'on = !on', ':aria-pressed': 'on', tabindex: '0' },
    dataState: "on ? 'on' : 'off'",
  },
};

/** Inject Alpine directives into the components a recipe recognises. Mutates and returns them. */
export function applyAlpine(components: Component[]): Component[] {
  for (const c of components) {
    const recipe = RECIPES[c.reactName];
    if (!recipe) continue;

    const root = c.nodes.find((n): n is ElementNode => n.type === 'element');
    if (root && recipe.root) {
      for (const [name, value] of Object.entries(recipe.root)) setAttr(root, name, value);
    }
    if (recipe.dataState) bindDataState(c.nodes, recipe.dataState);
  }
  return components;
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
