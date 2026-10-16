import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';

const state = vi.hoisted(() => ({ me: null as UserProfile | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: state.me }) }));
vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    projects: [{
      id: 'p9', name: 'Nuevo', description: '', color: '#4D7C8A', ownerId: 'u', startDate: '2026-10-01', endDate: '2026-11-30',
      archived: false, createdBy: 'u', createdAt: 1, rev: 1,
    } satisfies Project],
    loading: false, error: null,
  }),
}));
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: [] }) }));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
// Formulario simulado: "crea" el proyecto p9 y se cierra.
vi.mock('@/components/projects/ProjectDialog', () => ({
  ProjectDialog: ({ onCreated, onClose }: { onCreated?: (id: string) => void; onClose: () => void }) => (
    <button type="button" onClick={() => { onCreated?.('p9'); onClose(); }}>Simular crear</button>
  ),
}));
vi.mock('@/components/projects/ShareProjectDialog', () => ({
  ShareProjectDialog: ({ project, justCreated }: { project: Project; justCreated?: boolean }) => (
    <p>{justCreated ? `Compartir recién creado: ${project.name}` : 'Compartir'}</p>
  ),
}));

import { ProjectsPage } from '@/pages/ProjectsPage';

const as = (role: Role) => {
  state.me = { uid: 'u', email: 'u@x.com', displayName: 'U', role, active: true, invitedBy: null, rev: 1 };
};

async function create() {
  render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: '+ Nuevo proyecto' }));
  await userEvent.click(screen.getByRole('button', { name: 'Simular crear' }));
}

describe('al crear un proyecto', () => {
  it('el admin ve "Compartir proyecto" del proyecto nuevo', async () => {
    as('admin');
    await create();
    expect(screen.getByText('Compartir recién creado: Nuevo')).toBeInTheDocument();
  });

  it('a un miembro no se le abre', async () => {
    as('member');
    await create();
    expect(screen.queryByText(/Compartir recién creado/)).not.toBeInTheDocument();
  });
});
