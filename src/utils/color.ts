function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(n.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG entre dos colores '#RRGGBB' (1 a 21). AA pide 4.5 para texto normal. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const LIGHT_TEXT = '#FFFFFF';
// Negro puro: con blanco o negro, cualquier fondo llega al menos a 4.58:1 (un azul oscuro no lo garantiza).
const DARK_TEXT = '#000000';

/** Letra blanca u oscura, la que mejor se lea sobre `background` (p. ej. el color de un proyecto). */
export function readableTextColor(background: string): '#FFFFFF' | '#000000' {
  return contrastRatio(LIGHT_TEXT, background) >= contrastRatio(DARK_TEXT, background) ? LIGHT_TEXT : DARK_TEXT;
}
