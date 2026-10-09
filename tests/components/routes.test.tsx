import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Access, UserProfile } from '@/types/auth';

const authState: { access: Access; profile: UserProfile | null } = { access: 'loading', profile: null };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));

// Las páginas reales usan Firebase: acá se reemplazan por un título.
vi.mock('@/pages/LoginPage', () => ({ LoginPage: () => <h1>Login</h1> }));
vi.mock('@/pages/RegisterPage', () => ({ RegisterPage: () => <h1>Registro</h1> }));
vi.mock('@/pages/VerifyEmailPage', () => ({ VerifyEmailPage: () => <h1>Confirma tu email</h1> }));
vi.mock('@/pages/NoAccessPage', () => ({ NoAccessPage: () => <h1>Sin acceso</h1> }));
vi.mock('@/pages/TasksPage', () => ({ TasksPage: () => <h1>Mis tareas</h1> }));
vi.mock('@/pages/InvitePage', () => ({ InvitePage: () => <h1>Equipo</h1> }));
vi.mock('@/components/layout/AppShell', async () => {
  const { Outlet } = await import('react-router');
  return { AppShell: () => <div data-testid="shell"><Outlet /></div> };
});

import { AppRoutes } from '@/routes/AppRouter';

const profile = (role: UserProfile['role']): UserProfile => ({
  uid: 'u', email: 'u@x.com', displayName: 'U', role, active: true, invitedBy: 'a', rev: 1,
});

function renderAt(path: string) {
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
}

describe('rutas por estado de acceso', () => {
  beforeEach(() => {
    authState.access = 'loading';
    authState.profile = null;
  });

  it('muestra un spinner mientras se resuelve la sesión', () => {
    renderAt('/tasks');
    expect(screen.getByRole('status')).toHaveTextContent(/cargando/i);
  });

  it.each([
    ['signed-out', 'Login'],
    ['unverified', 'Confirma tu email'],
    ['no-invitation', 'Sin acceso'],
    ['inactive', 'Sin acceso'],
    ['active', 'Mis tareas'],
  ] as const)('con acceso "%s", /tasks termina en "%s"', (access, heading) => {
    authState.access = access;
    authState.profile = access === 'active' ? profile('member') : null;
    renderAt('/tasks');
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('las páginas internas van dentro del marco', () => {
    authState.access = 'active';
    authState.profile = profile('member');
    renderAt('/tasks');
    expect(screen.getByTestId('shell')).toContainElement(screen.getByRole('heading', { name: 'Mis tareas' }));
  });

  it('el login no lleva el marco', () => {
    authState.access = 'signed-out';
    renderAt('/login');
    expect(screen.queryByTestId('shell')).not.toBeInTheDocument();
  });

  it('con sesión activa, /login redirige a las tareas', () => {
    authState.access = 'active';
    authState.profile = profile('member');
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Mis tareas' })).toBeInTheDocument();
  });

  it('un miembro no entra a Equipo', () => {
    authState.access = 'active';
    authState.profile = profile('member');
    renderAt('/team');
    expect(screen.getByRole('heading', { name: 'Mis tareas' })).toBeInTheDocument();
  });

  it('un admin entra a Equipo', () => {
    authState.access = 'active';
    authState.profile = profile('admin');
    renderAt('/team');
    expect(screen.getByRole('heading', { name: 'Equipo' })).toBeInTheDocument();
  });

  it('la ruta vieja /team/invite lleva a Equipo', () => {
    authState.access = 'active';
    authState.profile = profile('admin');
    renderAt('/team/invite');
    expect(screen.getByRole('heading', { name: 'Equipo' })).toBeInTheDocument();
  });
});
