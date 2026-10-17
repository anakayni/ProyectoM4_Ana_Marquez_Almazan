import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthLayout } from '@/components/auth/AuthLayout';

describe('CreditsFooter', () => {
  it('el login muestra quién desarrolló el software', () => {
    render(<AuthLayout title="Iniciar sesión" subtitle="x"><p>Formulario</p></AuthLayout>);
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Desarrollado por Imago Design');
  });
});
