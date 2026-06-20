/** Orchestration: fetch a component from the registry, parse it, emit .phtml. */
import { fetchComponent, fetchIndex, type RegistryOptions } from './registry.js';
import { parseComponentSource } from './parser/parseComponent.js';
import { extractCvaModels } from './parser/cva.js';
import { emitComponent } from './emit/latte.js';
import { applyAlpine } from './alpine/recipes.js';
import type { VariantModel } from './ir.js';

export type TranspileOptions = RegistryOptions;

export interface TranspiledTemplate {
  /** kebab-case template name, used as the `.phtml` file stem. */
  name: string;
  /** original React export name. */
  reactName: string;
  /** rendered Latte `.phtml` content. */
  phtml: string;
}

/** Transpile a single registry component into one or more `.phtml` templates. */
export async function transpileComponent(
  name: string,
  opts: TranspileOptions = {},
  externalCva?: Map<string, VariantModel>,
): Promise<TranspiledTemplate[]> {
  const source = await fetchComponent(name, opts);
  return source.files.flatMap((file) => transpileSource(file.content, externalCva));
}

/** Transpile one TSX source string (with optional cross-component cva models). */
export function transpileSource(
  source: string,
  externalCva?: Map<string, VariantModel>,
): TranspiledTemplate[] {
  // Interactivity is always emitted — the templates ship functional, not just visual.
  return applyAlpine(parseComponentSource(source, externalCva)).map((comp) => ({
    name: comp.name,
    reactName: comp.reactName,
    phtml: emitComponent(comp),
  }));
}

/**
 * Transpile every `registry:ui` component, sharing a global cva registry so
 * cross-component variants (buttonVariants used by alert-dialog, etc.) resolve.
 */
export async function transpileAll(
  opts: TranspileOptions = {},
): Promise<{ component: string; templates: TranspiledTemplate[] }[]> {
  const names = await listComponents(opts);
  const fetched = await Promise.all(
    names.map((name) =>
      fetchComponent(name, opts)
        .then((s) => ({ name, source: s.files.map((f) => f.content).join('\n') }))
        .catch(() => null),
    ),
  );
  const sources = fetched.filter((s): s is { name: string; source: string } => s !== null);

  const cva = new Map<string, VariantModel>();
  for (const { source } of sources) for (const m of extractCvaModels(source)) cva.set(m.name, m);

  return sources.map(({ name, source }) => ({ component: name, templates: transpileSource(source, cva) }));
}

/** List the names of all `registry:ui` components in the registry index. */
export async function listComponents(opts: RegistryOptions = {}): Promise<string[]> {
  const index = await fetchIndex(opts);
  return index.filter((i) => i.type === 'registry:ui').map((i) => i.name);
}
