import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser, UserProfile } from '@/types/auth';

let emitAuth: (user: AuthUser | null) => void = () => {};
let emitProfile: (profile: UserProfile | null) => void = () => {};

vi.mock('@/services/auth.service', () => ({
  subscribeToAuth: vi.fn((cb: (user: AuthUser | null) => void) => {
    emitAuth = cb;
    return () => {};
  }),
  loginWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  registerWithEmail: vi.fn(),
  logout: vi.fn(),
  resendVerification: vi.fn(),
  reloadUser: vi.fn(),
}));

// vi.mock se "eleva" al principio del archivo: lo que usa adentro tiene que crearse con vi.hoisted.
const { NoInvitationError, claimInvitation } = vi.hoisted(() => ({
  NoInvitationError: class NoInvitationError extends Error {},
  claimInvitation: vi.fn(),
}));

vi.mock('@/services/team.service', () => ({
  subscribeToProfile: vi.fn((_uid: string, cb: (profile: UserProfile | null) => void) => {
    emitProfile = cb;
    return () => {};
  }),
  claimInvitation,
  NoInvitationError,
}));

import { AuthProvider, useAuth } from '@/hooks/useAuth';

const ana: AuthUser = { uid: 'ana', email: 'ana@mail.com', displayName: 'Ana', emailVerified: true };
const anaProfile: UserProfile = {
  uid: 'ana', email: 'ana@mail.com', displayName: 'Ana', role: 'member', active: true, invitedBy: 'admin', rev: 1,
};

function Probe() {
  const { access, profile } = useAuth();
  return <p>{access}{profile ? ` · ${profile.role}` : ''}</p>;
}

function renderProvider() {
  render(<AuthProvider><Probe /></AuthProvider>);
}

describe('useAuth', () => {
  beforeEach(() => {
    emitAuth = () => {};
    emitProfile = () => {};
    claimInvitation.mockReset();
  });

  it('pasa de cargando a sin sesión', () => {
    renderProvider();
    expect(screen.getByText('loading')).toBeInTheDocument();
    act(() => emitAuth(null));
    expect(screen.getByText('signed-out')).toBeInTheDocument();
  });

  it('con el email sin verificar queda en "unverified"', () => {
    renderProvider();
    act(() => emitAuth({ ...ana, emailVerified: false }));
    expect(screen.getByText('unverified')).toBeInTheDocument();
  });

  it('con perfil activo queda en "active" y expone el rol', () => {
    renderProvider();
    act(() => emitAuth(ana));
    act(() => emitProfile(anaProfile));
    expect(screen.getByText('active · member')).toBeInTheDocument();
  });

  it('sin perfil intenta reclamar la invitación', async () => {
    claimInvitation.mockResolvedValue(undefined);
    renderProvider();
    act(() => emitAuth(ana));
    act(() => emitProfile(null));
    await waitFor(() => expect(claimInvitation).toHaveBeenCalledWith(ana));
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('sin perfil y sin invitación queda en "no-invitation"', async () => {
    claimInvitation.mockRejectedValue(new NoInvitationError());
    renderProvider();
    act(() => emitAuth(ana));
    act(() => emitProfile(null));
    expect(await screen.findByText('no-invitation')).toBeInTheDocument();
  });

  it('si un admin lo desactiva, pasa a "inactive" al instante', () => {
    renderProvider();
    act(() => emitAuth(ana));
    act(() => emitProfile(anaProfile));
    act(() => emitProfile({ ...anaProfile, active: false }));
    expect(screen.getByText('inactive · member')).toBeInTheDocument();
  });

  it('lanza un error claro si se usa fuera del provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useAuth debe usarse dentro de <AuthProvider>');
  });
});
