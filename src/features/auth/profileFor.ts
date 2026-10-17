// Sin imports a propósito: scripts/migrate-users.mjs la usa directo con Node 24 (que ejecuta TypeScript simple).

export type ExistingAccount = { uid: string; email: string; displayName?: string | null };

/**
 * Perfil de la v2 para una cuenta que ya existía (sin invitación): Administrador si es el email indicado,
 * Miembro si no. `joinedAt` lo pone quien escribe (hora del servidor).
 */
export function profileFor(account: ExistingAccount, adminEmail: string) {
  const email = account.email.trim().toLowerCase();
  return {
    email,
    displayName: account.displayName?.trim() || email.split('@')[0],
    role: email === adminEmail.trim().toLowerCase() ? 'admin' : 'member',
    active: true,
    invitedBy: 'system',
    rev: 1,
  };
}
