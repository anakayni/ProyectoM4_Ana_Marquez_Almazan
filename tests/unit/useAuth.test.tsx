import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUser } from '@/types/auth';

let emitAuth: (user: AppUser | null) => void = () => {};

vi.mock('@/services/auth.service', () => ({
  subscribeToAuth: vi.fn((cb: (user: AppUser | null) => void) => {
    emitAuth = cb;
    return () => {};
  }),
  loginWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  registerWithEmail: vi.fn(),
  logout: vi.fn(),
}));

import { AuthProvider, useAuth } from '@/hooks/useAuth';

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <p>cargando</p>;
  return <p>{user ? `hola ${user.displayName}` : 'sin sesión'}</p>;
}

describe('useAuth', () => {
  beforeEach(() => {
    emitAuth = () => {};
  });

  it('empieza cargando y luego refleja el usuario de Firebase', () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText('cargando')).toBeInTheDocument();

    act(() => emitAuth({ uid: '1', email: 'ana@mail.com', displayName: 'Ana' }));
    expect(screen.getByText('hola Ana')).toBeInTheDocument();

    act(() => emitAuth(null));
    expect(screen.getByText('sin sesión')).toBeInTheDocument();
  });

  it('lanza un error claro si se usa fuera del provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useAuth debe usarse dentro de <AuthProvider>');
  });
});
