import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LayoutGrid, List } from 'lucide-react';
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

  it('con íconos, el texto queda oculto pero accesible', () => {
    render(
      <SegmentedControl label="Vista" name="view" value="list" onChange={vi.fn()}
        options={[{ value: 'list', label: 'Lista', icon: List }, { value: 'board', label: 'Tablero', icon: LayoutGrid }]} />,
    );
    expect(screen.getByRole('radio', { name: 'Lista' })).toBeChecked();
    expect(screen.getByText('Tablero')).toHaveClass('visually-hidden');
    expect(screen.getByTitle('Tablero')).toBeInTheDocument();
  });
});
