import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { team, InvitationError } = vi.hoisted(() => {
  class InvitationError extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return { InvitationError, team: { createInvitation: vi.fn() } };
});
vi.mock('@/services/team.service', () => ({ createInvitation: team.createInvitation, InvitationError }));

import { InviteDialog } from '@/components/team/InviteDialog';

describe('InviteDialog', () => {
  beforeEach(() => {
    // Con llaves: mockReset() devuelve el mock y Vitest ejecutaría como "limpieza" cualquier función que devuelva el hook.
    team.createInvitation.mockReset();
  });

  it('valida el email antes de llamar al servicio', async () => {
    render(<InviteDialog adminUid="admin" onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Email'), 'no-es-email');
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }));
    expect(screen.getByText('El email no tiene un formato válido.')).toBeInTheDocument();
    expect(team.createInvitation).not.toHaveBeenCalled();
  });

  it('invita con el rol elegido y muestra el link para compartir', async () => {
    team.createInvitation.mockResolvedValue('nuevo@x.com');
    render(<InviteDialog adminUid="admin" onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Email'), 'Nuevo@x.com');
    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'viewer');
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }));
    expect(team.createInvitation).toHaveBeenCalledWith('admin', 'Nuevo@x.com', 'viewer');
    expect(await screen.findByText(/\/register\?email=nuevo%40x\.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar link/i })).toBeInTheDocument();
  });

  it('muestra el mensaje del servicio si el email ya tiene invitación', async () => {
    team.createInvitation.mockRejectedValue(new InvitationError('already-pending', 'Este email ya tiene una invitación pendiente.'));
    render(<InviteDialog adminUid="admin" onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Email'), 'nuevo@x.com');
    await userEvent.click(screen.getByRole('button', { name: 'Invitar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Este email ya tiene una invitación pendiente.');
  });
});
