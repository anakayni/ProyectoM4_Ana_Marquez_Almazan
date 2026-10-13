import { describe, expect, it } from 'vitest';
import { assigneeOptions, deactivateMessage, makeNameOf, makePersonOf, openTasksByMember } from '@/features/team/members';
import type { Role, UserProfile } from '@/types/auth';
import type { Task } from '@/types/task';

const member = (uid: string, role: Role, active = true): UserProfile => ({
  uid, email: `${uid}@x.com`, displayName: uid.toUpperCase(), role, active, invitedBy: null, rev: 1,
});
const team = [member('ana', 'admin'), member('luis', 'member'), member('vera', 'viewer'), member('ex', 'member', false)];

describe('assigneeOptions', () => {
  it('solo admins y miembros activos', () => {
    expect(assigneeOptions(team, null)).toEqual([{ uid: 'ana', label: 'ANA' }, { uid: 'luis', label: 'LUIS' }]);
  });
  it('agrega al responsable actual si ya no es asignable, marcado como inactivo', () => {
    expect(assigneeOptions(team, 'ex')).toContainEqual({ uid: 'ex', label: 'EX (inactiva)' });
  });
});

describe('makeNameOf', () => {
  const nameOf = makeNameOf(team);
  it('devuelve el nombre o null', () => {
    expect(nameOf('luis')).toBe('LUIS');
    expect(nameOf('nadie')).toBeNull();
    expect(nameOf(null)).toBeNull();
  });
});

describe('makeNameOf con inactivos', () => {
  it('marca a las personas desactivadas', () => {
    expect(makeNameOf(team)('ex')).toBe('EX (inactiva)');
  });
});

describe('makePersonOf', () => {
  it('devuelve nombre, foto y estado', () => {
    const personOf = makePersonOf([{ ...team[1], photo: 'data:image/jpeg;base64,AA' }, team[3]]);
    expect(personOf('luis')).toEqual({ name: 'LUIS', photo: 'data:image/jpeg;base64,AA', active: true });
    expect(personOf('ex')).toEqual({ name: 'EX', photo: null, active: false });
    expect(personOf(null)).toBeNull();
  });
});

describe('openTasksByMember', () => {
  const t = (assigneeId: string | null, status: Task['status']): Task => ({
    id: Math.random().toString(), createdBy: 'x', updatedBy: 'x', rev: 1, title: 't', description: '', status, assigneeId,
    completedBy: null, completedAt: null, projectId: null, number: 1, subtasks: [], priority: 'media', dueDate: null, createdAt: 1,
  });
  it('cuenta las asignadas que no están hechas', () => {
    const counts = openTasksByMember([t('ana', 'todo'), t('ana', 'doing'), t('ana', 'done'), t('luis', 'todo'), t(null, 'todo')]);
    expect(counts.get('ana')).toBe(2);
    expect(counts.get('luis')).toBe(1);
    expect(counts.get('vera')).toBeUndefined();
  });
});

describe('deactivateMessage', () => {
  it('avisa cuántas tareas quedan a su nombre', () => {
    expect(deactivateMessage('Luis', 3)).toBe(
      'Luis tiene 3 tareas sin terminar. Seguirán a su nombre, marcado como inactiva; puedes reasignarlas desde Mis tareas.',
    );
    expect(deactivateMessage('Luis', 1)).toContain('1 tarea sin terminar');
    expect(deactivateMessage('Luis', 0)).toBe('¿Desactivar a Luis? Ya no podrá entrar.');
  });
});

describe('desconocidos', () => {
  it('con un nombre para desconocidos, lo usa solo si hay alguien asignado', () => {
    const nameOf = makeNameOf([], 'Alguien del equipo');
    expect(nameOf('x')).toBe('Alguien del equipo');
    expect(nameOf(null)).toBeNull();
    expect(makePersonOf([], 'Alguien del equipo')('x')).toEqual({ name: 'Alguien del equipo', photo: null, active: true });
  });

  it('sin él, sigue devolviendo null', () => {
    expect(makeNameOf([])('x')).toBeNull();
  });
});
