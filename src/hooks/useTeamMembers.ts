import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToGuestPeople, subscribeToMembers } from '@/services/team.service';
import type { UserProfile } from '@/types/auth';

/**
 * Personas que se pueden nombrar y elegir como responsable. Si falla, la app sigue con la lista vacía.
 * El Invitado no lee el equipo: ve las tarjetas de sus proyectos.
 */
export function useTeamMembers(): UserProfile[] {
  const { profile } = useAuth();
  const uid = profile?.uid ?? '';
  const isGuest = profile?.role === 'guest';
  const [members, setMembers] = useState<UserProfile[]>([]);
  useEffect(() => {
    const onError = (err: Error) => console.error('Error al leer el equipo:', err);
    return isGuest ? subscribeToGuestPeople(uid, setMembers, onError) : subscribeToMembers(setMembers, onError);
  }, [uid, isGuest]);
  return members;
}
