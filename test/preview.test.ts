import { describe, test, expect } from 'vitest';
import { render } from '../src/preview/render.js';

const noLoader = () => '';

describe('render — variables', () => {
  test('prints a variable and applies a default', () => {
    expect(render("{default $x = 'hi'}<p>{$x}</p>", {}, noLoader)).toBe('<p>hi</p>');
  });

  test('a provided param overrides the default', () => {
    expect(render("{default $x = 'hi'}<p>{$x}</p>", { x: 'yo' }, noLoader)).toBe('<p>yo</p>');
  });

  test('declares an assoc array and looks it up by key', () => {
    const src = "{var $m = ['a' => '1', 'b' => '2']}<i>{$m[$k] ?? ''}</i>";
    expect(render(src, { k: 'b' }, noLoader)).toBe('<i>2</i>');
    expect(render(src, { k: 'zzz' }, noLoader)).toBe('<i></i>');
  });
});

describe('render — control flow', () => {
  test('renders the matching if/else branch', () => {
    const src = '{if $on}<a>y</a>{else}<b>n</b>{/if}';
    expect(render(src, { on: true }, noLoader)).toBe('<a>y</a>');
    expect(render(src, { on: false }, noLoader)).toBe('<b>n</b>');
  });

  test('iterates with foreach', () => {
    const src = '{foreach $items as $i}<li>{$i->n}</li>{/foreach}';
    expect(render(src, { items: [{ n: 'x' }, { n: 'y' }] }, noLoader)).toBe('<li>x</li><li>y</li>');
  });
});

describe('render — embed & block', () => {
  test('embeds a template and fills its content block', () => {
    const loader = (name: string) =>
      name === 'btn.phtml'
        ? '{default $variant = \'default\'}<button data-v="{$variant}">{block content}{/block}</button>'
        : '';
    const src = "{embed 'btn.phtml', variant: 'x'}{block content}Hi{/block}{/embed}";
    expect(render(src, {}, loader)).toBe('<button data-v="x">Hi</button>');
  });

  test('supports a nested embed inside a content block', () => {
    const files: Record<string, string> = {
      'outer.phtml': '<div>{block content}{/block}</div>',
      'inner.phtml': '<span>{block content}{/block}</span>',
    };
    const loader = (name: string) => files[name] ?? '';
    const src =
      "{embed 'outer.phtml'}{block content}{embed 'inner.phtml'}{block content}deep{/block}{/embed}{/block}{/embed}";
    expect(render(src, {}, loader)).toBe('<div><span>deep</span></div>');
  });
});

describe('render — comments', () => {
  test('skips Latte comments', () => {
    expect(render('{* hi *}<p>x</p>', {}, noLoader)).toBe('<p>x</p>');
  });
});
