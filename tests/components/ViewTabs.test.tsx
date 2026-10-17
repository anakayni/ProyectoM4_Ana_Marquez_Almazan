import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutGrid, List } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { ViewTabs } from '@/components/ui/ViewTabs';

describe('ViewTabs', () => {
  it('es un grupo de opciones con la activa marcada, y cambia con clic o teclado', async () => {
    const onChange = vi.fn();
    render(
      <ViewTabs
        label="Vista" name="view" value="board" onChange={onChange}
        options={[{ value: 'board', label: 'Tablero', icon: LayoutGrid }, { value: 'list', label: 'Lista', icon: List, count: 3 }]}
      />,
    );
    expect(screen.getByRole('group', { name: 'Vista' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Tablero' })).toBeChecked();
    expect(screen.getByText('3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Lista/ }));
    expect(onChange).toHaveBeenCalledWith('list');
  });
});
