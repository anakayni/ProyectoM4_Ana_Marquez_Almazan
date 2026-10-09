import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from '@/components/layout/PageHeader';

describe('PageHeader', () => {
  it('muestra título, subtítulo y acciones', () => {
    render(<PageHeader title="Mis tareas" subtitle="2 pendientes · 1 completadas" actions={<button type="button">Enviar</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mis tareas' })).toBeInTheDocument();
    expect(screen.getByText('2 pendientes · 1 completadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });
});
