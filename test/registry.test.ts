import { describe, test, expect, vi, afterEach } from 'vitest';
import {
  fetchIndex,
  fetchComponent,
  DEFAULT_REGISTRY,
  DEFAULT_STYLE,
} from '../src/registry.js';

function mockFetch(map: Record<string, unknown>) {
  const fn = vi.fn(async (url: string | URL) => {
    const key = String(url);
    if (key in map) {
      return { ok: true, status: 200, json: async () => map[key] } as Response;
    }
    return { ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchIndex', () => {
  test('fetches and parses the registry index', async () => {
    const items = [
      { name: 'button', type: 'registry:ui', files: ['ui/button.tsx'] },
      { name: 'card', type: 'registry:ui', files: ['ui/card.tsx'] },
    ];
    const fetchMock = mockFetch({ [`${DEFAULT_REGISTRY}/index.json`]: items });

    const result = await fetchIndex();

    expect(result).toEqual(items);
    expect(fetchMock).toHaveBeenCalledWith(`${DEFAULT_REGISTRY}/index.json`);
  });
});

describe('fetchComponent', () => {
  test('fetches a component from the default style and returns its TSX files', async () => {
    const payload = {
      name: 'button',
      dependencies: ['@radix-ui/react-slot'],
      files: [
        { path: 'ui/button.tsx', content: 'export const Button = () => null', type: 'registry:ui' },
      ],
    };
    const url = `${DEFAULT_REGISTRY}/styles/${DEFAULT_STYLE}/button.json`;
    const fetchMock = mockFetch({ [url]: payload });

    const result = await fetchComponent('button');

    expect(result.name).toBe('button');
    expect(result.files[0].content).toContain('export const Button');
    expect(fetchMock).toHaveBeenCalledWith(url);
  });

  test('respects a custom style and registry base URL', async () => {
    const url = 'https://example.com/r/styles/default/badge.json';
    const fetchMock = mockFetch({
      [url]: { name: 'badge', files: [{ path: 'ui/badge.tsx', content: 'x' }] },
    });

    await fetchComponent('badge', { registry: 'https://example.com/r', style: 'default' });

    expect(fetchMock).toHaveBeenCalledWith(url);
  });

  test('throws a helpful error on a 404', async () => {
    mockFetch({});
    await expect(fetchComponent('does-not-exist')).rejects.toThrow(/does-not-exist/);
  });
});
