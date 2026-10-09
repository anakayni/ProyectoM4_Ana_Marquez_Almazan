import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Access, UserProfile } from '@/types/auth';

const authState: { access: Access; profile: UserProfile | null } = { access: 'loading', profile: null };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));

import { AdminRoute } from '@/routes/AdminRoute';
import { RequireAccess } from '@/routes/RequireAccess';

const profile = (role: UserProfile['role']): UserProfile => ({
  uid: 'u', email: 'u@x.com', displayName: 'U', role, active: true, invitedBy: 'a', rev: 1,
});

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<RequireAccess allow={['signed-out']}><h1>Login</h1></RequireAccess>} />
        <Route path="/verify-email" element={<RequireAccess allow={['unverified']}><h1>Confirma tu email</h1></RequireAccess>} />
        <Route path="/no-access" element={<RequireAccess allow={['no-invitation', 'inactive']}><h1>Sin acceso</h1></RequireAccess>} />
        <Route path="/tasks" element={<RequireAccess allow={['active']}><h1>Mis tareas</h1></RequireAccess>} />
        <Route
          path="/team/invite"
          element={<RequireAccess allow={['active']}><AdminRoute><h1>Invitar</h1></AdminRoute></RequireAccess>}
        />
      </Routes>
    </MemoryRouter>,
  );
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
    renderAt('/tasks');
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('con sesión activa, /login redirige a las tareas', () => {
    authState.access = 'active';
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Mis tareas' })).toBeInTheDocument();
  });

  it('un miembro no entra a la pantalla de invitar', () => {
    authState.access = 'active';
    authState.profile = profile('member');
    renderAt('/team/invite');
    expect(screen.getByRole('heading', { name: 'Mis tareas' })).toBeInTheDocument();
  });

  it('un admin entra a la pantalla de invitar', () => {
    authState.access = 'active';
    authState.profile = profile('admin');
    renderAt('/team/invite');
    expect(screen.getByRole('heading', { name: 'Invitar' })).toBeInTheDocument();
  });
});
