import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextValue } from '@/types/auth';

const authState: Pick<AuthContextValue, 'user' | 'loading'> = { user: null, loading: false };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));

import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute';

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute><h1>Login</h1></PublicOnlyRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><h1>Mis tareas</h1></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('rutas guardianas', () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
  });

  it('muestra un spinner mientras se resuelve la sesión', () => {
    authState.loading = true;
    renderAt('/tasks');
    expect(screen.getByRole('status')).toHaveTextContent(/cargando/i);
    expect(screen.queryByText('Mis tareas')).not.toBeInTheDocument();
  });

  it('redirige a /login si no hay sesión', () => {
    renderAt('/tasks');
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('muestra las tareas si hay sesión', () => {
    authState.user = { uid: '1', email: 'ana@mail.com', displayName: 'Ana' };
    renderAt('/tasks');
    expect(screen.getByRole('heading', { name: 'Mis tareas' })).toBeInTheDocument();
  });

  it('redirige de /login a /tasks si ya hay sesión', () => {
    authState.user = { uid: '1', email: 'ana@mail.com', displayName: 'Ana' };
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Mis tareas' })).toBeInTheDocument();
  });
});
