import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';

const svc = vi.hoisted(() => ({ createProject: vi.fn(), updateProject: vi.fn() }));
vi.mock('@/services/projects.service', () => svc);

import { ProjectDialog } from '@/components/projects/ProjectDialog';

const members: UserProfile[] = [
  { uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'member', active: true, invitedBy: null, rev: 1 },
];

describe('ProjectDialog', () => {
  beforeEach(() => {
    svc.createProject.mockReset();
    svc.createProject.mockResolvedValue('p1');
  });

  it('crea un proyecto con nombre, fechas, persona a cargo y color', async () => {
    const onClose = vi.fn();
    render(<ProjectDialog actorId="ana" members={members} onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Portal');
    await userEvent.type(screen.getByLabelText('Inicio'), '2026-10-01');
    await userEvent.type(screen.getByLabelText('Fin'), '2026-11-30');
    await userEvent.click(screen.getByRole('radio', { name: '#4D7C8A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    expect(svc.createProject).toHaveBeenCalledWith('ana', {
      name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', startDate: '2026-10-01', endDate: '2026-11-30',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('no deja una fecha de fin anterior al inicio', async () => {
    render(<ProjectDialog actorId="ana" members={members} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Portal');
    await userEvent.type(screen.getByLabelText('Inicio'), '2026-10-10');
    await userEvent.type(screen.getByLabelText('Fin'), '2026-10-01');
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    expect(screen.getByText('La fecha de fin no puede ser anterior al inicio.')).toBeInTheDocument();
    expect(svc.createProject).not.toHaveBeenCalled();
  });
});
