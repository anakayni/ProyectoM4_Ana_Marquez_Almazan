import type { Task } from '@/types/task';

export type ProjectProgress = { total: number; todo: number; doing: number; done: number; percent: number; late: boolean };

/** Progreso real: tareas hechas sobre el total. Atrasado = pasó la fecha de fin y no llegó al 100%. */
export function projectProgress(tasks: readonly Task[], endDate: string, today: string): ProjectProgress {
  const count = (status: Task['status']) => tasks.filter((t) => t.status === status).length;
  const done = count('done');
  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  return { total: tasks.length, todo: count('todo'), doing: count('doing'), done, percent, late: endDate < today && percent < 100 };
}

/** "6 tareas abiertas" (para quien no ve las hechas: Lector e Invitado). */
export function openTasksLabel(n: number): string {
  if (n === 0) return 'Sin tareas abiertas';
  return n === 1 ? '1 tarea abierta' : `${n} tareas abiertas`;
}

export type OpenSummary = { open: number; late: boolean };

/** Sin ver las hechas: cuánto falta y si pasó la fecha de fin con tareas abiertas. */
export function projectOpenSummary(tasks: readonly Task[], endDate: string, today: string): OpenSummary {
  const open = tasks.filter((t) => t.status !== 'done').length;
  return { open, late: endDate < today && open > 0 };
}
