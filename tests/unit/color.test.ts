import { describe, expect, it } from 'vitest';
import { contrastRatio, mixColors, readableTextColor } from '@/utils/color';

describe('contrastRatio', () => {
  it('negro sobre blanco es 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });
  it('es simétrico', () => {
    expect(contrastRatio('#1B4079', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#1B4079'), 5);
  });
});

describe('readableTextColor', () => {
  it.each([
    ['#1B4079', '#FFFFFF'],
    ['#4D7C8A', '#FFFFFF'],
    ['#CBDF90', '#000000'],
    ['#8FAD88', '#000000'],
  ])('%s → %s', (bg, text) => {
    expect(readableTextColor(bg)).toBe(text);
  });
  it('siempre da al menos 4.5:1', () => {
    for (const bg of ['#FF0000', '#00FF00', '#0000FF', '#777777', '#FFD700', '#C2410C', '#4B7D87', '#C36E64']) {
      expect(contrastRatio(readableTextColor(bg), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('mixColors', () => {
  it('mezcla como color-mix en srgb', () => {
    expect(mixColors('#FFFFFF', '#000000', 50)).toBe('#808080');
    expect(mixColors('#1B4079', '#FFFFFF', 100)).toBe('#1B4079');
  });
});
