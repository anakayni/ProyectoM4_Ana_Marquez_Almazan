import type { Subtask } from '@/types/task';

export const MAX_SUBTASKS = 20;
export const SUBTASK_TITLE_MAX = 120;

export function subtaskProgress(subtasks: readonly Subtask[]): { done: number; total: number; percent: number } {
  const done = subtasks.filter((s) => s.done).length;
  return { done, total: subtasks.length, percent: subtasks.length === 0 ? 0 : Math.round((done / subtasks.length) * 100) };
}

export function newSubtask(title: string): Subtask {
  return { id: crypto.randomUUID(), title: title.trim(), done: false };
}
