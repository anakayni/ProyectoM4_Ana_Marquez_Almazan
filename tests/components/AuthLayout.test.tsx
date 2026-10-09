import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthLayout } from '@/components/auth/AuthLayout';

describe('AuthLayout', () => {
  it('muestra la marca, el aviso de invitación y el formulario', () => {
    render(
      <AuthLayout title="Iniciar sesión" subtitle="Bienvenida" footer={<span>¿No tienes cuenta?</span>}>
        <p>Formulario</p>
      </AuthLayout>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByText('Acceso solo con invitación del administrador.')).toBeInTheDocument();
    expect(screen.getByText('Las tareas de tu equipo, en un solo lugar.')).toBeInTheDocument();
    expect(screen.getByText('Formulario')).toBeInTheDocument();
    expect(screen.getByText('¿No tienes cuenta?')).toBeInTheDocument();
    expect(screen.getByText(/MateCode/)).toBeInTheDocument();
  });
});
