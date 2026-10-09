import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

describe('SegmentedControl', () => {
  it('marca la opción actual y avisa el cambio', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl label="Mostrar" name="scope" value="mine" onChange={onChange}
        options={[{ value: 'mine', label: 'Mías' }, { value: 'team', label: 'Todo el equipo' }]} />,
    );
    expect(screen.getByRole('group', { name: 'Mostrar' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Mías' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Todo el equipo' }));
    expect(onChange).toHaveBeenCalledWith('team');
  });
});
