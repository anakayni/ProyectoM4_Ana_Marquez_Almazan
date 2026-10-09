import { describe, expect, it } from 'vitest';
import { scopeTasks } from '@/features/tasks/scopeTasks';
import type { Task } from '@/types/task';

const task = (id: string, assigneeId: string | null): Task => ({
  id, createdBy: 'x', updatedBy: 'x', rev: 1, title: id, description: '', status: 'todo', assigneeId,
  completedBy: null, completedAt: null, priority: 'media', dueDate: null, createdAt: 1,
});
const tasks = [task('a', 'ana'), task('b', 'luis'), task('c', null)];

describe('scopeTasks', () => {
  it('"mine" deja las asignadas a mí', () => {
    expect(scopeTasks(tasks, 'mine', 'ana').map((t) => t.id)).toEqual(['a']);
  });
  it('"team" deja todas', () => {
    expect(scopeTasks(tasks, 'team', 'ana')).toHaveLength(3);
  });
  it('"unassigned" deja las sin responsable', () => {
    expect(scopeTasks(tasks, 'unassigned', 'ana').map((t) => t.id)).toEqual(['c']);
  });
});
