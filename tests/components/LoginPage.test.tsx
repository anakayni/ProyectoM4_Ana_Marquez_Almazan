import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const login = vi.fn();
const loginWithGoogle = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login, loginWithGoogle }) }));

import { LoginPage } from '@/pages/LoginPage';

function renderPage() {
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
}

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset();
    loginWithGoogle.mockReset();
  });

  it('valida los campos antes de llamar a Firebase', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(screen.getByText('Ingresa tu email.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('muestra el error traducido cuando el login falla', async () => {
    login.mockRejectedValue({ code: 'auth/invalid-credential' });
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'ana@mail.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos');
    expect(login).toHaveBeenCalledWith('ana@mail.com', 'incorrecta');
  });

  it('permite entrar con Google', async () => {
    loginWithGoogle.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /continuar con google/i }));
    expect(loginWithGoogle).toHaveBeenCalled();
  });
});
