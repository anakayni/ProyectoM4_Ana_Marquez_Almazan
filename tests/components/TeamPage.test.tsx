import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Task } from '@/types/task';

const state = vi.hoisted(() => ({
  me: null as UserProfile | null,
  members: [] as UserProfile[],
  tasks: [] as Task[],
  updateMember: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: state.me }) }));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => state.members }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: state.tasks }) }));
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
  assigneeId, completedBy: null, completedAt: null, projectId: null, priority: 'media', dueDate: null, createdAt: 1,
});
const row = (name: string) => screen.getByText(name).closest('li')!;

describe('TeamPage', () => {
  beforeEach(() => {
    state.members = [person('ana', 'Ana', 'admin'), person('luis', 'Luis', 'member'), person('mario', 'Mario', 'member', false)];
    state.tasks = [task('luis'), task('luis'), task('luis'), task('mario')];
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
      expect(screen.getByRole('heading', { name: 'Invitaciones pendientes' })).toBeInTheDocument();
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
