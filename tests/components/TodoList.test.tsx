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
  const handlers = { onStatusChange: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
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

  it('pide editar la tarea', async () => {
    const { onEdit } = setup();
    await userEvent.click(screen.getByRole('button', { name: /editar "comprar yerba"/i }));
    expect(onEdit).toHaveBeenCalledWith(tasks[0]);
  });

  it('pide confirmación antes de eliminar y permite cancelar', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: /eliminar "comprar yerba"/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /eliminar "comprar yerba"/i }));
    await userEvent.click(screen.getByRole('button', { name: /sí, eliminar/i }));
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  describe('permisos', () => {
    it('un lector no ve controles de edición', () => {
      setup(tasks, { canEdit: false, canDelete: () => false });
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /editar|eliminar/i })).not.toBeInTheDocument();
    });

    it('un miembro solo ve "Eliminar" en las tareas que creó', () => {
      setup([tasks[0], { ...tasks[1], createdBy: 'otra' }], { canDelete: (t) => t.createdBy === 'u' });
      expect(screen.getByRole('button', { name: /eliminar "comprar yerba"/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /eliminar "pagar luz"/i })).not.toBeInTheDocument();
    });
  });
});
