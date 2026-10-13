import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskTable } from '@/components/tasks/TaskTable';
import { TodoList } from '@/components/tasks/TodoList';
import type { Task } from '@/types/task';

const done: Task = {
  id: 't1', createdBy: 'u', updatedBy: 'u', rev: 2, title: 'Pagar luz', description: 'Factura de octubre', status: 'done',
  assigneeId: 'ana', completedBy: 'ana', completedAt: new Date(2026, 9, 8).getTime(), projectId: 'p1', number: 4,
  subtasks: [], priority: 'alta', dueDate: null, createdAt: 1,
};
const portal = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'a', startDate: '2026-10-01', endDate: '2026-11-30',
  archived: false, createdBy: 'a', createdAt: 1, rev: 1,
};
const props = {
  tasks: [done],
  nameOf: (uid: string | null) => (uid === 'ana' ? 'Ana' : null),
  personOf: (uid: string | null) => (uid === 'ana' ? { name: 'Ana', photo: null, active: true } : null),
  projectOf: (id: string | null) => (id === 'p1' ? portal : null),
  canEdit: true,
  onStatusChange: vi.fn(),
  onOpen: vi.fn(),
};

describe.each([
  ['Lista', () => render(<TodoList {...props} />)],
  ['Tabla', () => render(<TaskTable {...props} />)],
  ['Tablero', () => render(<TaskBoard {...props} />)],
])('tarea terminada en %s', (_view, renderView) => {
  it('se marca como hecha también para el lector de pantalla', () => {
    renderView();
    expect(screen.getByText('Hecha:')).toHaveClass('visually-hidden');
    expect(screen.getByRole('button', { name: 'Pagar luz' }).closest('.done')).not.toBeNull();
  });

  it('el proyecto se ve en gris (sin el color del proyecto)', () => {
    renderView();
    const tag = screen.getByText('Portal');
    expect(tag).toHaveClass('muted');
    expect(tag.style.backgroundColor).toBe('');
  });
});
