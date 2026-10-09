import { useEffect, useState } from 'react';
import { subscribeToMembers } from '@/services/team.service';
import type { UserProfile } from '@/types/auth';

/** Integrantes del equipo (para elegir responsable y mostrar nombres). Si falla, la app sigue con la lista vacía. */
export function useTeamMembers(): UserProfile[] {
  const [members, setMembers] = useState<UserProfile[]>([]);
  useEffect(() => subscribeToMembers(setMembers, (err) => console.error('Error al leer el equipo:', err)), []);
  return members;
}
