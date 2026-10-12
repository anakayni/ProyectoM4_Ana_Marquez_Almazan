import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';

const auth = vi.hoisted(() => ({
  profile: null as UserProfile | null,
  logout: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/services/team.service', () => ({ updateOwnProfile: vi.fn() }));

import { AppShell } from '@/components/layout/AppShell';

const asRole = (role: Role) => {
  auth.profile = { uid: 'u', email: 'ana@x.com', displayName: 'Ana Marquez', role, active: true, invitedBy: null, rev: 1 };
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/tasks" element={<h1>Página de tareas</h1>} />
          <Route path="/team" element={<h1>Página de equipo</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return within(screen.getByRole('complementary')); // menú lateral (<aside>)
}

describe('AppShell', () => {
  beforeEach(() => {
    auth.logout.mockReset();
    auth.logout.mockResolvedValue(undefined);
    asRole('admin');
  });

  it('muestra la página dentro del marco', () => {
    renderAt('/tasks');
    expect(screen.getByRole('heading', { name: 'Página de tareas' })).toBeInTheDocument();
  });

  it('muestra nombre y rol al pie del menú lateral', () => {
    const sidebar = renderAt('/tasks');
    expect(sidebar.getByText('Ana Marquez')).toBeInTheDocument();
    expect(sidebar.getByText('Administrador')).toBeInTheDocument();
  });

  it('marca la sección actual', () => {
    const sidebar = renderAt('/tasks');
    expect(sidebar.getByRole('link', { name: 'Mis tareas' })).toHaveAttribute('aria-current', 'page');
  });

  it('las secciones pendientes están desactivadas con "Próximamente"', () => {
    const sidebar = renderAt('/tasks');
    expect(sidebar.queryByRole('link', { name: /Calendario/ })).not.toBeInTheDocument();
    expect(sidebar.getAllByText('Próximamente')).toHaveLength(2);
  });

  it('un miembro también entra a Equipo', () => {
    asRole('member');
    const sidebar = renderAt('/tasks');
    expect(sidebar.getByRole('link', { name: 'Equipo' })).toBeInTheDocument();
    expect(sidebar.getAllByText('Próximamente')).toHaveLength(2);
  });

  it('el admin navega a Equipo', async () => {
    const sidebar = renderAt('/tasks');
    await userEvent.click(sidebar.getByRole('link', { name: 'Equipo' }));
    expect(screen.getByRole('heading', { name: 'Página de equipo' })).toBeInTheDocument();
  });

  it('cerrar sesión desde el menú lateral', async () => {
    const sidebar = renderAt('/tasks');
    await userEvent.click(sidebar.getByRole('button', { name: 'Cerrar sesión' }));
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('tocar una pestaña pendiente muestra "Próximamente"', async () => {
    renderAt('/tasks');
    // En las pestañas las secciones pendientes son botones; en el menú lateral, texto sin acción.
    await userEvent.click(screen.getByRole('button', { name: /Calendario/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Calendario: próximamente.');
  });

  it('el celular tiene menú de cuenta', () => {
    renderAt('/tasks');
    const topBar = within(screen.getByRole('banner'));
    expect(topBar.getByRole('button', { name: 'Cuenta de Ana Marquez' })).toBeInTheDocument();
  });

  it('abre Mi perfil desde el menú lateral', async () => {
    const sidebar = renderAt('/tasks');
    await userEvent.click(sidebar.getByRole('button', { name: 'Mi perfil' }));
    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
  });
});
