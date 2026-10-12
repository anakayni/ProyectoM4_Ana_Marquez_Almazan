import type { Task } from '@/types/task';

export type ProjectProgress = { total: number; todo: number; doing: number; done: number; percent: number; late: boolean };

/** Progreso real: tareas hechas sobre el total. Atrasado = pasó la fecha de fin y no llegó al 100%. */
export function projectProgress(tasks: readonly Task[], endDate: string, today: string): ProjectProgress {
  const count = (status: Task['status']) => tasks.filter((t) => t.status === status).length;
  const done = count('done');
  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  return { total: tasks.length, todo: count('todo'), doing: count('doing'), done, percent, late: endDate < today && percent < 100 };
}
