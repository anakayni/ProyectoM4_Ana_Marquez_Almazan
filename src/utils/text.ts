/** Minúsculas y sin tildes: "Revisión" y "revision" coinciden. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
