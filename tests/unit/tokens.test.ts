import { describe, expect, it } from 'vitest';
import tokens from '@/styles/tokens.css?raw';

const PALETTE = ['#1B4079', '#4D7C8A', '#7F9C96', '#8FAD88', '#CBDF90'];

describe('tokens de la paleta', () => {
  it.each(PALETTE.map((hex, i) => [i + 1, hex]))('--brand-%i es %s', (n, hex) => {
    expect(tokens).toMatch(new RegExp(`--brand-${n}:\\s*${hex};`, 'i'));
  });

  it('los botones principales y el foco usan el azul de marca', () => {
    expect(tokens).toMatch(/--color-action-primary:\s*var\(--brand-1\);/);
    expect(tokens).toMatch(/--focus-ring-color:\s*var\(--brand-1\);/);
  });

  it('el menú usa azul oscuro y la sección activa verde lima', () => {
    expect(tokens).toMatch(/--color-nav-bg:\s*var\(--brand-1\);/);
    expect(tokens).toMatch(/--color-nav-active-bg:\s*var\(--brand-5\);/);
  });
});
