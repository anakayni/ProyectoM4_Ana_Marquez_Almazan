import { describe, expect, it } from 'vitest';
import { visibleForRole } from '../../functions/visibleTasks';

const tasks = [
  { id: 'a', projectId: 'p1', status: 'todo' },
  { id: 'b', projectId: 'p2', status: 'doing' },
  { id: 'c', projectId: null, status: 'todo' },
  { id: 'd', projectId: 'p1', status: 'done' },
];

describe('visibleForRole', () => {
  it('admin y miembro cuentan todas sus tareas asignadas, incluidas las hechas', () => {
    expect(visibleForRole('member', tasks, []).map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('el Lector no recibe las hechas', () => {
    expect(visibleForRole('viewer', tasks, []).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('el Invitado solo las abiertas de proyectos donde sigue estando', () => {
    expect(visibleForRole('guest', tasks, ['p1']).map((t) => t.id)).toEqual(['a']);
  });
});
