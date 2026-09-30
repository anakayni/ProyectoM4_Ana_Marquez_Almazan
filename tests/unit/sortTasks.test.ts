import { describe, expect, it } from 'vitest';
import { sortTasks } from '@/features/tasks/sortTasks';
import type { Task } from '@/types/task';

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id, userId: 'u', title: id, description: '', completed: false,
    priority: 'media', dueDate: null, createdAt: 0, ...overrides,
  };
}

const ids = (list: Task[]) => list.map((t) => t.id);

describe('sortTasks', () => {
  it('"recent" ordena por creación, la más nueva primero', () => {
    const list = [task('a', { createdAt: 1 }), task('b', { createdAt: 3 }), task('c', { createdAt: 2 })];
    expect(ids(sortTasks(list, 'recent'))).toEqual(['b', 'c', 'a']);
  });

  it('"due" ordena por vencimiento y deja sin fecha al final', () => {
    const list = [
      task('sin-fecha'),
      task('octubre', { dueDate: '2026-10-03' }),
      task('septiembre', { dueDate: '2026-09-29' }),
    ];
    expect(ids(sortTasks(list, 'due'))).toEqual(['septiembre', 'octubre', 'sin-fecha']);
  });

  it('"priority" ordena alta → media → baja', () => {
    const list = [task('baja', { priority: 'baja' }), task('alta', { priority: 'alta' }), task('media')];
    expect(ids(sortTasks(list, 'priority'))).toEqual(['alta', 'media', 'baja']);
  });

  it('en "due" y "priority" las completadas van al final', () => {
    const list = [task('hecha', { priority: 'alta', completed: true }), task('pendiente', { priority: 'baja' })];
    expect(ids(sortTasks(list, 'priority'))).toEqual(['pendiente', 'hecha']);
  });

  it('no modifica el array original', () => {
    const list = [task('a', { createdAt: 1 }), task('b', { createdAt: 2 })];
    sortTasks(list, 'recent');
    expect(ids(list)).toEqual(['a', 'b']);
  });
});
