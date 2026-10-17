import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { GanttView } from '@/components/calendar/GanttView';
import { ganttRange } from '@/features/calendar/gantt';
import type { Project } from '@/types/project';
import type { Task, TaskStatus } from '@/types/task';

const TODAY = '2026-10-12';
const project = (id: string, name: string, startDate: string, endDate: string): Project => ({
  id, name, description: '', color: '#4D7C8A', ownerId: 'ana', startDate, endDate, archived: false, createdBy: 'a', createdAt: 1, rev: 1,
});
const task = (number: number, projectId: string, dueDate: string, status: TaskStatus = 'todo'): Task => ({
  id: String(number), createdBy: 'x', updatedBy: 'x', rev: 1, title: `Tarea ${number}`, description: '', status, assigneeId: null,
  completedBy: null, completedAt: null, projectId, number, subtasks: [], priority: 'media', dueDate, createdAt: 1,
});

function setup(onOpenTask = vi.fn()) {
  render(
    <MemoryRouter>
      <GanttView
        projects={[project('p1', 'Portal', '2026-10-01', '2026-11-30'), project('p2', 'Viejo', '2026-01-01', '2026-02-01')]}
        tasks={[task(1, 'p1', '2026-10-05', 'done'), task(2, 'p1', '2026-10-08'), task(3, 'p1', '2026-10-20'), task(4, 'p1', '2026-12-20')]}
        range={ganttRange('2026-09-28')} today={TODAY} nameOf={(uid) => (uid === 'ana' ? 'Ana' : null)} onOpenTask={onOpenTask}
      />
    </MemoryRouter>,
  );
  return onOpenTask;
}

describe('GanttView', () => {
  it('muestra las semanas', () => {
    setup();
    expect(screen.getByText('Sem 40')).toBeInTheDocument();
    expect(screen.getByText('Sem 44')).toBeInTheDocument();
  });

  it('una fila por proyecto que se cruza con la ventana, con su barra como enlace', () => {
    setup();
    // El nombre aparece en la columna fija y dentro de la barra: se busca en la columna.
    expect(screen.getByText('Portal', { selector: '.name' })).toBeInTheDocument();
    expect(screen.queryByText('Viejo')).not.toBeInTheDocument();
    const bar = screen.getByRole('link', { name: /Portal, 1 de octubre a 30 de noviembre, 25% hecho/ });
    expect(bar).toHaveAttribute('href', '/projects/p1');
    expect(screen.getByText('A cargo: Ana')).toBeInTheDocument();
  });

  it('las tareas dentro de la ventana son ◆ con su estado, y abren el panel', async () => {
    const onOpenTask = setup();
    expect(screen.getByRole('button', { name: /MC-1 Tarea 1, vence 5 de octubre, Hecha/ })).toHaveClass('done');
    expect(screen.getByRole('button', { name: /MC-2 Tarea 2, vence 8 de octubre, Pendiente/ })).toHaveClass('overdue');
    expect(screen.queryByRole('button', { name: /MC-4/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /MC-3/ }));
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ number: 3 }));
  });

  it('marca hoy', () => {
    setup();
    expect(screen.getByText('Hoy · 12 de octubre')).toBeInTheDocument();
  });

  it('sin proyectos en la ventana lo dice', () => {
    render(
      <MemoryRouter>
        <GanttView projects={[]} tasks={[]} range={ganttRange('2026-09-28')} today={TODAY} nameOf={() => null} onOpenTask={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('No hay proyectos en estas semanas.')).toBeInTheDocument();
  });
});
