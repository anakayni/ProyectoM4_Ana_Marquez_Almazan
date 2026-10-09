import type { StatCard, Task, TaskStats } from '@/types/task';

/** `today` es 'YYYY-MM-DD' (fecha local): las fechas en ese formato se comparan como texto. */
export function isOverdue(task: Task, today: string): boolean {
  return task.status !== 'done' && task.dueDate !== null && task.dueDate < today;
}

export function countTasks(tasks: readonly Task[], today: string): TaskStats {
  const stats: TaskStats = { todo: 0, doing: 0, done: 0, overdue: 0 };
  for (const task of tasks) {
    stats[task.status] += 1;
    if (isOverdue(task, today)) stats.overdue += 1;
  }
  return stats;
}

/** Lo que muestra cada tarjeta al hacerle clic (null = sin filtro). */
export function filterByCard(tasks: readonly Task[], card: StatCard | null, today: string): Task[] {
  if (card === null) return [...tasks];
  if (card === 'overdue') return tasks.filter((t) => isOverdue(t, today));
  return tasks.filter((t) => t.status === card);
}
