import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TodoList } from '@/components/tasks/TodoList';
import type { Task } from '@/types/task';

const base = { createdBy: 'u', updatedBy: 'u', rev: 1, priority: 'media' as const, dueDate: null, createdAt: 1 };
const tasks: Task[] = [
  { ...base, id: '1', title: 'Comprar yerba', description: 'Dos kilos', status: 'todo', assigneeId: 'ana', completedBy: null, completedAt: null },
  { ...base, id: '2', title: 'Pagar luz', description: '', status: 'done', assigneeId: null, completedBy: 'ana', completedAt: new Date(2026, 9, 8).getTime() },
];
const nameOf = (uid: string | null) => (uid === 'ana' ? 'Ana' : null);

function setup(list: Task[] = tasks, props: Partial<Parameters<typeof TodoList>[0]> = {}) {
  const handlers = { onStatusChange: vi.fn(), onOpen: vi.fn() };
  render(<TodoList tasks={list} nameOf={nameOf} {...handlers} {...props} />);
  return handlers;
}

describe('TodoList', () => {
  it('muestra cada tarea con su responsable', () => {
    setup();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Dos kilos')).toBeInTheDocument();
    expect(screen.getByText('Responsable: Ana')).toBeInTheDocument();
    expect(screen.getByText('Sin asignar')).toBeInTheDocument();
  });

  it('muestra quién completó y cuándo', () => {
    setup();
    expect(screen.getByText(/Hecha por Ana · 8 oct/)).toBeInTheDocument();
  });

  it('muestra prioridad y vencimiento', () => {
    setup([{ ...tasks[0], priority: 'alta', dueDate: '2020-01-01' }]);
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText(/vencida/i)).toBeInTheDocument();
  });

  it('cambia el estado', async () => {
    const { onStatusChange } = setup();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado de "Comprar yerba"' }), 'doing');
    expect(onStatusChange).toHaveBeenCalledWith('1', 'doing');
  });

  it('muestra un estado vacío personalizado', () => {
    setup([], { emptyTitle: 'No hay tareas en este filtro' });
    expect(screen.getByText('No hay tareas en este filtro')).toBeInTheDocument();
  });

  it('abre el detalle al hacer clic en el título', async () => {
    const { onOpen } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Comprar yerba' }));
    expect(onOpen).toHaveBeenCalledWith(tasks[0]);
  });

  it('un lector no puede cambiar el estado', () => {
    setup(tasks, { canEdit: false });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
