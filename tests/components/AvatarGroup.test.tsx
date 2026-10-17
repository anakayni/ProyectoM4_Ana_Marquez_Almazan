import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvatarGroup } from '@/components/layout/AvatarGroup';

const people = ['Ana', 'Gus', 'Leo', 'Mar', 'Sol'].map((name) => ({ name, photo: null, active: true }));

describe('AvatarGroup', () => {
  it('muestra hasta el máximo y "+N" con el resto', () => {
    render(<AvatarGroup people={people} max={3} overlap />);
    const group = screen.getByRole('img', { name: 'Personas: Ana, Gus, Leo y 2 más' });
    expect(group).toHaveTextContent('2+');
  });

  it('sin resto no muestra "+N"', () => {
    render(<AvatarGroup people={people.slice(0, 2)} max={3} />);
    expect(screen.getByRole('img', { name: 'Personas: Ana y Gus' })).not.toHaveTextContent('+');
  });
});
