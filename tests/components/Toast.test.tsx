import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toast } from '@/components/ui/Toast';

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('se oculta solo después de 5 segundos', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast toast={{ kind: 'success', message: 'Listo' }} onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toHaveTextContent('Listo');
    act(() => vi.advanceTimersByTime(5000));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('ejecuta la acción opcional (p. ej. reintentar)', async () => {
    const onClick = vi.fn();
    render(<Toast toast={{ kind: 'error', message: 'Falló', action: { label: 'Reintentar', onClick } }} onDismiss={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('un aviso informativo se anuncia como estado', () => {
    render(<Toast toast={{ kind: 'info', message: 'Proyectos: próximamente.' }} onDismiss={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Proyectos: próximamente.');
  });
});
