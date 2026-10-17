import { describe, expect, it } from 'vitest';
import { isOverdue } from '@/features/tasks/taskStats';
import type { Task, TaskStatus } from '@/types/task';

const TODAY = '2026-10-08';
const task = (id: string, status: TaskStatus, dueDate: string | null = null): Task => ({
  id, createdBy: 'x', updatedBy: 'x', rev: 1, title: id, description: '', status, assigneeId: null,
  completedBy: null, completedAt: null, projectId: null, number: 1, subtasks: [], priority: 'media', dueDate, createdAt: 1,
});
const tasks = [
  task('vencida', 'todo', '2026-10-07'),
  task('hoy', 'doing', '2026-10-08'),
  task('hecha-vieja', 'done', '2026-10-01'),
  task('sin-fecha', 'todo'),
];

describe('isOverdue', () => {
  it('vencida: no hecha y con fecha anterior a hoy', () => {
    expect(isOverdue(tasks[0], TODAY)).toBe(true);
  });
  it('no cuenta la que vence hoy, la hecha ni la sin fecha', () => {
    expect([tasks[1], tasks[2], tasks[3]].map((t) => isOverdue(t, TODAY))).toEqual([false, false, false]);
  });
});
