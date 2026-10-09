import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TodoList } from '@/components/tasks/TodoList';
import type { Task } from '@/types/task';

const tasks: Task[] = [
  { id: '1', createdBy: 'u', updatedBy: 'u', rev: 1, title: 'Comprar yerba', description: 'Dos kilos', completed: false, priority: 'media', dueDate: null, createdAt: 2 },
  { id: '2', createdBy: 'u', updatedBy: 'u', rev: 1, title: 'Pagar luz', description: '', completed: true, priority: 'media', dueDate: null, createdAt: 1 },
];

function setup(list: Task[] = tasks) {
  const handlers = { onToggle: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  render(<TodoList tasks={list} {...handlers} />);
  return handlers;
}

describe('TodoList', () => {
  it('muestra cada tarea con su estado', () => {
    setup();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Dos kilos')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /completar "pagar luz"/i })).toBeChecked();
  });

  it('muestra prioridad y vencimiento', () => {
    setup([{ ...tasks[0], priority: 'alta', dueDate: '2020-01-01' }]);
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText(/vencida/i)).toBeInTheDocument();
  });

  it('muestra un estado vacío', () => {
    setup([]);
    expect(screen.getByText('Todavía no tienes tareas')).toBeInTheDocument();
  });

  it('acepta un mensaje vacío personalizado (p. ej. para filtros)', () => {
    render(<TodoList tasks={[]} emptyTitle="No hay tareas en este filtro" onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No hay tareas en este filtro')).toBeInTheDocument();
  });

  it('marca una tarea como completada', async () => {
    const { onToggle } = setup();
    await userEvent.click(screen.getByRole('checkbox', { name: /completar "comprar yerba"/i }));
    expect(onToggle).toHaveBeenCalledWith('1', true);
  });

  it('pide editar la tarea', async () => {
    const { onEdit } = setup();
    await userEvent.click(screen.getByRole('button', { name: /editar "comprar yerba"/i }));
    expect(onEdit).toHaveBeenCalledWith(tasks[0]);
  });

  it('pide confirmación antes de eliminar', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: /eliminar "comprar yerba"/i }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /sí, eliminar/i }));
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  describe('permisos', () => {
    it('un lector no ve el checkbox ni los botones de editar y eliminar', () => {
      render(<TodoList tasks={tasks} canEdit={false} canDelete={() => false} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
    });

    it('un miembro edita todo, pero solo ve "Eliminar" en las tareas que creó', () => {
      const mixed: Task[] = [tasks[0], { ...tasks[1], createdBy: 'otra' }];
      render(
        <TodoList tasks={mixed} canDelete={(t) => t.createdBy === 'u'} onToggle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );
      expect(screen.getAllByRole('button', { name: /editar/i })).toHaveLength(2);
      expect(screen.getByRole('button', { name: /eliminar "comprar yerba"/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /eliminar "pagar luz"/i })).not.toBeInTheDocument();
    });
  });

  it('permite cancelar la eliminación', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: /eliminar "comprar yerba"/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /eliminar "comprar yerba"/i })).toBeInTheDocument();
  });
});
