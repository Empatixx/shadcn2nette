/** Orchestrate a full TSX source file into Component IR (one per exported component). */
import ts from 'typescript';
import type { Component, Node, Param, VariantModel } from '../ir.js';
import { parseSource, findJsx, collectTagAliases, collectDestructuredProps } from './ast.js';
import { extractCvaModels } from './cva.js';
import { convertNode } from './jsx.js';
import { kebabCase } from '../util/classes.js';

export function parseComponentSource(source: string): Component[] {
  const sf = parseSource(source);
  const cva = new Map(extractCvaModels(source).map((m) => [m.name, m]));
  const out: Component[] = [];

  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          isPascal(decl.name.text) &&
          decl.initializer &&
          findJsx(decl.initializer)
        ) {
          out.push(buildComponent(decl.name.text, decl.initializer, cva));
        }
      }
    } else if (
      ts.isFunctionDeclaration(stmt) &&
      stmt.name &&
      isPascal(stmt.name.text) &&
      findJsx(stmt)
    ) {
      out.push(buildComponent(stmt.name.text, stmt, cva));
    }
  }

  return out;
}

function buildComponent(
  reactName: string,
  node: ts.Node,
  cva: Map<string, VariantModel>,
): Component {
  const jsx = findJsx(node);
  const tagAliases = collectTagAliases(node);
  const nodes = jsx ? convertNode(jsx, { cva, tagAliases }) : [];
  const variants = [...cva.values()].find((m) => referencesModel(node, m.name));
  const props = collectDestructuredProps(node);
  return {
    name: kebabCase(reactName),
    reactName,
    params: deriveParams(variants, nodes, props),
    variants,
    nodes,
  };
}

function deriveParams(
  model: VariantModel | undefined,
  nodes: Node[],
  props: Map<string, string | undefined>,
): Param[] {
  const params: Param[] = [];
  const reserved = new Set<string>(['class']);

  if (model) {
    for (const g of model.groups) {
      params.push({
        name: g.name,
        kind: 'variant',
        options: Object.keys(g.options),
        default: g.default,
      });
      reserved.add(g.name);
    }
  }

  // Referenced props (not variants/class/loop vars) become data params so the
  // template declares a default and never hits an undefined Latte variable.
  const refs = new Set<string>();
  const loopVars = new Set<string>();
  collectRefs(nodes, refs, loopVars);
  for (const name of [...refs].sort()) {
    if (reserved.has(name) || loopVars.has(name)) continue;
    const def = props.get(name);
    params.push(def !== undefined ? { name, kind: 'data', default: def } : { name, kind: 'data' });
  }

  if (hasPassthrough(nodes)) {
    params.push({ name: 'class', kind: 'class', default: '' });
  }
  return params;
}

function collectRefs(nodes: Node[], refs: Set<string>, loopVars: Set<string>): void {
  for (const n of nodes) {
    switch (n.type) {
      case 'interp':
        addVars(n.expr, refs);
        break;
      case 'element':
        for (const a of n.attrs) if (a.value.kind === 'expr') addVars(a.value.expr, refs);
        if (n.classExpr) {
          for (const p of n.classExpr.parts) if (p.kind === 'expr') addVars(p.expr, refs);
        }
        collectRefs(n.children, refs, loopVars);
        break;
      case 'if':
        addVars(n.cond, refs);
        collectRefs(n.then, refs, loopVars);
        collectRefs(n.else ?? [], refs, loopVars);
        break;
      case 'foreach':
        addVars(n.listExpr, refs);
        loopVars.add(n.itemVar);
        collectRefs(n.body, refs, loopVars);
        break;
      default:
        break;
    }
  }
}

function addVars(expr: string, out: Set<string>): void {
  for (const m of expr.matchAll(/\$([A-Za-z_]\w*)/g)) out.add(m[1]);
}

function hasPassthrough(nodes: Node[]): boolean {
  return nodes.some((n) => {
    if (n.type === 'element') {
      if (n.classExpr?.parts.some((p) => p.kind === 'passthrough')) return true;
      return hasPassthrough(n.children);
    }
    if (n.type === 'if') return hasPassthrough(n.then) || hasPassthrough(n.else ?? []);
    if (n.type === 'foreach') return hasPassthrough(n.body);
    return false;
  });
}

function referencesModel(node: ts.Node, modelName: string): boolean {
  return node.getText().includes(`${modelName}(`);
}

function isPascal(name: string): boolean {
  return /^[A-Z]/.test(name);
}
