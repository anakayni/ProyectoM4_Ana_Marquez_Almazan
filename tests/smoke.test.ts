import { describe, expect, it } from 'vitest';

describe('entorno de tests', () => {
  it('ejecuta Vitest con jsdom', () => {
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement);
  });
});
