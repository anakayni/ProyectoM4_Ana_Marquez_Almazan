import { describe, expect, it } from 'vitest';
import { newSubtask, subtaskProgress } from '@/features/tasks/subtasks';

describe('subtaskProgress', () => {
  it('cuenta las hechas', () => {
    expect(subtaskProgress([
      { id: 'a', title: 'A', done: true }, { id: 'b', title: 'B', done: true }, { id: 'c', title: 'C', done: false },
    ])).toEqual({ done: 2, total: 3, percent: 67 });
  });
  it('sin subtareas: 0 de 0', () => {
    expect(subtaskProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe('newSubtask', () => {
  it('crea una subtarea sin hacer, con id único y título recortado', () => {
    const a = newSubtask('  Revisar  ');
    const b = newSubtask('Otra');
    expect(a).toMatchObject({ title: 'Revisar', done: false });
    expect(a.id).not.toBe(b.id);
  });
});
