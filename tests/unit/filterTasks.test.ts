import { describe, expect, it } from 'vitest';
import { countTasks, filterTasks } from '@/features/tasks/filterTasks';
import type { Task } from '@/types/task';

const tasks: Task[] = [
  { id: '1', createdBy: 'u', updatedBy: 'u', rev: 1, title: 'A', description: '', status: 'todo', assigneeId: null, completedBy: null, completedAt: null, priority: 'media', dueDate: null, createdAt: 3 },
  { id: '2', createdBy: 'u', updatedBy: 'u', rev: 1, title: 'B', description: '', status: 'done', assigneeId: null, completedBy: 'u', completedAt: 1, priority: 'media', dueDate: null, createdAt: 2 },
  { id: '3', createdBy: 'u', updatedBy: 'u', rev: 1, title: 'C', description: '', status: 'todo', assigneeId: null, completedBy: null, completedAt: null, priority: 'media', dueDate: null, createdAt: 1 },
];

describe('filterTasks', () => {
  it('"all" devuelve todas las tareas', () => {
    expect(filterTasks(tasks, 'all').map((t) => t.id)).toEqual(['1', '2', '3']);
  });

  it('"pending" devuelve solo las no completadas', () => {
    expect(filterTasks(tasks, 'pending').map((t) => t.id)).toEqual(['1', '3']);
  });

  it('"done" devuelve solo las completadas', () => {
    expect(filterTasks(tasks, 'done').map((t) => t.id)).toEqual(['2']);
  });
});

describe('countTasks', () => {
  it('cuenta cada grupo', () => {
    expect(countTasks(tasks)).toEqual({ all: 3, pending: 2, done: 1 });
  });
});
