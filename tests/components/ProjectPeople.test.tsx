import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';

vi.mock('@/services/projects.service', () => ({ setProjectMembers: vi.fn(), updateProject: vi.fn() }));
vi.mock('@/services/team.service', () => ({ createInvitation: vi.fn() }));
vi.mock('@/hooks/usePendingGuestInvitations', () => ({ usePendingGuestInvitations: () => [] }));

import { ProjectPeople } from '@/components/projects/ProjectPeople';

const person = (uid: string, name: string, role: Role): UserProfile =>
  ({ uid, email: '', displayName: name, role, active: true, invitedBy: null, rev: 1 });
const members = [person('ana', 'Ana', 'member'), person('gus', 'Gus', 'guest')];
const project = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', memberIds: ['gus'],
  startDate: '2026-10-01', endDate: '2026-11-30', archived: false, createdBy: 'ana', createdAt: 1, rev: 1,
} as Project;

describe('ProjectPeople', () => {
  it('el "+" para agregar lo ve solo el admin', () => {
    const { unmount } = render(<ProjectPeople project={project} members={members} tasks={[]} actorId="admin" canManage />);
    expect(screen.getByRole('button', { name: 'Agregar persona al proyecto' })).toBeInTheDocument();
    unmount();
    render(<ProjectPeople project={project} members={members} tasks={[]} actorId="ana" canManage={false} />);
    expect(screen.queryByRole('button', { name: 'Agregar persona al proyecto' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Personas: Ana y Gus' })).toBeInTheDocument();
  });

  it('las caras abren "Compartir proyecto"', async () => {
    render(<ProjectPeople project={project} members={members} tasks={[]} actorId="ana" canManage={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver personas del proyecto' }));
    expect(screen.getByRole('dialog', { name: 'Compartir proyecto' })).toBeInTheDocument();
  });
});
