/** Emit a Component IR as a Nette `.phtml` template using Latte syntax. */
import type { Component, Node, ElementNode, ClassExpr, Attr, Param } from '../ir.js';
import { mapVarName } from '../util/classes.js';

const TAB = '\t';

export function emitComponent(c: Component): string {
  const lines: string[] = [];

  lines.push(
    `{* Generated from shadcn/ui ${c.reactName} by shadcn2nette. Do not edit by hand. *}`,
  );

  for (const p of c.params) {
    lines.push(`{default $${p.name} = ${defaultLiteral(p)}}`);
  }

  if (c.variants) {
    if (c.variants.base) {
      lines.push(`{var $base = '${escapeSq(c.variants.base)}'}`);
    }
    for (const g of c.variants.groups) {
      lines.push(`{var $${mapVarName(g.name)} = [`);
      for (const [opt, cls] of Object.entries(g.options)) {
        lines.push(`${TAB}'${escapeSq(opt)}' => '${escapeSq(cls)}',`);
      }
      lines.push(']}');
    }
  }

  for (const node of c.nodes) {
    lines.push(...renderNode(node, 0, c));
  }

  return lines.join('\n') + '\n';
}

function defaultLiteral(p: Param): string {
  if (p.kind === 'data') {
    return p.default !== undefined ? `'${escapeSq(p.default)}'` : 'null';
  }
  return `'${escapeSq(p.default ?? '')}'`;
}

function renderNode(node: Node, depth: number, c: Component): string[] {
  const pad = TAB.repeat(depth);

  switch (node.type) {
    case 'text':
      return [`${pad}${node.value}`];
    case 'interp':
      return [`${pad}{${node.expr}}`];
    case 'raw':
      return [`${pad}${node.value}`];
    case 'slot':
      return [`${pad}{block ${node.name}}{/block}`];
    case 'include':
      return [`${pad}{include '${escapeSq(node.template)}'${renderIncludeArgs(node.args)}}`];
    case 'if':
      return renderIf(node, depth, c);
    case 'foreach':
      return [
        `${pad}{foreach ${node.listExpr} as $${node.itemVar}}`,
        ...node.body.flatMap((n) => renderNode(n, depth + 1, c)),
        `${pad}{/foreach}`,
      ];
    case 'element':
      return renderElement(node, depth, c);
  }
}

function renderIf(
  node: Extract<Node, { type: 'if' }>,
  depth: number,
  c: Component,
): string[] {
  const pad = TAB.repeat(depth);
  const out = [`${pad}{if ${node.cond}}`, ...node.then.flatMap((n) => renderNode(n, depth + 1, c))];
  if (node.else && node.else.length > 0) {
    out.push(`${pad}{else}`, ...node.else.flatMap((n) => renderNode(n, depth + 1, c)));
  }
  out.push(`${pad}{/if}`);
  return out;
}

function renderElement(el: ElementNode, depth: number, c: Component): string[] {
  const pad = TAB.repeat(depth);
  const open = `${pad}<${el.tag}${renderClassAttr(el.classExpr, c)}${el.attrs.map(renderAttr).join('')}`;

  if (el.children.length === 0) {
    return [el.selfClosing ? `${open} />` : `${open}></${el.tag}>`];
  }

  if (el.children.length === 1 && isInline(el.children[0])) {
    return [`${open}>${renderInline(el.children[0])}</${el.tag}>`];
  }

  return [
    `${open}>`,
    ...el.children.flatMap((n) => renderNode(n, depth + 1, c)),
    `${pad}</${el.tag}>`,
  ];
}

function isInline(node: Node): boolean {
  return node.type === 'text' || node.type === 'interp';
}

function renderInline(node: Node): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'interp') return `{${node.expr}}`;
  return '';
}

function renderClassAttr(classExpr: ClassExpr | undefined, c: Component): string {
  if (!classExpr) return '';
  const segs: string[] = [];
  const hasVariant = classExpr.parts.some((p) => p.kind === 'variant');
  if (hasVariant && c.variants?.base) segs.push('{$base}');

  for (const part of classExpr.parts) {
    switch (part.kind) {
      case 'static':
        if (part.value) segs.push(part.value);
        break;
      case 'variant':
        segs.push(`{$${part.mapVar}[$${part.paramName}] ?? ''}`);
        break;
      case 'expr':
        segs.push(`{${part.expr}}`);
        break;
      case 'passthrough':
        segs.push('{$class}');
        break;
    }
  }

  return segs.length ? ` class="${segs.join(' ')}"` : '';
}

function renderAttr(a: Attr): string {
  if (a.value.kind === 'static') {
    return a.value.value === '' ? ` ${a.name}` : ` ${a.name}="${escapeLatteBraces(a.value.value)}"`;
  }
  return ` ${a.name}="{${a.value.expr}}"`;
}

// Alpine values like `{ open: false }` contain braces; Latte would parse them as
// tags. `{l}` / `{r}` are Latte's literal brace tokens, so they render verbatim.
function escapeLatteBraces(s: string): string {
  return s.replace(/[{}]/g, (ch) => (ch === '{' ? '{l}' : '{r}'));
}

function renderIncludeArgs(args: Record<string, string> | undefined): string {
  if (!args || Object.keys(args).length === 0) return '';
  const pairs = Object.entries(args).map(([k, v]) => `${k}: ${v}`);
  return `, ${pairs.join(', ')}`;
}

function escapeSq(s: string): string {
  return s.replace(/'/g, "\\'");
}
