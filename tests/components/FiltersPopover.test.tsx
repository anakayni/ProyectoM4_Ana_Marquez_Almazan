import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FiltersPopover } from '@/components/ui/FiltersPopover';

describe('FiltersPopover', () => {
  it('muestra cuántos filtros hay, abre el panel y cierra con "Listo" o Escape', async () => {
    const onClear = vi.fn();
    render(<FiltersPopover activeCount={2} onClear={onClear}><label>Prioridad <select><option>Todas</option></select></label></FiltersPopover>);
    const button = screen.getByRole('button', { name: 'Filtros · 2' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Prioridad')).not.toBeInTheDocument();
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Filtros' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onClear).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(screen.queryByRole('dialog', { name: 'Filtros' })).not.toBeInTheDocument();
    await userEvent.click(button);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Filtros' })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('sin filtros activos dice solo "Filtros"', () => {
    render(<FiltersPopover activeCount={0} onClear={vi.fn()}><span /></FiltersPopover>);
    expect(screen.getByRole('button', { name: 'Filtros' })).toBeInTheDocument();
  });
});
