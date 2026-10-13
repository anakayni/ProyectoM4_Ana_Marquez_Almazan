import { describe, expect, it } from 'vitest';
import { visibleForRole } from '../../functions/visibleTasks';

const tasks = [{ id: 'a', projectId: 'p1' }, { id: 'b', projectId: 'p2' }, { id: 'c', projectId: null }];

describe('visibleForRole', () => {
  it('el equipo cuenta todas sus tareas asignadas', () => {
    expect(visibleForRole('member', tasks, []).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('el Invitado solo las de proyectos donde sigue estando', () => {
    expect(visibleForRole('guest', tasks, ['p1']).map((t) => t.id)).toEqual(['a']);
  });
});
