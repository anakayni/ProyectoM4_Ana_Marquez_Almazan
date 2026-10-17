/**
 * firebase-admin ignora las reglas, así que el filtro se repite acá:
 * Lector e Invitado nunca reciben tareas hechas, y el Invitado solo las de proyectos donde sigue estando.
 */
export function visibleForRole<T extends { projectId: string | null; status: string }>(
  role: string,
  tasks: T[],
  guestProjectIds: string[],
): T[] {
  if (!hidesDone(role)) return tasks;
  const open = tasks.filter((t) => t.status !== 'done');
  if (role !== 'guest') return open;
  const allowed = new Set(guestProjectIds);
  return open.filter((t) => t.projectId !== null && allowed.has(t.projectId));
}

/** Lector e Invitado no ven tareas hechas (igual que en la app y en las reglas). */
export function hidesDone(role: string): boolean {
  return role === 'viewer' || role === 'guest';
}
