import type { Priority, SortMode, Task } from '@/types/task';

type Comparator = (a: Task, b: Task) => number;

const PRIORITY_RANK: Record<Priority, number> = { alta: 0, media: 1, baja: 2 };

const byRecent: Comparator = (a, b) => b.createdAt - a.createdAt;
const byPriority: Comparator = (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
const pendingFirst: Comparator = (a, b) => Number(a.status === 'done') - Number(b.status === 'done');

/** Por vencimiento; las tareas sin fecha van al final. Las fechas YYYY-MM-DD se comparan como texto. */
const byDue: Comparator = (a, b) => {
  if (a.dueDate === b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
};

/**
 * Devuelve una copia ordenada (no modifica el array original).
 * - recent: la más nueva primero.
 * - due: pendientes primero, luego por vencimiento y prioridad.
 * - priority: pendientes primero, luego por prioridad y vencimiento.
 */
export function sortTasks(tasks: readonly Task[], mode: SortMode): Task[] {
  const list = [...tasks];
  if (mode === 'recent') return list.sort(byRecent);
  const [primary, secondary] = mode === 'priority' ? [byPriority, byDue] : [byDue, byPriority];
  return list.sort((a, b) => pendingFirst(a, b) || primary(a, b) || secondary(a, b) || byRecent(a, b));
}
