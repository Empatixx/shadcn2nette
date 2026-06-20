/**
 * Zag.js vanilla runtime — hydrates transpiled shadcn markup with the real
 * Radix-equivalent state machines (same behavior source as shadcn). The
 * transpiler emits clean markup; this runtime wires behavior, decoupled and
 * driven by the markup — so it scales across variants instead of per-component
 * recipes baked into the transpiler.
 *
 * POC: accordion. Bundle with: bun build examples/zag/main.ts --outfile assets/zag.js
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

function initAccordion(root: HTMLElement): void {
  const items = Array.from(root.children).filter((el): el is HTMLElement => el instanceof HTMLElement);

  const id = `accordion-${uid++}`;
  const machine = new VanillaMachine(accordion.machine, () => ({
    id,
    collapsible: true,
    getRootNode: () => root.getRootNode() as Document,
  }));
  machine.start();

  const api = () => accordion.connect(machine.service, normalizeProps);

  // Attach interaction once, on the real trigger element (correct currentTarget,
  // no teardown across renders), calling the live machine handlers.
  items.forEach((itemEl, i) => {
    const value = String(i);
    const trigger = itemEl.querySelector<HTMLElement>('[class*="flex-1"]');
    if (!trigger) return;
    // Drive the machine via its public API on click (robust across the vanilla
    // adapter); the machine then renders all state/a11y attributes.
    trigger.addEventListener('click', () => {
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
      const trigger = itemEl.querySelector<HTMLElement>('[class*="flex-1"]');
      const content = itemEl.querySelector<HTMLElement>('[class*="overflow-hidden"]');
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

function boot(): void {
  document.querySelectorAll<HTMLElement>('[data-zag-root="accordion"]').forEach(initAccordion);
  document.querySelectorAll<HTMLElement>('[data-zag-root="switch"]').forEach(initSwitch);
}

if (document.readyState !== 'loading') boot();
else document.addEventListener('DOMContentLoaded', boot);
