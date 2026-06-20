import { describe, test, expect, vi, afterEach } from 'vitest';
import { transpileComponent, listComponents } from '../src/transpile.js';
import { DEFAULT_REGISTRY, DEFAULT_STYLE } from '../src/registry.js';

function mockFetch(map: Record<string, unknown>) {
  const fn = vi.fn(async (url: string | URL) => {
    const key = String(url);
    if (key in map) return { ok: true, status: 200, json: async () => map[key] } as Response;
    return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

const BUTTON_TSX = `
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex", {
  variants: { variant: { default: "bg-primary", outline: "border" } },
  defaultVariants: { variant: "default" },
});
const Button = React.forwardRef(({ className, variant, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, className }))} ref={ref} {...props} />
));
export { Button };
`;

const CARD_TSX = `
import { cn } from "@/lib/utils";
const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div className={cn("rounded-xl", className)} {...props} />
));
const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 className={cn("font-semibold", className)} {...props} />
));
export { Card, CardTitle };
`;

describe('transpileComponent', () => {
  test('fetches, parses and emits a component as .phtml', async () => {
    const url = `${DEFAULT_REGISTRY}/styles/${DEFAULT_STYLE}/button.json`;
    mockFetch({ [url]: { name: 'button', files: [{ path: 'ui/button.tsx', content: BUTTON_TSX }] } });

    const results = await transpileComponent('button');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('button');
    expect(results[0].reactName).toBe('Button');
    expect(results[0].phtml).toContain("{default $variant = 'default'}");
    expect(results[0].phtml).toContain('<button class=');
  });

  test('emits one template per exported component', async () => {
    const url = `${DEFAULT_REGISTRY}/styles/${DEFAULT_STYLE}/card.json`;
    mockFetch({ [url]: { name: 'card', files: [{ path: 'ui/card.tsx', content: CARD_TSX }] } });

    const results = await transpileComponent('card');

    expect(results.map((r) => r.name)).toEqual(['card', 'card-title']);
  });
});

describe('listComponents', () => {
  test('returns names of registry:ui items only', async () => {
    mockFetch({
      [`${DEFAULT_REGISTRY}/index.json`]: [
        { name: 'button', type: 'registry:ui', files: [] },
        { name: 'use-toast', type: 'registry:hook', files: [] },
        { name: 'card', type: 'registry:ui', files: [] },
      ],
    });

    expect(await listComponents()).toEqual(['button', 'card']);
  });
});
