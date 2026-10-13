/**
 * firebase-admin ignora las reglas: si quitan a un Invitado de un proyecto, sus tareas asignadas ahí
 * no deben llegarle por email. El resto del equipo ve todo.
 */
export function visibleForRole<T extends { projectId: string | null }>(role: string, tasks: T[], guestProjectIds: string[]): T[] {
  if (role !== 'guest') return tasks;
  const allowed = new Set(guestProjectIds);
  return tasks.filter((t) => t.projectId !== null && allowed.has(t.projectId));
}
