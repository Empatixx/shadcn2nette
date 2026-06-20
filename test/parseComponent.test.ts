import { describe, test, expect } from 'vitest';
import { parseComponentSource } from '../src/parser/parseComponent.js';
import type { ElementNode } from '../src/ir.js';

const BUTTON = `
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center", {
  variants: {
    variant: { default: "bg-primary", outline: "border" },
    size: { default: "h-9", sm: "h-8" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
));
Button.displayName = "Button";

export { Button, buttonVariants };
`;

const CARD = `
import * as React from "react";
import { cn } from "@/lib/utils";
const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border", className)} {...props} />
));
const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-semibold", className)} {...props} />
));
export { Card, CardTitle };
`;

describe('parseComponentSource', () => {
  test('parses a single forwardRef component with cva variants', () => {
    const comps = parseComponentSource(BUTTON);
    expect(comps).toHaveLength(1);

    const c = comps[0];
    expect(c.reactName).toBe('Button');
    expect(c.name).toBe('button');
    expect(c.variants?.name).toBe('buttonVariants');
    expect(c.params.map((p) => p.name)).toEqual(['variant', 'size', 'class', 'attrs']);

    const variantParam = c.params.find((p) => p.name === 'variant')!;
    expect(variantParam.kind).toBe('variant');
    expect(variantParam.options).toEqual(['default', 'outline']);
    expect(variantParam.default).toBe('default');

    const root = c.nodes[0] as ElementNode;
    expect(root.tag).toBe('button');
    expect(root.children).toEqual([{ type: 'slot', name: 'content' }]);
  });

  test('parses every exported component in a multi-component file', () => {
    const comps = parseComponentSource(CARD);
    expect(comps.map((c) => c.name)).toEqual(['card', 'card-title']);
    expect((comps[1].nodes[0] as ElementNode).tag).toBe('h3');
  });

  test('a component without cva still gets a class passthrough param', () => {
    const comps = parseComponentSource(CARD);
    expect(comps[0].variants).toBeUndefined();
    expect(comps[0].params.map((p) => p.name)).toEqual(['class', 'attrs']);
  });
});

function countSlots(nodes: import('../src/ir.js').Node[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.type === 'slot') n++;
    else if (node.type === 'element') n += countSlots(node.children);
    else if (node.type === 'if') n += countSlots(node.then) + countSlots(node.else ?? []);
    else if (node.type === 'foreach') n += countSlots(node.body);
  }
  return n;
}

describe('parseComponentSource — content slots', () => {
  test('emits a single content slot when children is destructured alongside a spread', () => {
    const SRC = `
      const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => (
        <AccordionPrimitive.Content className="overflow-hidden" {...props}>
          <div className={cn("pb-4", className)}>{children}</div>
        </AccordionPrimitive.Content>
      ));
      export { AccordionContent };
    `;
    const [c] = parseComponentSource(SRC);
    expect(countSlots(c.nodes)).toBe(1);
  });
});

describe('parseComponentSource — data params from destructured props', () => {
  test('declares a referenced prop with its default, ordered before class', () => {
    const SRC = `
      const Separator = React.forwardRef(({ className, orientation = "horizontal", ...props }, ref) => (
        <div className={cn("base", orientation === "horizontal" ? "h" : "v", className)} {...props} />
      ));
      export { Separator };
    `;
    const [c] = parseComponentSource(SRC);
    expect(c.params.find((p) => p.name === 'orientation')).toEqual({
      name: 'orientation',
      kind: 'data',
      default: 'horizontal',
    });
    expect(c.params.map((p) => p.name)).toEqual(['orientation', 'class', 'attrs']);
  });

  test('declares a referenced prop with no default as a bare data param', () => {
    const SRC = `
      const Input = React.forwardRef(({ className, type, ...props }, ref) => (
        <input type={type} className={cn("base", className)} {...props} />
      ));
      export { Input };
    `;
    const [c] = parseComponentSource(SRC);
    expect(c.params.find((p) => p.name === 'type')).toEqual({ name: 'type', kind: 'data' });
  });

  test('does not treat a foreach item variable as a data param', () => {
    const SRC = `
      const List = ({ items }) => (
        <ul>{items.map((item) => <li>{item.label}</li>)}</ul>
      );
      export { List };
    `;
    const [c] = parseComponentSource(SRC);
    expect(c.params.find((p) => p.name === 'item')).toBeUndefined();
    expect(c.params.find((p) => p.name === 'items')).toEqual({ name: 'items', kind: 'data' });
  });
});
