import type { Task } from '@/types/task';

/** `today` es 'YYYY-MM-DD' (fecha local): las fechas en ese formato se comparan como texto. */
export function isOverdue(task: Task, today: string): boolean {
  return task.status !== 'done' && task.dueDate !== null && task.dueDate < today;
}
