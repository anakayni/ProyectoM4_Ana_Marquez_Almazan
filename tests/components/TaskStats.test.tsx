import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskStats } from '@/components/tasks/TaskStats';

const stats = { todo: 4, doing: 2, done: 7, overdue: 1 };

describe('TaskStats', () => {
  it('muestra las 4 tarjetas con sus números', () => {
    render(<TaskStats stats={stats} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Pendientes 4' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'En curso 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hechas 7' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vencidas 1' })).toBeInTheDocument();
  });

  it('un clic filtra y otro clic en la misma tarjeta quita el filtro', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<TaskStats stats={stats} selected={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Vencidas 1' }));
    expect(onSelect).toHaveBeenLastCalledWith('overdue');
    rerender(<TaskStats stats={stats} selected="overdue" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Vencidas 1' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Vencidas 1' }));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
});
