import { useEffect, useState } from 'react';
import { subscribeToInvitations } from '@/services/team.service';

/** Emails invitados como Invitado que todavía no crearon su cuenta (solo el admin puede leerlas). */
export function usePendingGuestInvitations(enabled: boolean): string[] {
  const [emails, setEmails] = useState<string[]>([]);
  useEffect(() => {
    if (!enabled) return;
    return subscribeToInvitations(
      (list) => setEmails(list.filter((i) => i.status === 'pending' && i.role === 'guest').map((i) => i.email)),
      (err) => console.error('Error al leer invitaciones:', err),
    );
  }, [enabled]);
  return enabled ? emails : [];
}
