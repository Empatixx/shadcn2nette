/**
 * Client for the shadcn/ui component registry.
 *
 * - Index:     GET {registry}/index.json            -> RegistryItem[]
 * - Component: GET {registry}/styles/{style}/{name}.json -> { files: [{ path, content }] }
 */

export const DEFAULT_REGISTRY = 'https://ui.shadcn.com/r';
export const DEFAULT_STYLE = 'new-york';

export interface RegistryItem {
  name: string;
  type: string;
  files: string[];
  dependencies?: string[];
  registryDependencies?: string[];
}

export interface ComponentFile {
  path: string;
  content: string;
  type?: string;
  target?: string;
}

export interface ComponentSource {
  name: string;
  files: ComponentFile[];
  dependencies?: string[];
}

export interface RegistryOptions {
  registry?: string;
  style?: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Registry request failed (${res.status} ${res.statusText ?? ''}): ${url}`);
  }
  return (await res.json()) as T;
}

export async function fetchIndex(opts: RegistryOptions = {}): Promise<RegistryItem[]> {
  const registry = opts.registry ?? DEFAULT_REGISTRY;
  return getJson<RegistryItem[]>(`${registry}/index.json`);
}

export async function fetchComponent(
  name: string,
  opts: RegistryOptions = {},
): Promise<ComponentSource> {
  const registry = opts.registry ?? DEFAULT_REGISTRY;
  const style = opts.style ?? DEFAULT_STYLE;
  const url = `${registry}/styles/${style}/${name}.json`;
  try {
    return await getJson<ComponentSource>(url);
  } catch (err) {
    throw new Error(`Could not fetch component "${name}" from ${url}: ${(err as Error).message}`);
  }
}
