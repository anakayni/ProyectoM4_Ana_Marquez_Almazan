import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColorPicker } from '@/components/projects/ColorPicker';

describe('ColorPicker', () => {
  it('elige un color de la paleta', async () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#1B4079" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: '#1B4079' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: '#CBDF90' }));
    expect(onChange).toHaveBeenCalledWith('#CBDF90');
  });

  it('elige cualquier otro color con el selector', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#1B4079" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Otro color'), { target: { value: '#c2410c' } });
    expect(onChange).toHaveBeenCalledWith('#C2410C');
  });
});
