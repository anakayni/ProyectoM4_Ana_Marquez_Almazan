import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StatusSelect } from '@/components/tasks/StatusSelect';

describe('StatusSelect', () => {
  it('cambia el estado', async () => {
    const onChange = vi.fn();
    render(<StatusSelect status="todo" taskTitle="Pagar luz" canEdit onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado de "Pagar luz"' }), 'doing');
    expect(onChange).toHaveBeenCalledWith('doing');
  });

  it('un lector solo ve el estado', () => {
    render(<StatusSelect status="done" taskTitle="Pagar luz" canEdit={false} onChange={vi.fn()} />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('Hecha')).toBeInTheDocument();
  });
});
