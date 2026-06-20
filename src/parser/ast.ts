/** Shared TypeScript AST helpers used across the parser. */
import ts from 'typescript';

/** Parse a TSX source string into a SourceFile (with JSX support). */
export function parseSource(source: string, fileName = 'component.tsx'): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );
}

/** Return the text of a string literal or no-substitution template literal. */
export function stringValue(node: ts.Node): string | undefined {
  if (ts.isStringLiteralLike(node)) return node.text;
  return undefined;
}

/** Resolve a property name (identifier or string key) to its text. */
export function propName(p: ts.ObjectLiteralElementLike): string | undefined {
  const n = p.name;
  if (!n) return undefined;
  if (ts.isIdentifier(n)) return n.text;
  if (ts.isStringLiteralLike(n)) return n.text;
  return undefined;
}

/** Get the initializer expression of a named property on an object literal. */
export function getProp(
  obj: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) && propName(p) === name) return p.initializer;
  }
  return undefined;
}

/** Find the first JSX element/fragment within a node's subtree (pre-order). */
export function findJsx(root: ts.Node): ts.Node | undefined {
  let found: ts.Node | undefined;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

/**
 * Collect local "tag alias" variables, i.e. the shadcn `asChild` idiom:
 *   `const Comp = asChild ? Slot : "button"`  ->  { Comp: "button" }
 *   `const Tag = "div"`                        ->  { Tag: "div" }
 * The string-literal branch wins (the other is usually a Slot/component).
 */
export function collectTagAliases(root: ts.Node): Map<string, string> {
  const aliases = new Map<string, string>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const tag = resolveTagInit(node.initializer);
      if (tag) aliases.set(node.name.text, tag);
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return aliases;
}

/**
 * Read the destructured props of a component's first parameter into a map of
 * prop name -> literal default (or undefined when there is no default).
 * Rest elements (`...props`) are skipped.
 */
export function collectDestructuredProps(root: ts.Node): Map<string, string | undefined> {
  const props = new Map<string, string | undefined>();
  let fn: ts.SignatureDeclaration | undefined;
  const find = (n: ts.Node): void => {
    if (fn) return;
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n)) {
      fn = n;
      return;
    }
    ts.forEachChild(n, find);
  };
  find(root);

  const param = fn?.parameters[0];
  if (param && ts.isObjectBindingPattern(param.name)) {
    for (const el of param.name.elements) {
      if (el.dotDotDotToken) continue;
      if (ts.isIdentifier(el.name)) props.set(el.name.text, literalValue(el.initializer));
    }
  }
  return props;
}

function literalValue(init?: ts.Expression): string | undefined {
  if (!init) return undefined;
  if (ts.isStringLiteralLike(init)) return init.text;
  if (ts.isNumericLiteral(init)) return init.text;
  if (init.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (init.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  return undefined;
}

function resolveTagInit(init: ts.Expression): string | undefined {
  if (ts.isStringLiteralLike(init)) return init.text;
  if (ts.isConditionalExpression(init)) {
    return stringValue(init.whenFalse) ?? stringValue(init.whenTrue);
  }
  return undefined;
}

/** Read an object literal whose values are string literals into a record. */
export function readStringRecord(obj: ts.ObjectLiteralExpression): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p)) {
      const key = propName(p);
      const val = stringValue(p.initializer);
      if (key !== undefined && val !== undefined) out[key] = val;
    }
  }
  return out;
}
