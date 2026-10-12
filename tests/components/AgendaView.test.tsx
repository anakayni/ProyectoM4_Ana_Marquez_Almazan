import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgendaView } from '@/components/calendar/AgendaView';
import type { Task } from '@/types/task';

const task: Task = {
  id: '8', createdBy: 'x', updatedBy: 'x', rev: 1, title: 'Revisar login', description: '', status: 'doing', assigneeId: 'ana',
  completedBy: null, completedAt: null, projectId: null, number: 8, subtasks: [], priority: 'media', dueDate: '2026-10-12', createdAt: 1,
};

describe('AgendaView', () => {
  it('lista los días con contenido, con "Hoy" y "+" por día', async () => {
    const onCreate = vi.fn();
    const onOpenTask = vi.fn();
    render(
      <AgendaView
        days={[{ date: '2026-10-12', tasks: [task], markers: [] }]} projectOf={() => null}
        nameOf={(uid) => (uid === 'ana' ? 'Ana' : null)} today="2026-10-12" onCreate={onCreate} onOpenTask={onOpenTask}
      />,
    );
    expect(screen.getByRole('heading', { name: /Hoy · lunes, 12 de octubre/ })).toBeInTheDocument();
    expect(screen.getByText('Sin proyecto · En curso · Ana')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /MC-8 Revisar login/ }));
    expect(onOpenTask).toHaveBeenCalledWith(task);
    await userEvent.click(screen.getByRole('button', { name: 'Nueva tarea el 12 de octubre' }));
    expect(onCreate).toHaveBeenCalledWith('2026-10-12');
  });

  it('sin nada en el mes lo dice', () => {
    render(<AgendaView days={[]} projectOf={() => null} nameOf={() => null} today="2026-10-12" onCreate={null} onOpenTask={vi.fn()} />);
    expect(screen.getByText('No hay tareas ni fechas de proyectos este mes.')).toBeInTheDocument();
  });
});
