import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';

vi.mock('@/components/tasks/TaskHistory', () => ({ TaskHistory: () => null }));

import { TaskDialogs } from '@/components/tasks/TaskDialogs';

const me: UserProfile = { uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'member', active: true, invitedBy: null, rev: 1 };

describe('TaskDialogs', () => {
  it('crea con los valores iniciales (p. ej. el día del calendario)', async () => {
    const actions = { create: vi.fn().mockResolvedValue('n'), update: vi.fn(), remove: vi.fn() };
    const onCloseCreate = vi.fn();
    const onToast = vi.fn();
    render(
      <TaskDialogs
        profile={me} tasks={[]} members={[]} projects={[]} openId={null} onCloseTask={vi.fn()}
        creating={{ dueDate: '2026-10-20' }} onCloseCreate={onCloseCreate} actions={actions} onToast={onToast}
      />,
    );
    expect(screen.getByLabelText('Vence')).toHaveValue('2026-10-20');
    await userEvent.type(screen.getByLabelText('Título'), 'Llamar');
    await userEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));
    expect(actions.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Llamar', dueDate: '2026-10-20', assigneeId: 'ana' }));
    expect(onCloseCreate).toHaveBeenCalled();
    expect(onToast).toHaveBeenCalledWith({ kind: 'success', message: 'Tarea creada.' });
  });
});
