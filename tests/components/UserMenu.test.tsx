import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UserMenu } from '@/components/layout/UserMenu';
import type { UserProfile } from '@/types/auth';

const profile: UserProfile = {
  uid: 'u', email: 'ana@x.com', displayName: 'Ana Marquez', role: 'admin', active: true, invitedBy: null, rev: 1,
};

function setup() {
  const onLogout = vi.fn();
  render(<><UserMenu profile={profile} onLogout={onLogout} /><p>Fuera</p></>);
  return { onLogout, trigger: screen.getByRole('button', { name: 'Cuenta de Ana Marquez' }) };
}

describe('UserMenu', () => {
  it('empieza cerrado', () => {
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  });

  it('al abrir muestra nombre, rol y cerrar sesión', async () => {
    const { trigger } = setup();
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Ana Marquez')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('Escape cierra y devuelve el foco al botón', async () => {
    const { trigger } = setup();
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('un clic fuera lo cierra', async () => {
    const { trigger } = setup();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByText('Fuera'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('cerrar sesión llama a onLogout', async () => {
    const { trigger, onLogout } = setup();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
