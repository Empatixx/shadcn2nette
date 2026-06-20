/**
 * Intermediate representation (IR) for the shadcn -> Nette (.phtml/Latte) transpiler.
 *
 * The pipeline is: TSX -> AST (TypeScript) -> IR -> .phtml (Latte).
 * The IR is the seam that decouples parsing from emission, so each side can be
 * tested in isolation and an alternative emitter (e.g. `.latte`) could be added later.
 */

/** A single transpiled component, rendered to one `.phtml` template. */
export interface Component {
  /** kebab-case template name, e.g. `button`, `card-header`. */
  name: string;
  /** original React export name, e.g. `Button`, `CardHeader`. */
  reactName: string;
  /** template parameters (variants, passthrough class, data, slot). */
  params: Param[];
  /** cva variant model, present when the component uses `cva()`. */
  variants?: VariantModel;
  /** rendered markup as a list of top-level nodes (a React fragment yields >1). */
  nodes: Node[];
}

export type ParamKind = 'variant' | 'data' | 'slot' | 'class';

export interface Param {
  /** parameter name as used in the template, e.g. `variant`, `size`, `class`. */
  name: string;
  kind: ParamKind;
  /** allowed values, for variant params. */
  options?: string[];
  /** default value (string literal, unquoted). */
  default?: string;
}

/** Model extracted from a `cva(base, { variants, defaultVariants })` call. */
export interface VariantModel {
  /** local variable the cva result was assigned to, e.g. `buttonVariants`. */
  name: string;
  /** base class string always applied. */
  base: string;
  groups: VariantGroup[];
}

export interface VariantGroup {
  /** group name, e.g. `variant`, `size`. */
  name: string;
  /** option value -> Tailwind class string. */
  options: Record<string, string>;
  /** default option from `defaultVariants`, if any. */
  default?: string;
}

export type Node =
  | ElementNode
  | TextNode
  | InterpNode
  | IfNode
  | ForeachNode
  | IncludeNode
  | SlotNode
  | RawNode;

export interface ElementNode {
  type: 'element';
  tag: string;
  /** structured class attribute, when the element carries classes. */
  classExpr?: ClassExpr;
  attrs: Attr[];
  children: Node[];
  selfClosing?: boolean;
}

export interface Attr {
  /** HTML attribute name (e.g. `type`, `href`, `aria-hidden`). */
  name: string;
  value: AttrValue;
}

export type AttrValue =
  | { kind: 'static'; value: string }
  /** a Latte expression, stored without the surrounding braces. */
  | { kind: 'expr'; expr: string };

/**
 * A class attribute, modelled as an ordered list of parts that the emitter
 * concatenates with spaces, e.g.:
 *   `class="{$base} {$variantClasses[$variant] ?? ''} {$class}"`.
 */
export interface ClassExpr {
  parts: ClassPart[];
}

export type ClassPart =
  /** literal Tailwind classes always present. */
  | { kind: 'static'; value: string }
  /** a variant-group lookup, emitted as `{$mapVar[$paramName] ?? ''}`. */
  | { kind: 'variant'; mapVar: string; paramName: string }
  /** an arbitrary Latte expression, emitted as `{$expr}`. */
  | { kind: 'expr'; expr: string }
  /** the passthrough `$class` parameter, appended verbatim. */
  | { kind: 'passthrough' };

export interface TextNode {
  type: 'text';
  value: string;
}

/** `{$expr}` interpolation. */
export interface InterpNode {
  type: 'interp';
  expr: string;
}

/** Raw Latte passthrough, emitted verbatim. */
export interface RawNode {
  type: 'raw';
  value: string;
}

/** `{if $cond} ... {else} ... {/if}` */
export interface IfNode {
  type: 'if';
  cond: string;
  then: Node[];
  else?: Node[];
}

/** `{foreach $listExpr as $itemVar} ... {/foreach}` */
export interface ForeachNode {
  type: 'foreach';
  listExpr: string;
  itemVar: string;
  body: Node[];
}

/** `{include 'template.phtml', ...args}` — composition of sub-components. */
export interface IncludeNode {
  type: 'include';
  template: string;
  args?: Record<string, string>;
}

/** Content slot for `children`, emitted as `{include content}` by default. */
export interface SlotNode {
  type: 'slot';
  name: string;
}
