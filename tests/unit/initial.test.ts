import { describe, expect, it } from 'vitest';
import { initial } from '@/components/layout/Avatar';

describe('initial', () => {
  it.each([
    ['Ana Marquez', 'A'],
    ['  luis', 'L'],
    ['', '?'],
  ])('"%s" → "%s"', (name, expected) => {
    expect(initial(name)).toBe(expected);
  });
});
