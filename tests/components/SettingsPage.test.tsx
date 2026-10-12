import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';

const auth = vi.hoisted(() => ({ profile: null as UserProfile | null }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/services/settings.service', () => ({ saveWorkspaceSettings: vi.fn(), subscribeToSettings: () => () => {} }));

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
  it('un miembro vuelve a Mis tareas', () => {
    as('member');
    renderAt();
    expect(screen.getByRole('heading', { name: 'Mis tareas' })).toBeInTheDocument();
  });
});
