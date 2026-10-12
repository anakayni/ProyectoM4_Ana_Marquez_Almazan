import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskTable } from '@/components/tasks/TaskTable';
import type { Task } from '@/types/task';

const portal = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'a', startDate: '2026-10-01', endDate: '2026-11-30',
  archived: false, createdBy: 'a', createdAt: 1, rev: 1,
};
const task: Task = {
  id: 't', createdBy: 'a', updatedBy: 'a', rev: 1, title: 'Revisar login', description: 'Cabeceras', status: 'doing',
  assigneeId: 'ana', completedBy: null, completedAt: null, projectId: 'p1', number: 108,
  subtasks: [{ id: 's1', title: 'A', done: true }, { id: 's2', title: 'B', done: false }], priority: 'alta', dueDate: null, createdAt: 1,
};

function setup() {
  const handlers = { onStatusChange: vi.fn(), onOpen: vi.fn() };
  render(
    <TaskTable
      tasks={[task]} nameOf={(uid) => (uid === 'ana' ? 'Ana' : null)} personOf={() => null}
      projectOf={(id) => (id === 'p1' ? portal : null)} canEdit {...handlers}
    />,
  );
  return handlers;
}

describe('TaskTable', () => {
  it('muestra las columnas con datos reales', () => {
    setup();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['#', 'Tarea', 'Prioridad y proyecto', 'Vence', 'Asignado', 'Estado']);
    const row = screen.getByRole('row', { name: /Revisar login/ });
    expect(within(row).getByText('MC-108')).toBeInTheDocument();
    expect(within(row).getByText('Cabeceras')).toBeInTheDocument();
    expect(within(row).getByText('☑ 1 de 2')).toBeInTheDocument();
    expect(within(row).getByText('Alta')).toBeInTheDocument();
    expect(within(row).getByText('Portal')).toBeInTheDocument();
    expect(within(row).getByText('Sin fecha')).toBeInTheDocument();
    expect(within(row).getByText('Ana')).toBeInTheDocument();
  });

  it('abre el panel y cambia el estado', async () => {
    const { onOpen, onStatusChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Revisar login' }));
    expect(onOpen).toHaveBeenCalledWith(task);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado de "Revisar login"' }), 'done');
    expect(onStatusChange).toHaveBeenCalledWith('t', 'done');
  });
});
