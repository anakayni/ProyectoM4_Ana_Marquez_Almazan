import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';

const state = vi.hoisted(() => ({ tasks: [] as Task[], projects: [] as Project[] }));
vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: state.tasks, loading: false, error: null, retry: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setStatus: vi.fn() }),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: state.projects, loading: false, error: null }) }));
vi.mock('@/components/tasks/TaskHistory', () => ({ TaskHistory: () => null }));

import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';

const guest: UserProfile = { uid: 'g', email: 'g@x.com', displayName: 'G', role: 'guest', active: true, invitedBy: null, rev: 1 };
const project = (id: string, name: string, access?: 'view' | 'edit') => ({
  id, name, description: '', color: '#4D7C8A', ownerId: 'ana', memberIds: ['g'], guestAccess: access ? { g: access } : {},
  startDate: '2026-10-01', endDate: '2026-12-31', archived: false, createdBy: 'ana', createdAt: 1, rev: 1,
}) as Project;
const task = (id: string, projectId: string): Task => ({
  id, createdBy: 'ana', updatedBy: 'ana', rev: 1, title: `Tarea ${id}`, description: '', status: 'todo', assigneeId: null,
  completedBy: null, completedAt: null, projectId, number: Number(id), subtasks: [], priority: 'media', dueDate: null, createdAt: 1,
});

describe('Invitado: tareas según su acceso en cada proyecto', () => {
  beforeEach(() => {
    localStorage.clear();
    state.tasks = [task('1', 'p1'), task('2', 'p2')];
  });

  it('"Solo ver" no cambia estados; "Puede editar" sí, y solo ahí crea tareas', async () => {
    state.projects = [project('p1', 'Portal', 'view'), project('p2', 'Web')];
    render(<TaskWorkspace profile={guest} renderHeader={(button) => <header>{button}</header>} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Todo el equipo' }));
    expect(screen.queryByLabelText('Estado de "Tarea 1"')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Estado de "Tarea 2"')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Nueva tarea' }));
    const form = screen.getByRole('dialog', { name: 'Nueva tarea' });
    const options = [...within(form).getByLabelText('Proyecto').querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual(['Elige un proyecto', 'Web']);
  });

  it('sin ningún proyecto "Puede editar" no hay "+ Nueva tarea"', () => {
    state.projects = [project('p1', 'Portal', 'view')];
    render(<TaskWorkspace profile={guest} renderHeader={(button) => <header>{button}</header>} />);
    expect(screen.queryByRole('button', { name: '+ Nueva tarea' })).not.toBeInTheDocument();
  });
});
