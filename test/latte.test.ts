import { describe, test, expect } from 'vitest';
import { emitComponent } from '../src/emit/latte.js';
import { parseComponentSource } from '../src/parser/parseComponent.js';
import type { Component } from '../src/ir.js';

const BUTTON = `
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
export { Button };
`;

const CARD = `
import { cn } from "@/lib/utils";
const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border", className)} {...props} />
));
export { Card };
`;

describe('emitComponent — cva component (button)', () => {
  test('emits defaults, variant maps, and a class lookup', () => {
    const [button] = parseComponentSource(BUTTON);
    const out = emitComponent(button);
    expect(out).toBe(
      [
        '{* Generated from shadcn/ui Button by nette-transpiler. Do not edit by hand. *}',
        "{default $variant = 'default'}",
        "{default $size = 'default'}",
        "{default $class = ''}",
        "{var $base = 'inline-flex items-center'}",
        '{var $variantClasses = [',
        "\t'default' => 'bg-primary',",
        "\t'outline' => 'border',",
        ']}',
        '{var $sizeClasses = [',
        "\t'default' => 'h-9',",
        "\t'sm' => 'h-8',",
        ']}',
        `<button class="{$base} {$variantClasses[$variant] ?? ''} {$sizeClasses[$size] ?? ''} {$class}">`,
        '\t{block content}{/block}',
        '</button>',
        '',
      ].join('\n'),
    );
  });
});

describe('emitComponent — plain component (card)', () => {
  test('emits a static class with passthrough and a content slot', () => {
    const [card] = parseComponentSource(CARD);
    const out = emitComponent(card);
    expect(out).toBe(
      [
        '{* Generated from shadcn/ui Card by nette-transpiler. Do not edit by hand. *}',
        "{default $class = ''}",
        '<div class="rounded-xl border {$class}">',
        '\t{block content}{/block}',
        '</div>',
        '',
      ].join('\n'),
    );
  });
});

describe('emitComponent — control flow & attributes', () => {
  test('emits foreach, if/else, interpolation and attributes with correct nesting', () => {
    const comp: Component = {
      name: 'demo',
      reactName: 'Demo',
      params: [{ name: 'class', kind: 'class', default: '' }],
      nodes: [
        {
          type: 'element',
          tag: 'ul',
          classExpr: { parts: [{ kind: 'static', value: 'space-y-2' }] },
          attrs: [
            { name: 'id', value: { kind: 'static', value: 'list' } },
            { name: 'data-x', value: { kind: 'expr', expr: '$x' } },
          ],
          children: [
            {
              type: 'foreach',
              listExpr: '$items',
              itemVar: 'item',
              body: [
                {
                  type: 'element',
                  tag: 'li',
                  attrs: [],
                  children: [
                    {
                      type: 'if',
                      cond: '$item->active',
                      then: [{ type: 'interp', expr: '$item->label' }],
                      else: [{ type: 'text', value: '-' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const out = emitComponent(comp);
    expect(out).toBe(
      [
        '{* Generated from shadcn/ui Demo by nette-transpiler. Do not edit by hand. *}',
        "{default $class = ''}",
        '<ul class="space-y-2" id="list" data-x="{$x}">',
        '\t{foreach $items as $item}',
        '\t\t<li>',
        '\t\t\t{if $item->active}',
        '\t\t\t\t{$item->label}',
        '\t\t\t{else}',
        '\t\t\t\t-',
        '\t\t\t{/if}',
        '\t\t</li>',
        '\t{/foreach}',
        '</ul>',
        '',
      ].join('\n'),
    );
  });
});
