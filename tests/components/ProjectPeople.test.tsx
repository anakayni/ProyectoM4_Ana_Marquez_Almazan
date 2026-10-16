import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';

const svc = vi.hoisted(() => ({ setProjectMembers: vi.fn() }));
vi.mock('@/services/projects.service', () => ({ setProjectMembers: svc.setProjectMembers }));
vi.mock('@/hooks/usePendingGuestInvitations', () => ({ usePendingGuestInvitations: (on: boolean) => (on ? ['nuevo@x.com'] : []) }));

import { ProjectPeople } from '@/components/projects/ProjectPeople';

const person = (uid: string, name: string, role: Role): UserProfile =>
  ({ uid, email: '', displayName: name, role, active: true, invitedBy: null, rev: 1 });
const members = [person('ana', 'Ana', 'member'), person('gus', 'Gus', 'guest'), person('admin', 'Admin', 'admin')];
const project = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', memberIds: ['gus'],
  startDate: '2026-10-01', endDate: '2026-11-30', archived: false, createdBy: 'ana', createdAt: 1, rev: 1,
} as Project;
const task = (assigneeId: string): Task => ({
  id: assigneeId + Math.random(), createdBy: 'ana', updatedBy: 'ana', rev: 1, title: 't', description: '', status: 'todo',
  assigneeId, completedBy: null, completedAt: null, projectId: 'p1', number: 1, subtasks: [], priority: 'media', dueDate: null, createdAt: 1,
});

function open(canManage: boolean) {
  render(<ProjectPeople project={project} members={members} tasks={[task('gus')]} actorId="admin" canManage={canManage} />);
  return userEvent.click(screen.getByRole('button', { name: 'Personas del proyecto (2)' }));
}

describe('ProjectPeople', () => {
  beforeEach(() => {
    svc.setProjectMembers.mockReset();
    svc.setProjectMembers.mockResolvedValue(undefined);
  });

  it('muestra a todos con sus etiquetas', async () => {
    await open(false);
    const dialog = screen.getByRole('dialog', { name: 'Personas del proyecto' });
    expect(within(dialog).getByText('Ana').closest('li')).toHaveTextContent('Responsable');
    expect(within(dialog).getByText('Gus').closest('li')).toHaveTextContent('Invitado');
    expect(within(dialog).queryByRole('button', { name: /Quitar/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Agregar persona')).not.toBeInTheDocument();
  });

  it('el admin agrega a alguien', async () => {
    await open(true);
    await userEvent.selectOptions(screen.getByLabelText('Agregar persona'), 'Admin');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(svc.setProjectMembers).toHaveBeenCalledWith('admin', 'p1', ['gus', 'admin']);
  });

  it('el admin quita a un Invitado después de confirmar', async () => {
    await open(true);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar a Gus' }));
    expect(screen.getByText(/Gus dejará de ver este proyecto\. Tiene 1 tarea asignada/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }));
    expect(svc.setProjectMembers).toHaveBeenCalledWith('admin', 'p1', []);
  });

  it('el responsable no se puede quitar y se avisan las invitaciones pendientes', async () => {
    await open(true);
    expect(screen.queryByRole('button', { name: 'Quitar a Ana' })).not.toBeInTheDocument();
    expect(screen.getByText(/nuevo@x\.com/)).toHaveTextContent('Podrás agregarla cuando cree su cuenta.');
  });
});
