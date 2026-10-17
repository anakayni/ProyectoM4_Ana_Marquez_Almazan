import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ProjectCard } from '@/components/projects/ProjectCard';
import type { PersonRow } from '@/features/projects/projectPeople';
import type { Project } from '@/types/project';

const project: Project = {
  id: 'p1', name: 'Portal', description: 'Web de clientes', color: '#4D7C8A', ownerId: 'ana', startDate: '2026-10-01', endDate: '2026-11-30',
  archived: false, createdBy: 'ana', createdAt: 1, rev: 1,
};
const people: PersonRow[] = ['Ana', 'Gus', 'Leo', 'Mar', 'Sol'].map((name, i) => ({
  uid: name, name, photo: null, active: true, isOwner: i === 0, isGuest: false,
}));
const progress = { total: 10, todo: 3, doing: 3, done: 4, percent: 40, late: false };
const renderCard = (props: Partial<Parameters<typeof ProjectCard>[0]> = {}) =>
  render(<MemoryRouter><ProjectCard project={project} progress={progress} people={people} {...props} /></MemoryRouter>);

describe('ProjectCard', () => {
  it('muestra nombre, descripción, avance, personas y el pie con datos reales', () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'Portal' })).toHaveAttribute('href', '/projects/p1');
    expect(screen.getByText('Web de clientes')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Avance de Portal' })).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Personas: Ana, Gus, Leo y 2 más' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Fin: /)).toBeInTheDocument();
    expect(screen.getByLabelText('Tareas hechas: 4 de 10')).toHaveTextContent('4/10');
    expect(screen.getByLabelText('Personas: 5')).toHaveTextContent('5');
    expect(screen.queryByText(/A cargo/)).not.toBeInTheDocument();
  });

  it('marca "Atrasado" con la fecha en rojo', () => {
    renderCard({ progress: { ...progress, late: true } });
    expect(screen.getByText('Atrasado')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Fin: /)).toHaveClass('late');
  });

  it('sin hechas muestra las tareas abiertas en lugar del avance', () => {
    renderCard({ showDone: false, open: { open: 6, late: false } });
    expect(screen.getByText('6 tareas abiertas')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tareas abiertas: 6')).toHaveTextContent('6');
    expect(screen.queryByText(/hechas/)).not.toBeInTheDocument();
  });
});
