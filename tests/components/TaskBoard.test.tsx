import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import type { Task, TaskStatus } from '@/types/task';

const task = (id: string, status: TaskStatus): Task => ({
  id, createdBy: 'u', updatedBy: 'u', rev: 1, title: `Tarea ${id}`, description: '', status, assigneeId: null,
  completedBy: null, completedAt: null, projectId: null, number: 1, subtasks: [], priority: 'media', dueDate: null, createdAt: 1,
});
const tasks = [task('1', 'todo'), task('2', 'todo'), task('3', 'doing')];
const nameOf = () => null;

describe('TaskBoard', () => {
  it('reparte las tareas en 3 columnas con su conteo', () => {
    render(<TaskBoard tasks={tasks} nameOf={nameOf} personOf={() => null} projectOf={() => null} canEdit onStatusChange={vi.fn()} onOpen={vi.fn()} />);
    const todo = screen.getByRole('region', { name: /Pendiente/ });
    expect(within(todo).getAllByRole('listitem')).toHaveLength(2);
    expect(within(todo).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: /En curso/ })).getAllByRole('listitem')).toHaveLength(1);
    expect(within(screen.getByRole('region', { name: /Hecha/ })).getByText('Sin tareas')).toBeInTheDocument();
  });

  it('mueve una tarea de columna con el selector', async () => {
    const onStatusChange = vi.fn();
    render(<TaskBoard tasks={tasks} nameOf={nameOf} personOf={() => null} projectOf={() => null} canEdit onStatusChange={onStatusChange} onOpen={vi.fn()} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado de "Tarea 3"' }), 'done');
    expect(onStatusChange).toHaveBeenCalledWith('3', 'done');
  });

  it('abre una tarea al hacer clic en su título', async () => {
    const onOpen = vi.fn();
    render(<TaskBoard tasks={tasks} nameOf={nameOf} personOf={() => null} projectOf={() => null} canEdit onStatusChange={vi.fn()} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tarea 1' }));
    expect(onOpen).toHaveBeenCalledWith(tasks[0]);
  });

  it('"+ Agregar tarea" en Pendiente y En curso avisa la columna; en Hecha no hay', async () => {
    const onAdd = vi.fn();
    render(<TaskBoard tasks={tasks} nameOf={nameOf} personOf={() => null} projectOf={() => null} canEdit onStatusChange={vi.fn()} onOpen={vi.fn()} onAdd={onAdd} />);
    expect(screen.getAllByRole('button', { name: '+ Agregar tarea' })).toHaveLength(2);
    await userEvent.click(within(screen.getByRole('region', { name: /En curso/ })).getByRole('button', { name: '+ Agregar tarea' }));
    expect(onAdd).toHaveBeenCalledWith('doing');
    expect(within(screen.getByRole('region', { name: /Hecha/ })).queryByRole('button', { name: '+ Agregar tarea' })).not.toBeInTheDocument();
  });

  it('sin permiso para crear no hay "+ Agregar tarea"', () => {
    render(<TaskBoard tasks={tasks} nameOf={nameOf} personOf={() => null} projectOf={() => null} canEdit onStatusChange={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '+ Agregar tarea' })).not.toBeInTheDocument();
  });
});
