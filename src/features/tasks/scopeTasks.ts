import type { Task, TaskScope } from '@/types/task';

/** Mías (asignadas a `uid`), todo el equipo o sin responsable. Devuelve una copia. */
export function scopeTasks(tasks: readonly Task[], scope: TaskScope, uid: string): Task[] {
  if (scope === 'mine') return tasks.filter((t) => t.assigneeId === uid);
  if (scope === 'unassigned') return tasks.filter((t) => t.assigneeId === null);
  return [...tasks];
}
