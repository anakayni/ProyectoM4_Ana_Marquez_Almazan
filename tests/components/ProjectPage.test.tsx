import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';

const state = vi.hoisted(() => ({
  me: null as UserProfile | null,
  projects: [] as Project[],
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: state.me }) }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: state.projects, loading: false, error: null }) }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: [] }) }));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/services/projects.service', () => ({
  updateProject: state.updateProject, deleteProject: state.deleteProject, createProject: vi.fn(), setProjectMembers: vi.fn(),
}));
vi.mock('@/services/team.service', () => ({ subscribeToInvitations: () => () => {} }));
vi.mock('@/components/tasks/TaskWorkspace', () => ({
  TaskWorkspace: ({ projectId, renderHeader }: { projectId: string; renderHeader: (b: ReactNode) => ReactNode }) => (
    <>{renderHeader(null)}<p>Tareas de {projectId}</p></>
  ),
}));

import { ProjectPage } from '@/pages/ProjectPage';

const as = (role: Role) => {
  state.me = { uid: 'u', email: 'u@x.com', displayName: 'U', role, active: true, invitedBy: null, rev: 1 };
};
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/projects" element={<h1>Lista de proyectos</h1>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProjectPage', () => {
  beforeEach(() => {
    state.projects = [{
      id: 'p1', name: 'Portal', description: 'Clientes', color: '#4D7C8A', ownerId: 'u', startDate: '2026-10-01',
      endDate: '2026-11-30', archived: false, createdBy: 'u', createdAt: 1, rev: 1,
    }];
    state.updateProject.mockReset();
    state.updateProject.mockResolvedValue(undefined);
    state.deleteProject.mockReset();
    state.deleteProject.mockResolvedValue(undefined);
  });

  it('muestra el proyecto y sus tareas', () => {
    as('member');
    renderAt('/projects/p1');
    expect(screen.getByRole('heading', { level: 1, name: 'Portal' })).toBeInTheDocument();
    expect(screen.getByText('Tareas de p1')).toBeInTheDocument();
  });

  it('el encabezado muestra descripción y la fila de datos (sin "A cargo")', () => {
    as('member');
    renderAt('/projects/p1');
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    const facts = screen.getByRole('list', { name: 'Datos del proyecto' });
    expect(facts).toHaveTextContent('Fechas');
    expect(facts).toHaveTextContent('Avance');
    expect(facts).toHaveTextContent('Personas del proyecto');
    expect(screen.queryByText(/A cargo/)).not.toBeInTheDocument();
  });

  it('archivar pide confirmación', async () => {
    as('member');
    renderAt('/projects/p1');
    await userEvent.click(screen.getByRole('button', { name: 'Archivar' }));
    expect(state.updateProject).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, archivar' }));
    expect(state.updateProject).toHaveBeenCalledWith('u', 'p1', { archived: true });
  });

  it('solo el admin ve Eliminar, con confirmación, y vuelve a la lista', async () => {
    as('member');
    const { unmount } = renderAt('/projects/p1');
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    unmount();
    as('admin');
    renderAt('/projects/p1');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText(/sus tareas quedarán "Sin proyecto"/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(state.deleteProject).toHaveBeenCalledWith('u', 'p1');
    expect(await screen.findByRole('heading', { name: 'Lista de proyectos' })).toBeInTheDocument();
  });

  it('un lector no ve acciones', () => {
    as('viewer');
    renderAt('/projects/p1');
    expect(screen.queryByRole('button', { name: /Editar|Archivar|Eliminar/ })).not.toBeInTheDocument();
  });

  it('avisa si el proyecto no existe', () => {
    as('member');
    renderAt('/projects/nada');
    expect(screen.getByText('Este proyecto no existe o fue eliminado.')).toBeInTheDocument();
  });
});
