/** Link de registro para compartir: solo prellena el email, no es un secreto. */
export function inviteLink(origin: string, email: string): string {
  return `${origin.replace(/\/$/, '')}/register?email=${encodeURIComponent(email)}`;
}
