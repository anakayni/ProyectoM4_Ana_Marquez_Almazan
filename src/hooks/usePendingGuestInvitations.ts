import { usePendingInvitations } from './usePendingInvitations';

/** Emails invitados como Invitado que todavía no crearon su cuenta (solo el admin puede leerlas). */
export function usePendingGuestInvitations(enabled: boolean): string[] {
  return usePendingInvitations(enabled).filter((i) => i.role === 'guest').map((i) => i.email);
}
