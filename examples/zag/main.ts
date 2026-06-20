/**
 * Zag.js vanilla runtime — hydrates transpiled shadcn markup with the real
 * Radix-equivalent state machines. The transpiler stamps every root with
 * `data-shadcn="<name>"`, so this runtime finds and wires components by name —
 * usage needs no extra markup, just include the component.
 */
import * as accordion from '@zag-js/accordion';
import * as zagSwitch from '@zag-js/switch';
import { VanillaMachine, normalizeProps, spreadProps } from '@zag-js/vanilla';

let uid = 0;

/** Apply only attribute props; events are attached once, directly on the element. */
function spreadAttrs(node: Element, props: Record<string, unknown>): void {
  const attrs: Record<string, unknown> = {};
  for (const key in props) if (!key.startsWith('on')) attrs[key] = props[key];
  spreadProps(node, attrs);
}

function initAccordion(root: HTMLElement, items: HTMLElement[]): void {
  const id = `accordion-${uid++}`;
  const machine = new VanillaMachine(accordion.machine, () => ({
    id,
    collapsible: true,
    getRootNode: () => root.getRootNode() as Document,
  }));
  machine.start();
  const api = () => accordion.connect(machine.service, normalizeProps);

  items.forEach((itemEl, i) => {
    const value = String(i);
    const trigger = itemEl.querySelector<HTMLElement>('[data-shadcn="accordion-trigger"]');
    trigger?.addEventListener('click', () => {
      const a = api();
      a.setValue(a.value.includes(value) ? [] : [value]);
    });
  });

  const render = () => {
    const a = api();
    spreadAttrs(root, a.getRootProps());
    items.forEach((itemEl, i) => {
      const value = String(i);
      spreadAttrs(itemEl, a.getItemProps({ value }));
      const trigger = itemEl.querySelector<HTMLElement>('[data-shadcn="accordion-trigger"]');
      const content = itemEl.querySelector<HTMLElement>('[data-shadcn="accordion-content"]');
      if (trigger) spreadAttrs(trigger, a.getItemTriggerProps({ value }));
      if (content) spreadAttrs(content, a.getItemContentProps({ value }));
    });
  };
  machine.subscribe(render);
  render();
}

function initSwitch(root: HTMLElement): void {
  const id = `switch-${uid++}`;
  const machine = new VanillaMachine(zagSwitch.machine, () => ({ id }));
  machine.start();
  const api = () => zagSwitch.connect(machine.service, normalizeProps);
  const thumb = root.querySelector<HTMLElement>('[class*="translate-x"]');

  root.addEventListener('click', () => {
    const a = api();
    a.setChecked(!a.checked);
  });

  const render = () => {
    const a = api();
    spreadAttrs(root, a.getControlProps());
    if (thumb) spreadAttrs(thumb, a.getThumbProps());
  };
  machine.subscribe(render);
  render();
}

/** Group elements by their parent. */
function groupByParent(els: NodeListOf<HTMLElement>): Map<HTMLElement, HTMLElement[]> {
  const groups = new Map<HTMLElement, HTMLElement[]>();
  els.forEach((el) => {
    const parent = el.parentElement;
    if (!parent) return;
    (groups.get(parent) ?? groups.set(parent, []).get(parent)!).push(el);
  });
  return groups;
}

function boot(): void {
  // Accordion: each group of items sharing a parent is one accordion.
  groupByParent(document.querySelectorAll<HTMLElement>('[data-shadcn="accordion-item"]')).forEach(
    (items, root) => initAccordion(root, items),
  );
  // Self-contained components.
  document.querySelectorAll<HTMLElement>('[data-shadcn="switch"]').forEach(initSwitch);
}

if (document.readyState !== 'loading') boot();
else document.addEventListener('DOMContentLoaded', boot);
