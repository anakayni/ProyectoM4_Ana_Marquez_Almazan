import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ProjectCard } from '@/components/projects/ProjectCard';
import type { Project } from '@/types/project';

const project: Project = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', startDate: '2026-10-01', endDate: '2026-11-30',
  archived: false, createdBy: 'ana', createdAt: 1, rev: 1,
};

describe('ProjectCard', () => {
  it('muestra progreso real, detalle y a cargo, y lleva a la página del proyecto', () => {
    render(
      <MemoryRouter>
        <ProjectCard
          project={project} progress={{ total: 10, todo: 3, doing: 3, done: 4, percent: 40, late: false }}
          owner={{ name: 'Ana', photo: null, active: true }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Portal/ })).toHaveAttribute('href', '/projects/p1');
    expect(screen.getByRole('progressbar', { name: 'Progreso de Portal' })).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('40% · 4 de 10 hechas')).toBeInTheDocument();
    expect(screen.getByText('3 en curso · 3 pendientes')).toBeInTheDocument();
    expect(screen.getByText('A cargo: Ana')).toBeInTheDocument();
  });

  it('marca "Atrasado"', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={project} progress={{ total: 1, todo: 1, doing: 0, done: 0, percent: 0, late: true }} owner={null} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Atrasado/)).toBeInTheDocument();
  });
});
