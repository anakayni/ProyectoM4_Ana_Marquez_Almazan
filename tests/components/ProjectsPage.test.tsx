import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';

const state = vi.hoisted(() => ({ me: null as UserProfile | null, projects: [] as Project[] }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: state.me }) }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: state.projects, loading: false, error: null }) }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: [] }) }));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/services/projects.service', () => ({ createProject: vi.fn(), updateProject: vi.fn() }));

import { ProjectsPage } from '@/pages/ProjectsPage';

const as = (role: Role) => {
  state.me = { uid: 'u', email: 'u@x.com', displayName: 'U', role, active: true, invitedBy: null, rev: 1 };
};
const project = (id: string, name: string, archived = false): Project => ({
  id, name, description: '', color: '#4D7C8A', ownerId: 'u', startDate: '2026-10-01', endDate: '2026-11-30',
  archived, createdBy: 'u', createdAt: 1, rev: 1,
});

describe('ProjectsPage', () => {
  beforeEach(() => {
    state.projects = [project('1', 'Portal'), project('2', 'Viejo', true)];
  });

  it('muestra los activos y cambia a archivados', async () => {
    as('member');
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.getByText('1 activo · 1 archivado')).toBeInTheDocument();
    expect(screen.getByText('Portal')).toBeInTheDocument();
    expect(screen.queryByText('Viejo')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Archivados' }));
    expect(screen.getByText('Viejo')).toBeInTheDocument();
  });

  it('miembro crea proyectos; lector no', () => {
    as('member');
    const { unmount } = render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: '+ Nuevo proyecto' })).toBeInTheDocument();
    unmount();
    as('viewer');
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: '+ Nuevo proyecto' })).not.toBeInTheDocument();
  });
});
