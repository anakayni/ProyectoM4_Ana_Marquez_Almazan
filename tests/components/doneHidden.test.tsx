import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskStats } from '@/components/tasks/TaskStats';
import type { Task } from '@/types/task';

const setStatus = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [{
      id: 't1', createdBy: 'ana', updatedBy: 'ana', rev: 1, title: 'Diseñar logo', description: '', status: 'todo', assigneeId: 'g',
      completedBy: null, completedAt: null, projectId: 'p1', number: 1, subtasks: [], priority: 'media', dueDate: null, createdAt: 1,
    } satisfies Task],
    loading: false, error: null, retry: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setStatus,
  }),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({ projects: [{ id: 'p1', name: 'Portal', ownerId: 'ana', memberIds: ['g'], archived: false, color: '#4D7C8A' }], loading: false, error: null }),
}));

import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';

const stats = { todo: 1, doing: 0, done: 0, overdue: 0 };

describe('sin tareas hechas', () => {
  it('las tarjetas no muestran "Hechas"', () => {
    render(<TaskStats stats={stats} selected={null} onSelect={vi.fn()} showDone={false} />);
    expect(screen.queryByRole('button', { name: /Hechas/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pendientes/ })).toBeInTheDocument();
  });

  it('el tablero no tiene la columna "Hecha"', () => {
    render(<TaskBoard tasks={[]} nameOf={() => null} personOf={() => null} projectOf={() => null} canEdit onStatusChange={vi.fn()} onOpen={vi.fn()} showDone={false} />);
    expect(screen.queryByRole('region', { name: /Hecha/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(2);
  });

  it('el Invitado confirma antes de marcar una tarea como hecha', async () => {
    const guest = { uid: 'g', email: 'g@x.com', displayName: 'G', role: 'guest' as const, active: true, invitedBy: null, rev: 1 };
    render(<TaskWorkspace profile={guest} renderHeader={() => null} />);
    await userEvent.selectOptions(screen.getByLabelText('Estado de "Diseñar logo"'), 'Hecha');
    const dialog = screen.getByRole('dialog', { name: '¿Marcar como hecha?' });
    expect(dialog).toHaveTextContent('Dejarás de verla: las tareas terminadas solo las ven el admin y los miembros.');
    expect(setStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sí, marcar' }));
    expect(setStatus).toHaveBeenCalledWith('t1', 'done');
  });
});
