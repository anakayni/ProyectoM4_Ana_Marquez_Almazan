import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';

const auth = vi.hoisted(() => ({ profile: null as UserProfile | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/services/settings.service', () => ({ saveWorkspaceSettings: vi.fn(), subscribeToSettings: () => () => {} }));
vi.mock('@/services/audit.service', () => ({
  fetchAuditPage: () => Promise.resolve({ entries: [], cursor: null, hasMore: false }),
  fetchAllAudit: vi.fn(),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loading: false, error: null }) }));

import { SettingsPage } from '@/pages/SettingsPage';

const as = (role: Role) => {
  auth.profile = { uid: 'u', email: 'u@x.com', displayName: 'U', role, active: true, invitedBy: null, rev: 1 };
};
const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/tasks" element={<h1>Mis tareas</h1>} />
      </Routes>
    </MemoryRouter>,
  );

describe('SettingsPage', () => {
  it('el admin ve los ajustes', () => {
    as('admin');
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeInTheDocument();
  });
  it('la pestaña Auditoría muestra filtros y cambios', async () => {
    as('admin');
    renderAt();
    await userEvent.click(screen.getByRole('radio', { name: 'Auditoría' }));
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument();
    expect(await screen.findByText('No hay cambios con estos filtros.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre del espacio')).not.toBeInTheDocument();
  });
  it('un miembro vuelve a Mis tareas', () => {
    as('member');
    renderAt();
    expect(screen.getByRole('heading', { name: 'Mis tareas' })).toBeInTheDocument();
  });
});
