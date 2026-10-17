import { contrastRatio, mixColors } from '@/utils/color';

export type PaletteCheck = { label: string; ratio: number; ok: boolean };

const WHITE = '#FFFFFF';
const BLACK = '#000000';

/**
 * Combinaciones de texto que dependen de la paleta. Las mezclas son las mismas que usa tokens.css:
 * si se cambia una fórmula allá, hay que cambiarla acá (el test de tokens lo vigila).
 */
export function paletteChecks(palette: readonly string[]): PaletteCheck[] {
  const [c1, c2, , c4, c5] = palette;
  const subtle = mixColors(c5, WHITE, 14);
  const pairs: [string, string, string][] = [
    ['Texto blanco sobre el color 1 (menú y botones)', WHITE, c1],
    ['Color 1 sobre el color 5 (sección activa del menú)', c1, c5],
    ['Texto atenuado del menú sobre el color 1', mixColors(WHITE, c1, 62), c1],
    ['Links (color 2) sobre blanco', mixColors(c2, BLACK, 85), WHITE],
    ['Links (color 2) sobre el fondo', mixColors(c2, BLACK, 85), subtle],
    ['Títulos (color 1) sobre el fondo', c1, subtle],
    ['Estado "En curso" (color 2) sobre su fondo', mixColors(c2, BLACK, 85), mixColors(c2, WHITE, 12)],
    ['Estado "Hecha" (color 4) sobre su fondo', mixColors(c4, BLACK, 55), mixColors(c4, WHITE, 18)],
    ['Inicial del avatar sobre el color 4', mixColors(c1, BLACK, 70), c4],
  ];
  return pairs.map(([label, text, bg]) => {
    const ratio = contrastRatio(text, bg);
    return { label, ratio, ok: ratio >= 4.5 };
  });
}
