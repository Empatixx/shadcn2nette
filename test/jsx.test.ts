import { describe, test, expect } from 'vitest';
import { convertJsxSource } from '../src/parser/jsx.js';
import type { ElementNode, IfNode, ForeachNode } from '../src/ir.js';

describe('convertJsxSource — elements & classes', () => {
  test('converts a simple element with a static className', () => {
    const [node] = convertJsxSource('const C = () => <div className="flex gap-2">hi</div>;');
    expect(node.type).toBe('element');
    const el = node as ElementNode;
    expect(el.tag).toBe('div');
    expect(el.classExpr?.parts).toEqual([{ kind: 'static', value: 'flex gap-2' }]);
    expect(el.children).toEqual([{ type: 'text', value: 'hi' }]);
  });

  test('keeps static attributes, supports boolean attrs, drops ref/event handlers', () => {
    const [node] = convertJsxSource(
      'const C = () => <button type="button" ref={r} onClick={f} disabled>x</button>;',
    );
    const el = node as ElementNode;
    expect(el.tag).toBe('button');
    expect(el.attrs).toContainEqual({ name: 'type', value: { kind: 'static', value: 'button' } });
    expect(el.attrs).toContainEqual({ name: 'disabled', value: { kind: 'static', value: '' } });
    expect(el.attrs.find((a) => a.name === 'ref')).toBeUndefined();
    expect(el.attrs.find((a) => a.name === 'onClick')).toBeUndefined();
  });

  test('converts a dynamic attribute to a Latte expression', () => {
    const [node] = convertJsxSource('const C = () => <a href={href}>x</a>;');
    const el = node as ElementNode;
    expect(el.attrs).toContainEqual({ name: 'href', value: { kind: 'expr', expr: '$href' } });
  });

  test('resolves cn(cva(...), className) into variant lookups + passthrough', () => {
    const src = `
      const buttonVariants = cva("inline-flex", {
        variants: { variant: { default: "a" }, size: { default: "b" } }
      });
      const C = () => <button className={cn(buttonVariants({ variant, size, className }))}>x</button>;
    `;
    const [node] = convertJsxSource(src);
    const el = node as ElementNode;
    expect(el.classExpr?.parts).toEqual([
      { kind: 'variant', mapVar: 'variantClasses', paramName: 'variant' },
      { kind: 'variant', mapVar: 'sizeClasses', paramName: 'size' },
      { kind: 'passthrough' },
    ]);
  });

  test('combines a static cn() string arg with passthrough', () => {
    const [node] = convertJsxSource(
      'const C = () => <div className={cn("rounded-lg border", className)}>x</div>;',
    );
    const el = node as ElementNode;
    expect(el.classExpr?.parts).toEqual([
      { kind: 'static', value: 'rounded-lg border' },
      { kind: 'passthrough' },
    ]);
  });
});

describe('convertJsxSource — children & interpolation', () => {
  test('maps {children} to a content slot', () => {
    const [node] = convertJsxSource('const C = () => <div>{children}</div>;');
    expect((node as ElementNode).children).toEqual([{ type: 'slot', name: 'content' }]);
  });

  test('maps {title} to an interpolation', () => {
    const [node] = convertJsxSource('const C = () => <h1>{title}</h1>;');
    expect((node as ElementNode).children).toEqual([{ type: 'interp', expr: '$title' }]);
  });
});

describe('convertJsxSource — control flow', () => {
  test('converts {cond && <span/>} to an if node', () => {
    const [node] = convertJsxSource('const C = () => <div>{show && <span>!</span>}</div>;');
    const ifNode = (node as ElementNode).children[0] as IfNode;
    expect(ifNode.type).toBe('if');
    expect(ifNode.cond).toBe('$show');
    expect((ifNode.then[0] as ElementNode).tag).toBe('span');
    expect(ifNode.else).toBeUndefined();
  });

  test('converts a ternary to an if/else node', () => {
    const [node] = convertJsxSource('const C = () => <div>{ok ? <a>y</a> : <b>n</b>}</div>;');
    const ifNode = (node as ElementNode).children[0] as IfNode;
    expect(ifNode.cond).toBe('$ok');
    expect((ifNode.then[0] as ElementNode).tag).toBe('a');
    expect((ifNode.else?.[0] as ElementNode).tag).toBe('b');
  });

  test('converts .map() to a foreach node', () => {
    const [node] = convertJsxSource(
      'const C = () => <ul>{items.map(item => <li>{item.label}</li>)}</ul>;',
    );
    const fe = (node as ElementNode).children[0] as ForeachNode;
    expect(fe.type).toBe('foreach');
    expect(fe.listExpr).toBe('$items');
    expect(fe.itemVar).toBe('item');
    expect((fe.body[0] as ElementNode).tag).toBe('li');
    expect((fe.body[0] as ElementNode).children).toEqual([
      { type: 'interp', expr: '$item->label' },
    ]);
  });
});

describe('convertJsxSource — sub-components', () => {
  test('converts an uppercase tag to an include', () => {
    const [node] = convertJsxSource('const C = () => <div><CardHeader /></div>;');
    expect((node as ElementNode).children[0]).toEqual({
      type: 'include',
      template: 'card-header.phtml',
    });
  });
});

describe('convertJsxSource — conditional class expressions', () => {
  test('converts a ternary with === inside cn() to a valid Latte expression', () => {
    const src =
      'const C = () => <div className={cn("base", orientation === "horizontal" ? "h-px w-full" : "w-px h-full")} />;';
    const [node] = convertJsxSource(src);
    const el = node as ElementNode;
    expect(el.classExpr?.parts).toContainEqual({
      kind: 'expr',
      expr: "$orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full'",
    });
  });
});

describe('convertJsxSource — void elements & primitives', () => {
  test('does not inject a content slot into a void element', () => {
    const [node] = convertJsxSource('const C = () => <input className="x" {...props} />;');
    const el = node as ElementNode;
    expect(el.tag).toBe('input');
    expect(el.selfClosing).toBe(true);
    expect(el.children).toEqual([]);
  });

  test('renders a Radix primitive member tag as a generic element', () => {
    const [node] = convertJsxSource(
      'const C = () => <AvatarPrimitive.Root className="h-10 w-10" {...props} />;',
    );
    expect(node.type).toBe('element');
    expect((node as ElementNode).tag).toBe('div');
  });
});

describe('convertJsxSource — tag aliases (asChild / Slot)', () => {
  test('resolves `const Comp = asChild ? Slot : "button"` to a real element tag', () => {
    const src = `
      const Comp = asChild ? Slot : "button";
      const C = () => <Comp className="x" />;
    `;
    const [node] = convertJsxSource(src);
    expect(node.type).toBe('element');
    expect((node as ElementNode).tag).toBe('button');
  });
});
