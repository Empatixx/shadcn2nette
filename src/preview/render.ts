/**
 * Minimal renderer for the Latte subset that shadcn2nette emits.
 *
 * Supports: {default}, {var}, {$expr}, {if}/{else}/{/if}, {foreach}/{/foreach},
 * {include}, {embed}/{block}/{/embed} and {* comments *}. Intended for the local
 * preview demo so the generated templates render with a single bun command.
 */

export type Loader = (name: string) => string;

type Tok = { t: 'text'; v: string } | { t: 'tag'; v: string };

type Node =
  | { k: 'text'; v: string }
  | { k: 'print'; expr: string }
  | { k: 'default'; expr: string }
  | { k: 'var'; expr: string }
  | { k: 'include'; arg: string }
  | { k: 'if'; cond: string; then: Node[]; else: Node[] }
  | { k: 'foreach'; listExpr: string; itemVar: string; body: Node[] }
  | { k: 'block'; name: string; body: Node[] }
  | { k: 'embed'; arg: string; params: Record<string, string>; blocks: Record<string, Node[]> };

interface Scope {
  [key: string]: unknown;
}

interface Ctx {
  scope: Scope;
  loader: Loader;
  blocks?: Record<string, { nodes: Node[]; ctx: Ctx }>;
}

/** Render a template source string with the given params. */
export function render(src: string, params: Scope, loader: Loader): string {
  return renderNodes(parse(lex(src)), { scope: { ...params }, loader });
}

function lex(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    if (open === -1) {
      toks.push({ t: 'text', v: src.slice(i) });
      break;
    }
    if (open > i) toks.push({ t: 'text', v: src.slice(i, open) });
    const close = src.indexOf('}', open + 1);
    if (close === -1) {
      toks.push({ t: 'text', v: src.slice(open) });
      break;
    }
    toks.push({ t: 'tag', v: src.slice(open + 1, close).trim() });
    i = close + 1;
  }
  return toks;
}

function parse(toks: Tok[]): Node[] {
  let pos = 0;

  function parseUntil(stop: (tag: string) => boolean): Node[] {
    const nodes: Node[] = [];
    while (pos < toks.length) {
      const tk = toks[pos];
      if (tk.t === 'text') {
        nodes.push({ k: 'text', v: tk.v });
        pos++;
        continue;
      }
      const body = tk.v;
      if (stop(body)) return nodes;
      pos++;

      if (body.startsWith('*')) continue;
      if (body.startsWith('$')) nodes.push({ k: 'print', expr: body });
      else if (body.startsWith('default ')) nodes.push({ k: 'default', expr: body.slice(8) });
      else if (body.startsWith('var ')) nodes.push({ k: 'var', expr: body.slice(4) });
      else if (body.startsWith('include ')) nodes.push({ k: 'include', arg: body.slice(8).trim() });
      else if (body.startsWith('if ')) {
        const cond = body.slice(3);
        const thenNodes = parseUntil((b) => b === '/if' || b === 'else');
        let elseNodes: Node[] = [];
        if (toks[pos]?.v === 'else') {
          pos++;
          elseNodes = parseUntil((b) => b === '/if');
        }
        if (toks[pos]?.v === '/if') pos++;
        nodes.push({ k: 'if', cond, then: thenNodes, else: elseNodes });
      } else if (body.startsWith('foreach ')) {
        const [listExpr, itemVar] = splitForeach(body.slice(8));
        const inner = parseUntil((b) => b === '/foreach');
        if (toks[pos]?.v === '/foreach') pos++;
        nodes.push({ k: 'foreach', listExpr, itemVar, body: inner });
      } else if (body.startsWith('block ')) {
        const name = body.slice(6).trim();
        const inner = parseUntil((b) => b === '/block');
        if (toks[pos]?.v === '/block') pos++;
        nodes.push({ k: 'block', name, body: inner });
      } else if (body.startsWith('embed ')) {
        const { arg, params } = parseEmbedHead(body.slice(6));
        const inner = parseUntil((b) => b === '/embed');
        if (toks[pos]?.v === '/embed') pos++;
        const blocks: Record<string, Node[]> = {};
        for (const n of inner) if (n.k === 'block') blocks[n.name] = n.body;
        nodes.push({ k: 'embed', arg, params, blocks });
      }
    }
    return nodes;
  }

  return parseUntil(() => false);
}

function renderNodes(nodes: Node[], ctx: Ctx): string {
  let out = '';
  for (const n of nodes) {
    switch (n.k) {
      case 'text':
        out += n.v;
        break;
      case 'print':
        out += str(evalExpr(n.expr, ctx.scope));
        break;
      case 'default': {
        const [name, val] = splitAssign(n.expr);
        if (ctx.scope[name] === undefined) ctx.scope[name] = evalVarValue(val, ctx.scope);
        break;
      }
      case 'var': {
        const [name, val] = splitAssign(n.expr);
        ctx.scope[name] = evalVarValue(val, ctx.scope);
        break;
      }
      case 'include':
        out += renderFile(unquote(n.arg), { ...ctx.scope }, undefined, ctx.loader);
        break;
      case 'if':
        out += evalExpr(n.cond, ctx.scope) ? renderNodes(n.then, ctx) : renderNodes(n.else, ctx);
        break;
      case 'foreach': {
        const list = evalExpr(n.listExpr, ctx.scope);
        const saved = ctx.scope[n.itemVar];
        for (const item of Array.isArray(list) ? list : []) {
          ctx.scope[n.itemVar] = item;
          out += renderNodes(n.body, ctx);
        }
        ctx.scope[n.itemVar] = saved;
        break;
      }
      case 'block': {
        const ov = ctx.blocks?.[n.name];
        out += ov ? renderNodes(ov.nodes, ov.ctx) : renderNodes(n.body, ctx);
        break;
      }
      case 'embed': {
        const childScope: Scope = {};
        for (const [k, v] of Object.entries(n.params)) childScope[k] = evalExpr(v, ctx.scope);
        const blocks: Ctx['blocks'] = {};
        for (const [name, body] of Object.entries(n.blocks)) blocks[name] = { nodes: body, ctx };
        out += renderFile(unquote(n.arg), childScope, blocks, ctx.loader);
        break;
      }
    }
  }
  return out;
}

function renderFile(file: string, scope: Scope, blocks: Ctx['blocks'], loader: Loader): string {
  return renderNodes(parse(lex(loader(file))), { scope, loader, blocks });
}

function splitAssign(expr: string): [string, string] {
  const m = expr.match(/^\$([A-Za-z_]\w*)\s*=\s*([\s\S]*)$/);
  return m ? [m[1], m[2].trim()] : [expr.trim(), ''];
}

function splitForeach(s: string): [string, string] {
  const [list, item] = s.split(/\s+as\s+/);
  return [list.trim(), item.trim().replace(/^\$/, '')];
}

function parseEmbedHead(s: string): { arg: string; params: Record<string, string> } {
  s = s.trim();
  const q = s[0];
  let arg = '';
  let rest = '';
  if (q === "'" || q === '"') {
    const end = s.indexOf(q, 1);
    arg = s.slice(1, end);
    rest = s.slice(end + 1).replace(/^\s*,?\s*/, '');
  } else {
    const c = s.indexOf(',');
    arg = (c === -1 ? s : s.slice(0, c)).trim();
    rest = c === -1 ? '' : s.slice(c + 1);
  }
  const params: Record<string, string> = {};
  for (const part of rest.split(',')) {
    const ci = part.indexOf(':');
    if (ci !== -1) params[part.slice(0, ci).trim()] = part.slice(ci + 1).trim();
  }
  return { arg, params };
}

function evalVarValue(val: string, scope: Scope): unknown {
  const t = val.trim();
  if (t.startsWith('[')) {
    const obj = `{${t.slice(1, t.lastIndexOf(']')).replace(/=>/g, ':')}}`;
    return evalExpr(obj, scope);
  }
  return evalExpr(t, scope);
}

function evalExpr(expr: string, scope: Scope): unknown {
  const js = String(expr)
    .replace(/->/g, '.')
    .replace(/\$([A-Za-z_]\w*)/g, 'scope.$1');
  try {
    return Function('scope', `"use strict"; return (${js});`)(scope);
  } catch {
    return '';
  }
}

function unquote(s: string): string {
  return s.trim().replace(/^['"]|['"]$/g, '');
}

function str(v: unknown): string {
  return v === undefined || v === null ? '' : String(v);
}
