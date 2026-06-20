import { describe, test, expect } from 'vitest';
import { parseComponentSource } from '../src/parser/parseComponent.js';
import { applyAlpine } from '../src/alpine/recipes.js';
import { emitComponent } from '../src/emit/latte.js';
import type { ElementNode } from '../src/ir.js';

const ACCORDION = `
const AccordionItem = React.forwardRef(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn("border-b", className)} {...props} />
));
const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger ref={ref} className={cn("flex flex-1 [&[data-state=open]>svg]:rotate-180", className)} {...props}>
      {children}
      <ChevronDown />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...props}>
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
export { AccordionItem, AccordionTrigger, AccordionContent };
`;

function byName(src: string) {
  const comps = applyAlpine(parseComponentSource(src));
  return Object.fromEntries(comps.map((c) => [c.reactName, c]));
}

describe('applyAlpine — accordion', () => {
  test('puts Alpine state on the item, toggle on the trigger, x-show on the content', () => {
    const m = byName(ACCORDION);
    const item = m.AccordionItem.nodes[0] as ElementNode;
    expect(item.attrs.find((a) => a.name === 'x-data')?.value).toEqual({ kind: 'static', value: '{ open: false }' });

    const trigger = m.AccordionTrigger.nodes[0] as ElementNode;
    expect(trigger.attrs.find((a) => a.name === '@click')?.value).toEqual({ kind: 'static', value: 'open = !open' });

    const content = m.AccordionContent.nodes[0] as ElementNode;
    expect(content.attrs.find((a) => a.name === 'x-show')?.value).toEqual({ kind: 'static', value: 'open' });
  });

  test('binds :data-state on every element that carries a data-state class', () => {
    const m = byName(ACCORDION);
    // the inner trigger element has [&[data-state=open]>svg]:rotate-180
    const out = emitComponent(m.AccordionTrigger);
    expect(out).toContain(":data-state=\"open ? 'open' : 'closed'\"");
    // the content root has data-[state=...] classes
    expect(emitComponent(m.AccordionContent)).toContain(":data-state=\"open ? 'open' : 'closed'\"");
  });
});

describe('applyAlpine — synthetic roots', () => {
  const DIALOG = `
    const Dialog = DialogPrimitive.Root;
    const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2" {...props}>{children}</DialogPrimitive.Content>
    ));
    export { Dialog, DialogContent };
  `;

  test('emits a dialog root wrapper with x-data and x-show on the content', () => {
    const comps = applyAlpine(parseComponentSource(DIALOG));
    const root = comps.find((c) => c.name === 'dialog');
    expect(root).toBeTruthy();
    expect((root!.nodes[0] as ElementNode).attrs.find((a) => a.name === 'x-data')?.value).toEqual({
      kind: 'static',
      value: '{ open: false }',
    });

    const content = comps.find((c) => c.reactName === 'DialogContent')!;
    expect((content.nodes[0] as ElementNode).attrs.find((a) => a.name === 'x-show')?.value).toEqual({
      kind: 'static',
      value: 'open',
    });
  });
});

describe('emit — Latte brace escaping', () => {
  test('escapes { and } in attribute values so Latte renders them literally', () => {
    const comp = {
      name: 'x',
      reactName: 'X',
      params: [],
      nodes: [
        { type: 'element' as const, tag: 'div', attrs: [{ name: 'x-data', value: { kind: 'static' as const, value: '{ open: false }' } }], children: [] },
      ],
    };
    expect(emitComponent(comp)).toContain('x-data="{l} open: false {r}"');
  });
});
