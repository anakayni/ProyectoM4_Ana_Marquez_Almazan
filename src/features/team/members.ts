import type { UserProfile } from '@/types/auth';

export type AssigneeOption = { uid: string; label: string };
export type NameOf = (uid: string | null) => string | null;

const canBeAssigned = (m: UserProfile) => m.active && (m.role === 'admin' || m.role === 'member');

/** Opciones de "Responsable": admins y miembros activos (+ el actual si ya no califica, para no perderlo al editar). */
export function assigneeOptions(members: readonly UserProfile[], currentId: string | null): AssigneeOption[] {
  const options = members.filter(canBeAssigned).map((m) => ({ uid: m.uid, label: m.displayName }));
  const current = members.find((m) => m.uid === currentId);
  if (current && !canBeAssigned(current)) options.push({ uid: current.uid, label: `${current.displayName} (inactiva)` });
  return options;
}

export function makeNameOf(members: readonly UserProfile[]): NameOf {
  const names = new Map(members.map((m) => [m.uid, m.displayName]));
  return (uid) => (uid ? names.get(uid) ?? null : null);
}
