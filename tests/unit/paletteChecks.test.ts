import { describe, expect, it } from 'vitest';
import { DEFAULT_PALETTE, isValidPrefix } from '@/features/settings/defaults';
import { paletteChecks } from '@/features/settings/paletteChecks';

describe('paletteChecks', () => {
  it('la paleta original pasa todas las combinaciones', () => {
    const failing = paletteChecks(DEFAULT_PALETTE).filter((c) => !c.ok);
    expect(failing).toEqual([]);
  });
  it('un menú claro con texto blanco falla y dice por qué', () => {
    const bad = ['#F5E663', ...DEFAULT_PALETTE.slice(1)];
    const failing = paletteChecks(bad).filter((c) => !c.ok);
    expect(failing.map((c) => c.label)).toContain('Texto blanco sobre el color 1 (menú y botones)');
    expect(failing[0].ratio).toBeLessThan(4.5);
  });
});

describe('isValidPrefix', () => {
  it.each([['MC', true], ['FL2', true], ['ABCDE', true], ['', false], ['ABCDEF', false], ['mc', false], ['M-C', false]])(
    '%s → %s', (value, ok) => expect(isValidPrefix(value)).toBe(ok),
  );
});
