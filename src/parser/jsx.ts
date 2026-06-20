/** Convert a TSX JSX tree into IR nodes (visual-only). */
import ts from 'typescript';
import type {
  Node,
  ElementNode,
  Attr,
  AttrValue,
  ClassExpr,
  ClassPart,
  VariantModel,
} from '../ir.js';
import { parseSource, findJsx, collectTagAliases, collectDestructuredProps } from './ast.js';
import { extractCvaModels } from './cva.js';
import { mapVarName, templateFileName, collapseWhitespace } from '../util/classes.js';

export interface JsxContext {
  /** cva models keyed by the variable they were assigned to. */
  cva: Map<string, VariantModel>;
  /** local tag aliases (the shadcn `asChild`/`Slot` idiom). */
  tagAliases: Map<string, string>;
  /** whether `children` is destructured (then it owns the content slot, not the spread). */
  childrenDestructured: boolean;
}

export interface ConvertOptions {
  cva?: Map<string, VariantModel>;
  tagAliases?: Map<string, string>;
  childrenDestructured?: boolean;
}

/**
 * Parse a TSX source string, find its first JSX expression, and convert it to IR.
 * cva models and tag aliases are auto-extracted from the same source unless provided.
 */
export function convertJsxSource(source: string, opts: ConvertOptions = {}): Node[] {
  const sf = parseSource(source);
  const cva = opts.cva ?? new Map(extractCvaModels(source).map((m) => [m.name, m]));
  const tagAliases = opts.tagAliases ?? collectTagAliases(sf);
  const childrenDestructured = opts.childrenDestructured ?? collectDestructuredProps(sf).has('children');
  const jsx = findJsx(sf);
  if (!jsx) return [];
  return convertNode(jsx, { cva, tagAliases, childrenDestructured });
}

function unwrap(node: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
}

/** Convert any JSX-ish node into zero or more IR nodes. */
export function convertNode(node: ts.Node, ctx: JsxContext): Node[] {
  if (ts.isParenthesizedExpression(node)) return convertNode(node.expression, ctx);

  if (ts.isJsxElement(node)) {
    const tag = resolveTag(node.openingElement.tagName.getText(), ctx);
    // A children-bearing component (Portal, Provider, …) is a transparent wrapper:
    // render its children, since its own markup contributes nothing visual.
    if (isComponentTag(tag)) return convertChildren(node.children, ctx);
    return [
      buildElement(tag, node.openingElement.attributes, convertChildren(node.children, ctx), false, ctx),
    ];
  }

  if (ts.isJsxSelfClosingElement(node)) {
    const tag = resolveTag(node.tagName.getText(), ctx);
    if (isComponentTag(tag)) return [includeNode(tag)];
    return [buildElement(tag, node.attributes, [], true, ctx)];
  }

  if (ts.isJsxFragment(node)) {
    return convertChildren(node.children, ctx);
  }

  if (ts.isJsxText(node)) {
    const text = collapseWhitespace(node.text);
    return text ? [{ type: 'text', value: text }] : [];
  }

  if (ts.isJsxExpression(node)) {
    return convertExpression(node, ctx);
  }

  // Non-JSX expression (e.g. `a && <x/>` as a .map body or ternary branch).
  if (ts.isStringLiteralLike(node)) return [{ type: 'text', value: node.text }];
  return convertValue(node as ts.Expression, ctx);
}

function convertChildren(children: ts.NodeArray<ts.JsxChild>, ctx: JsxContext): Node[] {
  return children.flatMap((c) => convertNode(c, ctx));
}

function convertExpression(node: ts.JsxExpression, ctx: JsxContext): Node[] {
  if (!node.expression) return [];
  return convertValue(unwrap(node.expression), ctx);
}

function convertValue(expr: ts.Expression, ctx: JsxContext): Node[] {
  if (ts.isIdentifier(expr) && expr.text === 'children') {
    return [{ type: 'slot', name: 'content' }];
  }

  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return [{ type: 'if', cond: latteExpr(expr.left), then: convertNode(expr.right, ctx) }];
  }

  // `children ?? <Icon/>` (or `x ?? fallback`): the right side is the default.
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
    const fallback = convertNode(unwrap(expr.right), ctx);
    if (ts.isIdentifier(expr.left) && expr.left.text === 'children') {
      return [{ type: 'slot', name: 'content', default: fallback }];
    }
    return [{ type: 'if', cond: latteExpr(expr.left), then: [{ type: 'interp', expr: latteExpr(expr.left) }], else: fallback }];
  }

  if (ts.isConditionalExpression(expr)) {
    return [
      {
        type: 'if',
        cond: latteExpr(expr.condition),
        then: convertNode(expr.whenTrue, ctx),
        else: convertNode(expr.whenFalse, ctx),
      },
    ];
  }

  // Bare function calls like `labelFormatter(value)` are render-prop functions
  // (runtime React) with no static value — drop them.
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
    return [];
  }

  const map = asMapCall(expr);
  if (map) {
    return [
      {
        type: 'foreach',
        listExpr: latteExpr(map.list),
        itemVar: map.itemVar,
        body: convertNode(map.body, ctx),
      },
    ];
  }

  return [{ type: 'interp', expr: latteExpr(expr) }];
}

interface MapCall {
  list: ts.Expression;
  itemVar: string;
  body: ts.Expression;
}

function asMapCall(expr: ts.Expression): MapCall | undefined {
  if (
    !ts.isCallExpression(expr) ||
    !ts.isPropertyAccessExpression(expr.expression) ||
    expr.expression.name.text !== 'map'
  ) {
    return undefined;
  }
  const cb = expr.arguments[0];
  if (!cb || (!ts.isArrowFunction(cb) && !ts.isFunctionExpression(cb))) return undefined;
  const param = cb.parameters[0];
  if (!param || !ts.isIdentifier(param.name)) return undefined;

  let body: ts.Expression | undefined;
  if (ts.isBlock(cb.body)) {
    const ret = cb.body.statements.find(ts.isReturnStatement);
    body = ret?.expression;
  } else {
    body = cb.body;
  }
  if (!body) return undefined;

  // Iterate the base collection: strip chained `.filter(...)`, `.slice(...)`, etc.
  // (their callbacks contain arrows that have no Latte representation).
  let list = expr.expression.expression;
  while (ts.isCallExpression(list) && ts.isPropertyAccessExpression(list.expression)) {
    list = list.expression.expression;
  }

  return { list, itemVar: param.name.text, body: unwrap(body) };
}

function buildElement(
  tag: string,
  attributes: ts.JsxAttributes,
  children: Node[],
  selfClosing: boolean,
  ctx: JsxContext,
): ElementNode {
  let classExpr: ClassExpr | undefined;
  let hadSpread = false;
  const attrs: Attr[] = [];

  for (const attr of attributes.properties) {
    if (ts.isJsxSpreadAttribute(attr)) {
      hadSpread = true; // {...props}: content/children flow through props
      continue;
    }
    if (!ts.isJsxAttribute(attr)) continue;
    const name = attr.name.getText();

    if (name === 'className') {
      classExpr = buildClassExpr(attr.initializer, ctx);
      continue;
    }
    if (name === 'ref' || name === 'key' || name === 'asChild' || /^on[A-Z]/.test(name)) continue;

    // Inline `style={{…}}` -> a real `style="…"` string with Latte interpolation.
    if (name === 'style') {
      const styleAttr = buildStyleAttr(attr.initializer);
      if (styleAttr) attrs.push({ name: 'style', value: styleAttr });
      continue;
    }
    // Other React-runtime constructs (Provider value={{…}}, dangerouslySetInnerHTML,
    // render-prop arrows) are not HTML attributes — drop them.
    if (isRuntimeAttr(attr.initializer)) continue;

    attrs.push({ name, value: attrValue(attr.initializer) });
  }

  // `{...props}` -> generic attribute pass-through via Latte's n:attr, so any HTML
  // attribute (placeholder, name, disabled, value, …) can be passed in `$attrs`.
  if (hadSpread) {
    attrs.push({ name: 'n:attr', value: { kind: 'static', value: '$attrs' } });
  }

  // `{...props}` carries children; expose a content slot so the element is usable
  // as a container even when shadcn rendered it self-closing. When `children` is
  // destructured it is rendered explicitly elsewhere and owns the slot, so the
  // spread adds none. Void elements (input, img, …) cannot hold content either.
  if (hadSpread && !ctx.childrenDestructured && !containsSlot(children) && !isVoidElement(tag)) {
    children = [...children, { type: 'slot', name: 'content' }];
    selfClosing = false;
  }
  if (isVoidElement(tag)) {
    children = [];
    selfClosing = true;
  }

  return { type: 'element', tag, classExpr, attrs, children, selfClosing };
}

function containsSlot(nodes: Node[]): boolean {
  return nodes.some((n) => n.type === 'slot');
}

/** Strip `as T`, `satisfies T` and parentheses to reach the underlying expression. */
function unwrapCasts(e: ts.Expression): ts.Expression {
  while (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e)) {
    e = e.expression;
  }
  return e;
}

/** Object/arrow/template attribute values are React runtime, not HTML — drop them. */
function isRuntimeAttr(init: ts.JsxAttribute['initializer']): boolean {
  if (!init || !ts.isJsxExpression(init) || !init.expression) return false;
  const e = unwrapCasts(init.expression);
  return (
    ts.isObjectLiteralExpression(e) ||
    ts.isArrowFunction(e) ||
    ts.isFunctionExpression(e) ||
    ts.isTemplateExpression(e)
  );
}

/** Convert an inline `style` attribute (object literal or string) to a style AttrValue. */
function buildStyleAttr(init: ts.JsxAttribute['initializer']): AttrValue | undefined {
  if (init && ts.isStringLiteral(init)) return { kind: 'static', value: init.text };
  if (!init || !ts.isJsxExpression(init) || !init.expression) return undefined;
  const e = unwrapCasts(init.expression);
  if (ts.isStringLiteralLike(e)) return { kind: 'static', value: e.text };
  if (!ts.isObjectLiteralExpression(e)) return undefined;

  const parts: string[] = [];
  for (const p of e.properties) {
    if (!ts.isPropertyAssignment(p)) continue; // skip ...spread / shorthand
    const key = styleKey(p.name);
    if (key) parts.push(`${key}: ${styleValue(p.initializer)}`);
  }
  return parts.length ? { kind: 'raw', value: parts.join('; ') } : undefined;
}

function styleKey(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name)) return name.text.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  if (ts.isStringLiteralLike(name)) return name.text;
  return undefined;
}

function styleValue(expr: ts.Expression): string {
  if (ts.isStringLiteralLike(expr)) return expr.text;
  if (ts.isTemplateExpression(expr)) {
    let out = expr.head.text;
    for (const span of expr.templateSpans) out += `{${latteExpr(span.expression)}}${span.literal.text}`;
    return out;
  }
  return `{${latteExpr(expr)}}`;
}

function attrValue(init: ts.JsxAttribute['initializer']): AttrValue {
  if (!init) return { kind: 'static', value: '' };
  if (ts.isStringLiteral(init)) return { kind: 'static', value: init.text };
  if (ts.isJsxExpression(init) && init.expression) {
    return { kind: 'expr', expr: latteExpr(unwrap(init.expression)) };
  }
  return { kind: 'static', value: '' };
}

function buildClassExpr(
  init: ts.JsxAttribute['initializer'],
  ctx: JsxContext,
): ClassExpr | undefined {
  if (!init) return undefined;
  if (ts.isStringLiteral(init)) {
    return { parts: [{ kind: 'static', value: collapseWhitespace(init.text) }] };
  }
  if (ts.isJsxExpression(init) && init.expression) {
    const parts: ClassPart[] = [];
    collectClassParts(unwrap(init.expression), ctx, parts);
    return { parts };
  }
  return undefined;
}

function collectClassParts(expr: ts.Expression, ctx: JsxContext, parts: ClassPart[]): void {
  // cn(a, b, c) — flatten each argument.
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === 'cn') {
    for (const arg of expr.arguments) collectClassParts(unwrap(arg), ctx, parts);
    return;
  }

  // cva-model call, e.g. buttonVariants({ variant, size, className }).
  if (
    ts.isCallExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    ctx.cva.has(expr.expression.text)
  ) {
    const model = ctx.cva.get(expr.expression.text)!;
    const arg = expr.arguments[0];
    if (arg && ts.isObjectLiteralExpression(arg)) {
      for (const prop of arg.properties) {
        const name = propKey(prop);
        if (!name) continue;
        if (name === 'className') {
          parts.push({ kind: 'passthrough' });
        } else if (model.groups.some((g) => g.name === name)) {
          parts.push({ kind: 'variant', mapVar: mapVarName(name), paramName: name });
        }
      }
    } else {
      // bare cva() with no args -> apply all groups in declaration order.
      for (const g of model.groups) {
        parts.push({ kind: 'variant', mapVar: mapVarName(g.name), paramName: g.name });
      }
    }
    return;
  }

  if (ts.isStringLiteralLike(expr)) {
    parts.push({ kind: 'static', value: collapseWhitespace(expr.text) });
    return;
  }

  if (ts.isIdentifier(expr) && expr.text === 'className') {
    parts.push({ kind: 'passthrough' });
    return;
  }

  parts.push({ kind: 'expr', expr: latteExpr(expr) });
}

function propKey(prop: ts.ObjectLiteralElementLike): string | undefined {
  if (ts.isShorthandPropertyAssignment(prop)) return prop.name.text;
  if (ts.isPropertyAssignment(prop)) {
    if (ts.isIdentifier(prop.name) || ts.isStringLiteralLike(prop.name)) return prop.name.text;
  }
  return undefined;
}

// HTML void elements: no children, no closing tag.
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function resolveTag(rawTag: string, ctx: JsxContext): string {
  const aliased = ctx.tagAliases.get(rawTag) ?? rawTag;
  // Member-expression tags are Radix-style primitives (e.g. `AvatarPrimitive.Root`).
  // Visual-only: render them as a generic container preserving classes/structure.
  if (aliased.includes('.')) return 'div';
  return aliased;
}

function isComponentTag(tag: string): boolean {
  return /^[A-Z]/.test(tag);
}

function isVoidElement(tag: string): boolean {
  return VOID_ELEMENTS.has(tag.toLowerCase());
}

function includeNode(tag: string): Node {
  return { type: 'include', template: templateFileName(tag) };
}

/** Convert a TS expression into a Latte expression string. */
export function latteExpr(node: ts.Node): string {
  if (ts.isIdentifier(node)) return `$${node.text}`;
  if (ts.isPropertyAccessExpression(node)) {
    return `${latteExpr(node.expression)}->${node.name.text}`;
  }
  if (ts.isElementAccessExpression(node)) {
    return `${latteExpr(node.expression)}[${latteExpr(node.argumentExpression)}]`;
  }
  if (ts.isStringLiteralLike(node)) return `'${node.text.replace(/'/g, "\\'")}'`;
  if (ts.isNumericLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return `(${latteExpr(node.expression)})`;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
    return `!${latteExpr(node.operand)}`;
  }
  if (ts.isConditionalExpression(node)) {
    return `${latteExpr(node.condition)} ? ${latteExpr(node.whenTrue)} : ${latteExpr(node.whenFalse)}`;
  }
  if (ts.isBinaryExpression(node)) {
    // JS `a || b` returns the value; PHP `||` returns a bool. Use elvis `?:`,
    // which matches JS value-fallback semantics and works in boolean context too.
    const op = node.operatorToken.kind === ts.SyntaxKind.BarBarToken ? '?:' : node.operatorToken.getText();
    return `${latteExpr(node.left)} ${op} ${latteExpr(node.right)}`;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  if (node.kind === ts.SyntaxKind.NullKeyword) return 'null';
  return node.getText();
}
