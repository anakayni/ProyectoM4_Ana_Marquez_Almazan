import { useEffect, useState } from 'react';
import { subscribeToInvitations } from '@/services/team.service';
import type { Invitation } from '@/types/invitation';

/** Invitaciones que nadie aceptó todavía (solo el admin puede leerlas; si no, devuelve una lista vacía). */
export function usePendingInvitations(enabled: boolean): Invitation[] {
  const [pending, setPending] = useState<Invitation[]>([]);
  useEffect(() => {
    if (!enabled) return;
    return subscribeToInvitations(
      (list) => setPending(list.filter((i) => i.status === 'pending')),
      (err) => console.error('Error al leer invitaciones:', err),
    );
  }, [enabled]);
  return enabled ? pending : [];
}
