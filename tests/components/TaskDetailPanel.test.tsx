import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/tasks/TaskHistory', () => ({ TaskHistory: () => <ol><li>Ana creó la tarea</li></ol> }));

import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import type { Task } from '@/types/task';

const task: Task = {
  id: 't', createdBy: 'luis', updatedBy: 'ana', rev: 3, title: 'Revisar factura', description: 'Del proveedor',
  status: 'done', assigneeId: 'ana', completedBy: 'ana', completedAt: new Date(2026, 9, 8).getTime(),
  priority: 'alta', dueDate: null, createdAt: new Date(2026, 9, 3).getTime(),
};
const names: Record<string, string> = { ana: 'Ana', luis: 'Luis' };
const nameOf = (uid: string | null) => (uid ? names[uid] ?? null : null);

function setup(perms = { canEdit: true, canDelete: true }) {
  const handlers = { onClose: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onStatusChange: vi.fn() };
  render(<TaskDetailPanel task={task} nameOf={nameOf} {...perms} {...handlers} />);
  return handlers;
}

describe('TaskDetailPanel', () => {
  it('muestra los datos, quién la completó y el historial', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Revisar factura' })).toBeInTheDocument();
    expect(screen.getByText('Del proveedor')).toBeInTheDocument();
    expect(screen.getByText('Ana', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('Ana · 8 oct')).toBeInTheDocument();
    expect(screen.getByText('Luis · 3 oct')).toBeInTheDocument();
    expect(screen.getByText('Ana creó la tarea')).toBeInTheDocument();
  });

  it('editar y eliminar (con confirmación)', async () => {
    const { onEdit, onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalledWith(task);
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(onDelete).toHaveBeenCalledWith('t');
  });

  it('un lector no ve acciones', () => {
    setup({ canEdit: false, canDelete: false });
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
