import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';
import type { Task, TaskStatus } from '@/types/task';

const state = vi.hoisted(() => ({ tasks: [] as Task[] }));
const me: UserProfile = { uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'member', active: true, invitedBy: null, rev: 1 };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: me }) }));
vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: state.tasks, loading: false, error: null, retry: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setStatus: vi.fn() }),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loading: false, error: null }) }));
vi.mock('@/components/tasks/TaskHistory', () => ({ TaskHistory: () => null }));

import { CalendarPage } from '@/pages/CalendarPage';

const task = (number: number, dueDate: string, status: TaskStatus = 'todo'): Task => ({
  id: String(number), createdBy: 'ana', updatedBy: 'ana', rev: 1, title: `Tarea ${number}`, description: '', status, assigneeId: 'ana',
  completedBy: null, completedAt: null, projectId: null, number, subtasks: [], priority: 'media', dueDate, createdAt: 1,
});
const renderPage = () => render(<MemoryRouter><CalendarPage /></MemoryRouter>);

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 12, 10));
    localStorage.clear();
    state.tasks = [task(1, '2026-10-20'), task(2, '2026-10-21', 'done'), task(3, '2026-11-03')];
  });
  afterEach(() => vi.useRealTimers());

  it('muestra el mes actual con sus tareas', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Octubre 2026' })).toBeInTheDocument();
    expect(within(screen.getByTestId('day-2026-10-20')).getByRole('button', { name: /MC-1/ })).toBeInTheDocument();
  });

  it('cambia de mes y vuelve a hoy', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Noviembre 2026' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Octubre 2026' })).toBeInTheDocument();
  });

  it('oculta las hechas', async () => {
    renderPage();
    expect(within(screen.getByTestId('day-2026-10-21')).getByRole('button', { name: /MC-2/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ocultar hechas' }));
    expect(within(screen.getByTestId('day-2026-10-21')).queryByRole('button', { name: /MC-2/ })).not.toBeInTheDocument();
  });

  it('"+" abre Nueva tarea con el día puesto', async () => {
    renderPage();
    await userEvent.click(within(screen.getByTestId('day-2026-10-15')).getByRole('button', { name: 'Nueva tarea el 15 de octubre' }));
    expect(screen.getByLabelText('Vence')).toHaveValue('2026-10-15');
  });
});
