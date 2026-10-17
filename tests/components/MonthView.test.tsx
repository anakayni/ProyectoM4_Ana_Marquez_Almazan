import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MonthView } from '@/components/calendar/MonthView';
import { monthGrid, projectMarkers, tasksByDay } from '@/features/calendar/month';
import type { Project } from '@/types/project';
import type { Task, TaskStatus } from '@/types/task';

const TODAY = '2026-10-12';
const task = (number: number, dueDate: string, status: TaskStatus = 'todo'): Task => ({
  id: String(number), createdBy: 'x', updatedBy: 'x', rev: 1, title: `Tarea ${number}`, description: '', status, assigneeId: null,
  completedBy: null, completedAt: null, projectId: null, number, subtasks: [], priority: 'media', dueDate, createdAt: 1,
});
const portal: Project = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'a', startDate: '2026-10-01', endDate: '2026-10-30',
  archived: false, createdBy: 'a', createdAt: 1, rev: 1,
};

function setup(tasks: Task[], canCreate = true) {
  const handlers = { onOpenTask: vi.fn(), onCreate: canCreate ? vi.fn() : null, onOpenDay: vi.fn() };
  render(
    <MonthView
      grid={monthGrid(2026, 9, TODAY)} byDay={tasksByDay(tasks)} markers={projectMarkers([portal])}
      projectOf={() => null} today={TODAY} {...handlers}
    />,
  );
  return handlers;
}
const cell = (date: string) => screen.getByTestId(`day-${date}`);

describe('MonthView', () => {
  it('es una tabla con los días de la semana como encabezados', () => {
    setup([]);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
  });

  it('muestra las tareas en su día, vencidas y hechas, y abre el panel', async () => {
    const { onOpenTask } = setup([task(4, '2026-10-05'), task(5, '2026-10-08', 'done'), task(8, '2026-10-12')]);
    expect(within(cell('2026-10-05')).getByRole('button', { name: /MC-4 Tarea 4/ })).toHaveClass('overdue');
    expect(within(cell('2026-10-08')).getByRole('button', { name: /MC-5 Tarea 5/ })).toHaveClass('done');
    await userEvent.click(within(cell('2026-10-12')).getByRole('button', { name: /MC-8 Tarea 8/ }));
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ number: 8 }));
  });

  it('marca inicio y fin de proyecto', () => {
    setup([]);
    expect(within(cell('2026-10-01')).getByText('Inicio · Portal')).toBeInTheDocument();
    expect(within(cell('2026-10-30')).getByText('Fin · Portal')).toBeInTheDocument();
  });

  it('"+" crea en ese día; un lector no lo ve', async () => {
    const { onCreate } = setup([]);
    await userEvent.click(screen.getByRole('button', { name: 'Nueva tarea el 20 de octubre' }));
    expect(onCreate).toHaveBeenCalledWith('2026-10-20');
  });

  it('sin permiso de crear no hay "+"', () => {
    setup([], false);
    expect(screen.queryByRole('button', { name: /Nueva tarea el/ })).not.toBeInTheDocument();
  });

  it('con más de 3 tareas muestra "+N más" y abre el día', async () => {
    const { onOpenDay } = setup([1, 2, 3, 4, 5].map((n) => task(n, '2026-10-14')));
    const day = cell('2026-10-14');
    expect(within(day).getAllByRole('button', { name: /MC-/ })).toHaveLength(3);
    await userEvent.click(within(day).getByRole('button', { name: '+2 más' }));
    expect(onOpenDay).toHaveBeenCalledWith('2026-10-14');
  });

  it('resalta hoy', () => {
    setup([]);
    expect(cell(TODAY)).toHaveAttribute('aria-current', 'date');
  });
});
