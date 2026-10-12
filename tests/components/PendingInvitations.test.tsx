import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Invitation } from '@/types/invitation';

const team = vi.hoisted(() => ({ revokeInvitation: vi.fn(), emit: (() => {}) as (list: Invitation[]) => void }));
vi.mock('@/services/team.service', () => ({
  revokeInvitation: team.revokeInvitation,
  subscribeToInvitations: (onData: (list: Invitation[]) => void) => {
    team.emit = onData;
    return () => {};
  },
  InvitationError: Error,
}));

import { PendingInvitations } from '@/components/team/PendingInvitations';

const invitation = (email: string, status: Invitation['status']): Invitation => ({
  email, status, role: 'member', invitedBy: 'admin', acceptedBy: null, rev: 1, createdAt: 1,
});

describe('PendingInvitations', () => {
  it('muestra solo las pendientes y permite cancelarlas', async () => {
    team.revokeInvitation.mockResolvedValue(undefined);
    render(<PendingInvitations adminUid="admin" />);
    act(() => team.emit([invitation('pend@x.com', 'pending'), invitation('ok@x.com', 'accepted')]));
    expect(screen.queryByText('ok@x.com')).not.toBeInTheDocument();
    const row = screen.getByText('pend@x.com').closest('li')!;
    expect(within(row).getByRole('button', { name: /copiar link/i })).toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: /cancelar/i }));
    expect(team.revokeInvitation).toHaveBeenCalledWith('admin', 'pend@x.com');
  });

  it('avisa si no hay invitaciones pendientes', () => {
    render(<PendingInvitations adminUid="admin" />);
    act(() => team.emit([]));
    expect(screen.getByText('No hay invitaciones pendientes.')).toBeInTheDocument();
  });
});
