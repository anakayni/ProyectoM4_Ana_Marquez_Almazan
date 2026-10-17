import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';

const svc = vi.hoisted(() => ({ setProjectMembers: vi.fn(), updateProject: vi.fn(), createInvitation: vi.fn() }));
vi.mock('@/services/projects.service', () => ({ setProjectMembers: svc.setProjectMembers, updateProject: svc.updateProject }));
vi.mock('@/services/team.service', () => ({ createInvitation: svc.createInvitation }));
vi.mock('@/hooks/usePendingGuestInvitations', () => ({ usePendingGuestInvitations: (on: boolean) => (on ? ['pendiente@x.com'] : []) }));

import { ShareProjectDialog } from '@/components/projects/ShareProjectDialog';

const person = (uid: string, name: string, role: Role): UserProfile =>
  ({ uid, email: `${uid}@x.com`, displayName: name, role, active: true, invitedBy: null, rev: 1 });
const members = [person('ana', 'Ana', 'member'), person('gus', 'Gus', 'guest'), person('leo', 'Leo', 'guest'), person('mar', 'Mar', 'member'), person('admin', 'Admin', 'admin')];
const project = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', memberIds: ['gus', 'mar'], guestAccess: { gus: 'view' },
  startDate: '2026-10-01', endDate: '2026-11-30', archived: false, createdBy: 'ana', createdAt: 1, rev: 1,
} as Project;
const tasks: Task[] = [];

function renderDialog(props: Partial<Parameters<typeof ShareProjectDialog>[0]> = {}) {
  return render(<ShareProjectDialog project={project} members={members} tasks={tasks} actorId="admin" canManage onClose={vi.fn()} {...props} />);
}

describe('ShareProjectDialog', () => {
  beforeEach(() => {
    for (const fn of Object.values(svc)) {
      fn.mockReset();
      fn.mockResolvedValue(undefined);
    }
  });

  it('muestra el enlace del proyecto y lo copia', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderDialog();
    expect(screen.getByLabelText('Enlace del proyecto')).toHaveValue(`${window.location.origin}/projects/p1`);
    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/projects/p1`);
    expect(screen.getByText('Enlace copiado.')).toBeInTheDocument();
  });

  it('busca y agrega a alguien', async () => {
    renderDialog();
    await userEvent.type(screen.getByLabelText('Agregar personas'), 'le');
    await userEvent.click(screen.getByRole('button', { name: 'Leo (Invitado)' }));
    expect(svc.setProjectMembers).toHaveBeenCalledWith('admin', 'p1', ['gus', 'mar', 'leo']);
  });

  it('invita un email nuevo como Invitado', async () => {
    renderDialog();
    await userEvent.type(screen.getByLabelText('Agregar personas'), 'nuevo@x.com');
    await userEvent.click(screen.getByRole('button', { name: 'Invitar a nuevo@x.com como Invitado' }));
    expect(svc.createInvitation).toHaveBeenCalledWith('admin', 'nuevo@x.com', 'guest');
    expect(screen.getByText('Invitación creada. Cuando cree su cuenta, agrégala desde aquí.')).toBeInTheDocument();
  });

  it('cambia el acceso de un Invitado y lo quita con confirmación', async () => {
    renderDialog();
    const access = screen.getByLabelText('Acceso de Gus');
    expect(access).toHaveValue('view');
    await userEvent.selectOptions(access, 'Puede editar');
    expect(svc.setProjectMembers).toHaveBeenLastCalledWith('admin', 'p1', ['gus', 'mar'], { gus: 'edit' });
    await userEvent.click(screen.getByRole('button', { name: 'Quitar a Gus' }));
    expect(screen.getByText('Gus dejará de ver este proyecto.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }));
    expect(svc.setProjectMembers).toHaveBeenLastCalledWith('admin', 'p1', ['mar']);
  });

  it('el responsable tiene su etiqueta y se puede pasar a otra persona del equipo', async () => {
    renderDialog();
    const list = screen.getByRole('list', { name: 'En este proyecto' });
    expect(within(list).getByText('Ana').closest('li')).toHaveTextContent('Responsable');
    expect(within(list).getByText('Mar').closest('li')).toHaveTextContent('Miembro');
    await userEvent.click(screen.getByRole('button', { name: 'Hacer responsable a Mar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, hacer responsable' }));
    expect(svc.updateProject).toHaveBeenCalledWith('admin', 'p1', { ownerId: 'mar' });
  });

  it('quien no es admin solo mira', () => {
    renderDialog({ canManage: false, actorId: 'gus' });
    expect(screen.queryByLabelText('Agregar personas')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Acceso de Gus')).not.toBeInTheDocument();
    expect(screen.getByText('Gus').closest('li')).toHaveTextContent('Tú');
    expect(screen.getByText('Gus').closest('li')).toHaveTextContent('Solo ver');
  });

  it('recién creado dice "¡Proyecto creado!" y "Ahora no"', () => {
    const onClose = vi.fn();
    renderDialog({ justCreated: true, onClose });
    expect(screen.getByRole('dialog', { name: '¡Proyecto creado!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ahora no' })).toBeInTheDocument();
  });

  it('avisa las invitaciones pendientes', () => {
    renderDialog();
    expect(screen.getByText(/pendiente@x\.com/)).toHaveTextContent('Podrás agregarla cuando cree su cuenta.');
  });

  it('debajo de cada nombre se ve su rol', () => {
    renderDialog();
    const list = screen.getByRole('list', { name: 'En este proyecto' });
    expect(within(list).getByText('Gus').closest('li')?.querySelector('small')).toHaveTextContent('Invitado');
    expect(within(list).getByText('Mar').closest('li')?.querySelector('small')).toHaveTextContent('Miembro');
  });
});
