/** Los emails se guardan y comparan siempre en minúsculas y sin espacios. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
