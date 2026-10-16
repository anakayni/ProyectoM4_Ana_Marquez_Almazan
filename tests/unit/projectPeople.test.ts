import { describe, expect, it } from 'vitest';
import { addableMembers, ownedProjects, peopleRows, projectPeople, projectsOfGuest, removePersonMessage } from '@/features/projects/projectPeople';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';

describe('projectPeople', () => {
  it('responsable + lista, sin repetidos', () => {
    expect(projectPeople({ ownerId: 'ana', memberIds: ['gus', 'ana'] })).toEqual(['ana', 'gus']);
    expect(projectPeople({ ownerId: 'ana' })).toEqual(['ana']);
  });
});

const person = (uid: string, role: Role, active = true): UserProfile =>
  ({ uid, email: '', displayName: uid.toUpperCase(), role, active, invitedBy: null, rev: 1 });
const team = [person('ana', 'member'), person('gus', 'guest'), person('vera', 'viewer'), person('leo', 'member', false), person('admin', 'admin')];

describe('peopleRows', () => {
  it('el responsable primero y después por nombre, con sus etiquetas', () => {
    expect(peopleRows({ ownerId: 'ana', memberIds: ['gus', 'admin'] }, team)).toEqual([
      { uid: 'ana', name: 'ANA', photo: null, active: true, isOwner: true, isGuest: false },
      { uid: 'admin', name: 'ADMIN', photo: null, active: true, isOwner: false, isGuest: false },
      { uid: 'gus', name: 'GUS', photo: null, active: true, isOwner: false, isGuest: true },
    ]);
  });
});

describe('addableMembers', () => {
  it('activos que no están, sin lectores', () => {
    expect(addableMembers({ ownerId: 'ana', memberIds: ['gus'] }, team).map((m) => m.uid)).toEqual(['admin']);
  });
});

describe('removePersonMessage', () => {
  it('al Invitado le avisa que deja de verlo y cuántas tareas tiene', () => {
    expect(removePersonMessage('Gus', true, 0)).toBe('Gus dejará de ver este proyecto.');
    expect(removePersonMessage('Gus', true, 2)).toBe(
      'Gus dejará de ver este proyecto. Tiene 2 tareas asignadas sin terminar aquí: quedan a su nombre, pero ya no podrá verlas.',
    );
  });

  it('a alguien del equipo solo deja de mostrarlo en la lista', () => {
    expect(removePersonMessage('Ana', false, 3)).toBe('Ana dejará de aparecer en las personas de este proyecto.');
  });
});

describe('proyectos de una persona', () => {
  const projects = [
    { id: 'p1', name: 'Portal', ownerId: 'ana', memberIds: ['gus'] },
    { id: 'p2', name: 'Web', ownerId: 'leo', memberIds: [] },
  ] as unknown as Project[];

  it('en cuáles está un Invitado y de cuáles es responsable alguien', () => {
    expect(projectsOfGuest(projects, 'gus').map((p) => p.name)).toEqual(['Portal']);
    expect(ownedProjects(projects, 'leo').map((p) => p.name)).toEqual(['Web']);
  });
});
