import type { Priority, Task } from '@/types/task';
import { formatTaskNumber, TASK_PREFIX } from './taskNumber';

export type PriorityFilter = Priority | 'all';
/** Un id de proyecto, 'all' (todos) o 'none' (sin proyecto). */
export type ProjectFilter = string;

/** Minúsculas y sin tildes: "Revisión" y "revision" coinciden. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Coincide por título, descripción o número ("MC-108" o "108"). */
export function searchTasks(tasks: readonly Task[], query: string, prefix = TASK_PREFIX): Task[] {
  const q = normalize(query);
  if (!q) return [...tasks];
  return tasks.filter(
    (t) =>
      normalize(t.title).includes(q)
      || normalize(t.description).includes(q)
      || normalize(formatTaskNumber(t.number, prefix)) === q
      || String(t.number) === q,
  );
}

export function filterByPriority(tasks: readonly Task[], priority: PriorityFilter): Task[] {
  return priority === 'all' ? [...tasks] : tasks.filter((t) => t.priority === priority);
}

export function filterByProject(tasks: readonly Task[], project: ProjectFilter): Task[] {
  if (project === 'all') return [...tasks];
  if (project === 'none') return tasks.filter((t) => t.projectId === null);
  return tasks.filter((t) => t.projectId === project);
}
