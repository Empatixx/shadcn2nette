/** Orchestration: fetch a component from the registry, parse it, emit .phtml. */
import { fetchComponent, fetchIndex, type RegistryOptions } from './registry.js';
import { parseComponentSource } from './parser/parseComponent.js';
import { emitComponent } from './emit/latte.js';

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
  opts: RegistryOptions = {},
): Promise<TranspiledTemplate[]> {
  const source = await fetchComponent(name, opts);
  const out: TranspiledTemplate[] = [];
  for (const file of source.files) {
    for (const comp of parseComponentSource(file.content)) {
      out.push({ name: comp.name, reactName: comp.reactName, phtml: emitComponent(comp) });
    }
  }
  return out;
}

/** List the names of all `registry:ui` components in the registry index. */
export async function listComponents(opts: RegistryOptions = {}): Promise<string[]> {
  const index = await fetchIndex(opts);
  return index.filter((i) => i.type === 'registry:ui').map((i) => i.name);
}
