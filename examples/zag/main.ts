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
import { VanillaMachine, normalizeProps, spreadProps } from '@zag-js/vanilla';

let uid = 0;

function initAccordion(root: HTMLElement): void {
  const items = Array.from(root.children).filter((el): el is HTMLElement => el instanceof HTMLElement);

  const id = `accordion-${uid++}`;
  const machine = new VanillaMachine(accordion.machine, () => ({
    id,
    collapsible: true,
    getRootNode: () => root.getRootNode() as Document,
  }));
  machine.start();

  const render = () => {
    const api = accordion.connect(machine.service, normalizeProps);
    spreadProps(root, api.getRootProps());
    items.forEach((itemEl, i) => {
      const value = String(i);
      spreadProps(itemEl, api.getItemProps({ value }));
      const trigger = itemEl.querySelector<HTMLElement>('[class*="flex-1"]');
      const content = itemEl.querySelector<HTMLElement>('[class*="overflow-hidden"]');
      if (trigger) spreadProps(trigger, api.getItemTriggerProps({ value }));
      if (content) spreadProps(content, api.getItemContentProps({ value }));
    });
  };

  machine.subscribe(render);
  render();
}

function boot(): void {
  document.querySelectorAll<HTMLElement>('[data-zag-root="accordion"]').forEach(initAccordion);
}

if (document.readyState !== 'loading') boot();
else document.addEventListener('DOMContentLoaded', boot);
