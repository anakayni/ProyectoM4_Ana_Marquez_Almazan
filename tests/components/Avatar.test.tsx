import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from '@/components/layout/Avatar';

describe('Avatar', () => {
  it('sin foto muestra la inicial', () => {
    const { container } = render(<Avatar name="Luis" />);
    expect(container.textContent).toBe('L');
    expect(container.querySelector('img')).toBeNull();
  });

  it('con foto muestra la imagen (decorativa)', () => {
    const { container } = render(<Avatar name="Luis" photo="data:image/jpeg;base64,AA" />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'data:image/jpeg;base64,AA');
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('una persona inactiva se ve atenuada', () => {
    const { container } = render(<Avatar name="Luis" inactive />);
    expect(container.firstChild).toHaveClass('inactive');
  });
});
