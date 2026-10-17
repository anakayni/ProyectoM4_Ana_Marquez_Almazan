import { describe, expect, it } from 'vitest';
import { canEditInProject, guestAccessOf } from '@/features/projects/projectAccess';
import type { Project } from '@/types/project';

const project = { id: 'p1', ownerId: 'ana', memberIds: ['gus', 'leo'], guestAccess: { gus: 'view' } } as unknown as Project;

describe('acceso del Invitado', () => {
  it('sin entrada puede editar; con "view" solo ve; fuera del proyecto, nada', () => {
    expect(guestAccessOf(project, 'gus')).toBe('view');
    expect(guestAccessOf(project, 'leo')).toBe('edit');
    expect(guestAccessOf(project, 'otro')).toBeNull();
  });

  it('el equipo edita en cualquier proyecto; el Invitado según su acceso', () => {
    expect(canEditInProject('member', 'ana', project)).toBe(true);
    expect(canEditInProject('viewer', 'vera', project)).toBe(false);
    expect(canEditInProject('guest', 'gus', project)).toBe(false);
    expect(canEditInProject('guest', 'leo', project)).toBe(true);
    expect(canEditInProject('guest', 'leo', null)).toBe(false);
  });
});
