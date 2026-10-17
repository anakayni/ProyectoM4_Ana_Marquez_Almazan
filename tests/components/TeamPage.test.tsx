import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';

const state = vi.hoisted(() => ({
  me: null as UserProfile | null,
  members: [] as UserProfile[],
  tasks: [] as Task[],
  projects: [] as Project[],
  updateMember: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: state.me }) }));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => state.members }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: state.tasks }) }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: state.projects, loading: false, error: null }) }));
vi.mock('@/services/team.service', () => ({
  updateMember: state.updateMember,
  subscribeToInvitations: () => () => {},
  createInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
  InvitationError: Error,
}));

import { TeamPage } from '@/pages/TeamPage';

const person = (uid: string, name: string, role: Role, active = true): UserProfile => ({
  uid, email: `${uid}@x.com`, displayName: name, role, active, invitedBy: null, rev: 1,
});
const task = (assigneeId: string): Task => ({
  id: Math.random().toString(), createdBy: 'x', updatedBy: 'x', rev: 1, title: 't', description: '', status: 'todo',
  assigneeId, completedBy: null, completedAt: null, projectId: null, number: 1, subtasks: [], priority: 'media', dueDate: null, createdAt: 1,
});
const row = (name: string) => screen.getByText(name).closest('li')!;

describe('TeamPage', () => {
  beforeEach(() => {
    state.members = [person('ana', 'Ana', 'admin'), person('luis', 'Luis', 'member'), person('mario', 'Mario', 'member', false)];
    state.tasks = [task('luis'), task('luis'), task('luis'), task('mario')];
    state.projects = [];
    state.updateMember.mockReset();
    state.updateMember.mockResolvedValue(undefined);
  });

  describe('como admin', () => {
    beforeEach(() => {
      state.me = state.members[0];
    });

    it('muestra integrantes, tareas abiertas e invitaciones', () => {
      render(<TeamPage />);
      expect(screen.getByRole('heading', { level: 1, name: 'Equipo' })).toBeInTheDocument();
      expect(screen.getByText('2 integrantes activos')).toBeInTheDocument();
      expect(within(row('Luis')).getByText('3 tareas abiertas')).toBeInTheDocument();
      expect(within(row('Mario')).getByText('Inactiva')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '+ Invitar' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Invitaciones pendientes' })).not.toBeInTheDocument();
    });

    it('las invitaciones están en su pestaña', async () => {
      render(<TeamPage />);
      expect(screen.getByRole('radio', { name: 'Integrantes' })).toBeChecked();
      await userEvent.click(screen.getByRole('radio', { name: /^Invitaciones/ }));
      expect(screen.getByRole('heading', { name: 'Invitaciones pendientes' })).toBeInTheDocument();
    });

    it('el buscador filtra por nombre o email', async () => {
      render(<TeamPage />);
      await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar persona' }), 'luis@');
      expect(screen.getByText('Luis')).toBeInTheDocument();
      expect(screen.queryByText('Mario')).not.toBeInTheDocument();
    });

    it('muestra los proyectos de cada Invitado', () => {
      state.members = [...state.members, person('gus', 'Gus', 'guest'), person('tom', 'Tom', 'guest')];
      state.projects = [{ id: 'p1', name: 'Portal', ownerId: 'ana', memberIds: ['gus'] } as unknown as Project];
      render(<TeamPage />);
      expect(row('Gus')).toHaveTextContent('Portal');
      expect(row('Tom')).toHaveTextContent('Sin proyectos');
      expect(row('Luis')).toHaveTextContent('Todos');
    });

    it('no pasa a Invitado a alguien que es responsable de un proyecto', async () => {
      state.projects = [{ id: 'p1', name: 'Portal', ownerId: 'luis', memberIds: [] } as unknown as Project];
      render(<TeamPage />);
      await userEvent.selectOptions(screen.getByLabelText('Rol de Luis'), 'Invitado');
      expect(state.updateMember).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('Luis es responsable de «Portal»: cambia el responsable antes de pasarlo a Invitado.');
    });

    it('no tiene controles sobre su propia fila', () => {
      render(<TeamPage />);
      expect(within(row('Ana')).getByText('Tú')).toBeInTheDocument();
      expect(within(row('Ana')).queryByRole('combobox')).not.toBeInTheDocument();
      expect(within(row('Ana')).queryByRole('button')).not.toBeInTheDocument();
    });

    it('cambia el rol de otra persona', async () => {
      render(<TeamPage />);
      await userEvent.selectOptions(within(row('Luis')).getByRole('combobox', { name: 'Rol de Luis' }), 'viewer');
      expect(state.updateMember).toHaveBeenCalledWith('ana', 'luis', { role: 'viewer' });
    });

    it('desactiva con aviso de las tareas que quedan a su nombre', async () => {
      render(<TeamPage />);
      await userEvent.click(within(row('Luis')).getByRole('button', { name: 'Desactivar' }));
      expect(within(row('Luis')).getByText(/Luis tiene 3 tareas sin terminar/)).toBeInTheDocument();
      expect(state.updateMember).not.toHaveBeenCalled();
      await userEvent.click(within(row('Luis')).getByRole('button', { name: 'Sí, desactivar' }));
      expect(state.updateMember).toHaveBeenCalledWith('ana', 'luis', { active: false });
    });

    it('reactiva a una persona inactiva', async () => {
      render(<TeamPage />);
      await userEvent.click(within(row('Mario')).getByRole('button', { name: 'Reactivar' }));
      expect(state.updateMember).toHaveBeenCalledWith('ana', 'mario', { active: true });
    });
  });

  describe('como miembro', () => {
    beforeEach(() => {
      state.me = state.members[1];
    });

    it('solo mira: sin invitar, sin controles y sin invitaciones', () => {
      render(<TeamPage />);
      expect(within(row('Luis')).getByText('Tú')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '+ Invitar' })).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /desactivar|reactivar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Invitaciones pendientes' })).not.toBeInTheDocument();
      expect(within(row('Ana')).getByText('Administrador')).toBeInTheDocument();
    });
  });
});
