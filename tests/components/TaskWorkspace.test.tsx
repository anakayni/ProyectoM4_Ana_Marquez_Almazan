import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';
import type { Task } from '@/types/task';

const state = vi.hoisted(() => ({ tasks: [] as Task[], create: vi.fn() }));
vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: state.tasks, loading: false, error: null, retry: vi.fn(), create: state.create,
    update: vi.fn(), remove: vi.fn(), setStatus: vi.fn(),
  }),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loading: false, error: null }) }));
vi.mock('@/components/tasks/TaskHistory', () => ({ TaskHistory: () => null }));

import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';

const me: UserProfile = { uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'member', active: true, invitedBy: null, rev: 1 };
const task = (id: string, projectId: string | null): Task => ({
  id, createdBy: 'ana', updatedBy: 'ana', rev: 1, title: `Tarea ${id}`, description: '', status: 'todo', assigneeId: 'ana',
  completedBy: null, completedAt: null, projectId, priority: 'media', dueDate: null, createdAt: 1,
});

describe('TaskWorkspace', () => {
  it('sin proyecto muestra todas las tareas', () => {
    state.tasks = [task('1', 'p1'), task('2', null)];
    render(<TaskWorkspace profile={me} renderHeader={(button) => <header>{button}</header>} />);
    expect(screen.getByText('Tarea 1')).toBeInTheDocument();
    expect(screen.getByText('Tarea 2')).toBeInTheDocument();
  });

  it('con proyecto muestra solo sus tareas y crea dentro de él', async () => {
    state.tasks = [task('1', 'p1'), task('2', null)];
    state.create.mockResolvedValue('nueva');
    render(<TaskWorkspace profile={me} projectId="p1" renderHeader={(button) => <header>{button}</header>} />);
    expect(screen.getByText('Tarea 1')).toBeInTheDocument();
    expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Nueva tarea' }));
    await userEvent.type(screen.getByLabelText('Título'), 'Nueva');
    await userEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nueva', projectId: 'p1' }));
  });
});
