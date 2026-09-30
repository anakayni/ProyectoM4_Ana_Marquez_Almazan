import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskFilters } from '@/components/tasks/TaskFilters';

describe('TaskFilters', () => {
  it('muestra los contadores y marca el filtro activo', () => {
    render(<TaskFilters value="pending" counts={{ all: 3, pending: 2, done: 1 }} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /todas 3/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /pendientes 2/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /completadas 1/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('avisa el filtro elegido', async () => {
    const onChange = vi.fn();
    render(<TaskFilters value="all" counts={{ all: 3, pending: 2, done: 1 }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /completadas/i }));
    expect(onChange).toHaveBeenCalledWith('done');
  });
});
