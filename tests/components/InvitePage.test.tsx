import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Invitation } from '@/types/invitation';

const { team, InvitationError } = vi.hoisted(() => {
  class InvitationError extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    InvitationError,
    team: {
      createInvitation: vi.fn(),
      revokeInvitation: vi.fn(),
      emit: (_list: Invitation[]) => {},
    },
  };
});

vi.mock('@/services/team.service', () => ({
  createInvitation: team.createInvitation,
  revokeInvitation: team.revokeInvitation,
  subscribeToInvitations: (onData: (list: Invitation[]) => void) => {
    team.emit = onData;
    return () => {};
  },
  InvitationError,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { uid: 'admin', email: 'a@x.com', displayName: 'Admin', role: 'admin', active: true, invitedBy: null, rev: 1 },
  }),
}));

import { InvitePage } from '@/pages/InvitePage';

const invitation = (email: string, status: Invitation['status']): Invitation => ({
  email, status, role: 'member', invitedBy: 'admin', acceptedBy: null, rev: 1, createdAt: 1,
});

function renderPage() {
  render(<MemoryRouter><InvitePage /></MemoryRouter>);
}

describe('InvitePage', () => {
  beforeEach(() => {
    team.createInvitation.mockReset();
    team.revokeInvitation.mockReset();
  });

  it('valida el email antes de llamar al servicio', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'no-es-email');
    await userEvent.click(screen.getByRole('button', { name: /invitar/i }));
    expect(screen.getByText('El email no tiene un formato válido.')).toBeInTheDocument();
    expect(team.createInvitation).not.toHaveBeenCalled();
  });

  it('invita con el rol elegido y muestra el link para compartir', async () => {
    team.createInvitation.mockResolvedValue('nuevo@x.com');
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'Nuevo@x.com');
    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'viewer');
    await userEvent.click(screen.getByRole('button', { name: /invitar/i }));
    expect(team.createInvitation).toHaveBeenCalledWith('admin', 'Nuevo@x.com', 'viewer');
    expect(await screen.findByText(/\/register\?email=nuevo%40x\.com/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /copiar link/i }).length).toBeGreaterThan(0);
  });

  it('muestra el mensaje del servicio si el email ya tiene invitación', async () => {
    team.createInvitation.mockRejectedValue(new InvitationError('already-pending', 'Este email ya tiene una invitación pendiente.'));
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'nuevo@x.com');
    await userEvent.click(screen.getByRole('button', { name: /invitar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Este email ya tiene una invitación pendiente.');
  });

  it('lista las invitaciones y permite cancelar solo las pendientes', async () => {
    team.revokeInvitation.mockResolvedValue(undefined);
    renderPage();
    act(() => team.emit([invitation('pend@x.com', 'pending'), invitation('ok@x.com', 'accepted')]));

    const pending = screen.getByText('pend@x.com').closest('li')!;
    const accepted = screen.getByText('ok@x.com').closest('li')!;
    expect(within(pending).getByText('Pendiente')).toBeInTheDocument();
    expect(within(accepted).getByText('Aceptada')).toBeInTheDocument();
    expect(within(accepted).queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();

    await userEvent.click(within(pending).getByRole('button', { name: /cancelar/i }));
    expect(team.revokeInvitation).toHaveBeenCalledWith('admin', 'pend@x.com');
  });
});
