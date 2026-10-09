import type { Task, TaskCounts, TaskFilter } from '@/types/task';

/** Devuelve una copia con las tareas que corresponden al filtro (no modifica el original). */
export function filterTasks(tasks: readonly Task[], filter: TaskFilter): Task[] {
  if (filter === 'pending') return tasks.filter((t) => t.status !== 'done');
  if (filter === 'done') return tasks.filter((t) => t.status === 'done');
  return [...tasks];
}

export function countTasks(tasks: readonly Task[]): TaskCounts {
  const done = tasks.filter((t) => t.status === 'done').length;
  return { all: tasks.length, pending: tasks.length - done, done };
}
