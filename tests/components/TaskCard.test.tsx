import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskCard } from '@/components/tasks/TaskCard';
import type { Task } from '@/types/task';

const task: Task = {
  id: 't1', createdBy: 'a', updatedBy: 'a', rev: 1, title: 'Rediseñar la portada', description: 'Nueva propuesta de portada.',
  status: 'todo', assigneeId: 'leo', completedBy: null, completedAt: null, projectId: 'p1', number: 12,
  subtasks: [{ id: 's1', title: 'a', done: true }, { id: 's2', title: 'b', done: false }, { id: 's3', title: 'c', done: false }, { id: 's4', title: 'd', done: false }],
  priority: 'alta', dueDate: '2026-10-14', createdAt: 1,
};
const portal = { id: 'p1', name: 'Portal', color: '#4D7C8A' } as never;

describe('TaskCard', () => {
  it('muestra número, prioridad, título, subtareas, responsable, fecha vencida y proyecto', () => {
    render(
      <TaskCard
        task={task} today="2026-10-16" editable
        nameOf={(id) => (id === 'leo' ? 'Leo' : null)} personOf={() => ({ name: 'Leo', photo: null, active: true })}
        projectOf={() => portal} onStatusChange={vi.fn()} onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText('MC-12')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rediseñar la portada' })).toBeInTheDocument();
    expect(screen.getByText('1/4')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Subtareas de Rediseñar la portada' })).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('Asignada a')).toBeInTheDocument();
    expect(screen.getByText(/Vencida/)).toHaveClass('overdue');
    expect(screen.getByText('Portal')).toBeInTheDocument();
    expect(screen.getByLabelText('Estado de "Rediseñar la portada"')).toBeInTheDocument();
  });
});
