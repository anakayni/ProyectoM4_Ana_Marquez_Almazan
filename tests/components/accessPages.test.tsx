import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Access } from '@/types/auth';

const auth = {
  access: 'unverified' as Access,
  user: { uid: 'u', email: 'ana@mail.com', displayName: 'Ana', emailVerified: false },
  refreshVerification: vi.fn(),
  resendVerification: vi.fn(),
  logout: vi.fn(),
};
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

import { NoAccessPage } from '@/pages/NoAccessPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';

const renderPage = (page: React.ReactNode) => render(<MemoryRouter>{page}</MemoryRouter>);

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    auth.refreshVerification.mockReset();
    auth.resendVerification.mockReset();
  });

  it('muestra el email al que se envió el link', () => {
    renderPage(<VerifyEmailPage />);
    expect(screen.getByText('ana@mail.com')).toBeInTheDocument();
  });

  it('avisa si todavía no se confirmó', async () => {
    auth.refreshVerification.mockResolvedValue(false);
    renderPage(<VerifyEmailPage />);
    await userEvent.click(screen.getByRole('button', { name: /ya lo confirmé/i }));
    expect(await screen.findByText(/todavía no vemos la confirmación/i)).toBeInTheDocument();
  });

  it('reenvía el email', async () => {
    auth.resendVerification.mockResolvedValue(undefined);
    renderPage(<VerifyEmailPage />);
    await userEvent.click(screen.getByRole('button', { name: /reenviar email/i }));
    expect(auth.resendVerification).toHaveBeenCalled();
    expect(await screen.findByText(/te enviamos un nuevo link/i)).toBeInTheDocument();
  });
});

describe('NoAccessPage', () => {
  it('explica que no hay invitación', () => {
    auth.access = 'no-invitation';
    renderPage(<NoAccessPage />);
    expect(screen.getByRole('heading', { name: /no tienes invitación a este espacio/i })).toBeInTheDocument();
  });

  it('explica que el acceso fue desactivado', () => {
    auth.access = 'inactive';
    renderPage(<NoAccessPage />);
    expect(screen.getByRole('heading', { name: /tu acceso fue desactivado/i })).toBeInTheDocument();
  });

  it('permite cerrar sesión', async () => {
    auth.access = 'no-invitation';
    renderPage(<NoAccessPage />);
    await userEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    expect(auth.logout).toHaveBeenCalled();
  });
});
