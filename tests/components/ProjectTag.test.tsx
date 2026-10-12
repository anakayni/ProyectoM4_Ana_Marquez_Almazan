import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectTag } from '@/components/projects/ProjectTag';
import type { Project } from '@/types/project';

const project = (color: string): Project => ({
  id: 'p', name: 'Portal', description: '', color, ownerId: 'a', startDate: '2026-10-01', endDate: '2026-11-30',
  archived: false, createdBy: 'a', createdAt: 1, rev: 1,
});

describe('ProjectTag', () => {
  it('muestra el nombre con el color del proyecto y letra legible', () => {
    render(<ProjectTag project={project('#CBDF90')} />);
    expect(screen.getByText('Portal')).toHaveStyle({ backgroundColor: '#CBDF90', color: '#000000' });
  });
  it('en color oscuro usa letra blanca', () => {
    render(<ProjectTag project={project('#1B4079')} />);
    expect(screen.getByText('Portal')).toHaveStyle({ color: '#FFFFFF' });
  });
});
