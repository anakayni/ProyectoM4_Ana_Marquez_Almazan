import { projectPeople } from '@/features/projects/projectPeople';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';

export type AssigneeOption = { uid: string; label: string };
export type NameOf = (uid: string | null) => string | null;

/**
 * Opciones de "Responsable": admins y miembros activos, y los Invitados activos que estén en el proyecto.
 * Si asigna un Invitado, solo personas del proyecto. Se agrega el actual si ya no califica, para no perderlo al editar.
 */
export function assigneeOptions(
  members: readonly UserProfile[],
  currentId: string | null,
  ctx: { project?: Project | null; actorRole?: Role } = {},
): AssigneeOption[] {
  const project = ctx.project ?? null;
  const inProject = new Set(project ? projectPeople(project) : []);
  const guestsHere = new Set(project?.memberIds ?? []);
  const assignable = (m: UserProfile) =>
    m.active && (m.role === 'admin' || m.role === 'member' || (m.role === 'guest' && guestsHere.has(m.uid)));
  const pool = members.filter((m) => assignable(m) && (ctx.actorRole !== 'guest' || inProject.has(m.uid)));
  const options = pool.map((m) => ({ uid: m.uid, label: m.displayName }));
  const current = members.find((m) => m.uid === currentId);
  if (current && !pool.includes(current)) {
    options.push({ uid: current.uid, label: current.active ? current.displayName : `${current.displayName} (inactiva)` });
  }
  return options;
}

/** Para el Invitado: quien no está en sus proyectos aparece así (sin revelar quién es). */
export const UNKNOWN_PERSON = 'Alguien del equipo';

export function unknownPersonFor(role: Role): string | null {
  return role === 'guest' ? UNKNOWN_PERSON : null;
}

/** `unknown`: nombre para alguien asignado que no está en la lista (solo para el Invitado). */
export function makeNameOf(members: readonly UserProfile[], unknown: string | null = null): NameOf {
  const names = new Map(members.map((m) => [m.uid, m.active ? m.displayName : `${m.displayName} (inactiva)`]));
  return (uid) => (uid ? names.get(uid) ?? unknown : null);
}

export type Person = { name: string; photo: string | null; active: boolean };
export type PersonOf = (uid: string | null) => Person | null;

/** Datos para el avatar de una persona (foto y si está activa). */
export function makePersonOf(members: readonly UserProfile[], unknown: string | null = null): PersonOf {
  const people = new Map(members.map((m) => [m.uid, { name: m.displayName, photo: m.photo ?? null, active: m.active }]));
  return (uid) => (uid ? people.get(uid) ?? (unknown ? { name: unknown, photo: null, active: true } : null) : null);
}

/** Tareas asignadas sin terminar, por persona. */
export function openTasksByMember(tasks: readonly Task[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (task.assigneeId && task.status !== 'done') counts.set(task.assigneeId, (counts.get(task.assigneeId) ?? 0) + 1);
  }
  return counts;
}

/** Texto de confirmación al desactivar a alguien. */
export function deactivateMessage(name: string, openTasks: number): string {
  if (openTasks === 0) return `¿Desactivar a ${name}? Ya no podrá entrar.`;
  const tasks = openTasks === 1 ? '1 tarea sin terminar' : `${openTasks} tareas sin terminar`;
  return `${name} tiene ${tasks}. Seguirán a su nombre, marcado como inactiva; puedes reasignarlas desde Mis tareas.`;
}
