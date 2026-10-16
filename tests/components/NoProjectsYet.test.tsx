import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';

vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: [], loading: false, error: null, retry: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setStatus: vi.fn() }),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loading: false, error: null }) }));

import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';

const profile = (role: UserProfile['role']): UserProfile =>
  ({ uid: 'g', email: 'g@x.com', displayName: 'G', role, active: true, invitedBy: null, rev: 1 });

describe('Invitado sin proyectos', () => {
  it('ve el mensaje y no puede crear tareas', () => {
    render(<TaskWorkspace profile={profile('guest')} renderHeader={(button) => <header>{button}</header>} />);
    expect(screen.getByText('Todavía no tienes proyectos asignados.')).toBeInTheDocument();
    expect(screen.getByText('El administrador te agregará.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Nueva tarea' })).not.toBeInTheDocument();
  });

  it('un miembro sin proyectos sigue viendo Mis tareas normal', () => {
    render(<TaskWorkspace profile={profile('member')} renderHeader={(button) => <header>{button}</header>} />);
    expect(screen.queryByText('Todavía no tienes proyectos asignados.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Nueva tarea' })).toBeInTheDocument();
  });
});
