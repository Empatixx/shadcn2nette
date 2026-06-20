/** Naming helpers shared between the parser and the Latte emitter. */

/** Latte variable name holding a variant group's option->class map. */
export function mapVarName(group: string): string {
  return `${group}Classes`;
}

/** Convert a React export name (PascalCase) to a kebab-case template stem. */
export function kebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/** Template file name for a React component, e.g. `CardHeader` -> `card-header.phtml`. */
export function templateFileName(reactName: string): string {
  return `${kebabCase(reactName)}.phtml`;
}

/** Collapse runs of whitespace and trim, for class strings and text nodes. */
export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
