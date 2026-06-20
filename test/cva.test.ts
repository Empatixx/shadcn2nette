import { describe, test, expect } from 'vitest';
import { extractCvaModels } from '../src/parser/cva.js';

const BUTTON_CVA = `
import { cva } from "class-variance-authority";
const buttonVariants = cva(
  "inline-flex items-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border border-input",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-10 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
`;

describe('extractCvaModels', () => {
  test('extracts base classes, variant groups, options and defaults', () => {
    const models = extractCvaModels(BUTTON_CVA);
    expect(models).toHaveLength(1);

    const m = models[0];
    expect(m.name).toBe('buttonVariants');
    expect(m.base).toBe('inline-flex items-center rounded-md');
    expect(m.groups.map((g) => g.name)).toEqual(['variant', 'size']);

    const variant = m.groups.find((g) => g.name === 'variant')!;
    expect(variant.options).toEqual({
      default: 'bg-primary text-primary-foreground',
      destructive: 'bg-destructive text-white',
      outline: 'border border-input',
    });
    expect(variant.default).toBe('default');

    const size = m.groups.find((g) => g.name === 'size')!;
    expect(size.options.lg).toBe('h-10 px-8');
    expect(size.default).toBe('default');
  });

  test('returns an empty array when there is no cva call', () => {
    expect(extractCvaModels('const x = 1;')).toEqual([]);
  });

  test('handles a cva call with only a base string and no variants', () => {
    const models = extractCvaModels('const v = cva("text-sm font-medium");');
    expect(models).toHaveLength(1);
    expect(models[0].base).toBe('text-sm font-medium');
    expect(models[0].groups).toEqual([]);
  });
});
