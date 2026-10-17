import { describe, expect, it } from 'vitest';
import {
  addableMembers, isNewEmail, ownedProjects, peopleRows, projectPeople, projectsOfGuest, removePersonMessage, searchPeople, searchProjects,
} from '@/features/projects/projectPeople';
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

describe('buscador de "Compartir proyecto"', () => {
  const people = [
    { uid: 'leo', email: 'leo@x.com', displayName: 'León Díaz', role: 'guest', active: true, invitedBy: null, rev: 1 },
    { uid: 'ana', email: 'ana@x.com', displayName: 'Ana', role: 'member', active: true, invitedBy: null, rev: 1 },
  ] as UserProfile[];
  const project = { ownerId: 'ana', memberIds: [] };

  it('encuentra por nombre (sin tildes ni mayúsculas) o por email, solo a quien no está', () => {
    expect(searchPeople(project, people, 'leon').map((p) => p.uid)).toEqual(['leo']);
    expect(searchPeople(project, people, 'LEO@X').map((p) => p.uid)).toEqual(['leo']);
    expect(searchPeople(project, people, 'ana')).toEqual([]);
    expect(searchPeople(project, people, '')).toEqual([]);
  });

  it('reconoce un email nuevo para invitar', () => {
    expect(isNewEmail('Nuevo@x.com', people, [])).toBe(true);
    expect(isNewEmail('leo@x.com', people, [])).toBe(false);
    expect(isNewEmail('pendiente@x.com', people, ['pendiente@x.com'])).toBe(false);
    expect(isNewEmail('no es email', people, [])).toBe(false);
  });
});

describe('searchProjects', () => {
  const projects = [
    { id: '1', name: 'Portál', description: 'Clientes' },
    { id: '2', name: 'Web', description: 'Sitio institucional' },
  ] as unknown as Project[];

  it('busca por nombre o descripción, sin tildes; vacío devuelve todos', () => {
    expect(searchProjects(projects, 'porta').map((p) => p.id)).toEqual(['1']);
    expect(searchProjects(projects, 'INSTITUCIONAL').map((p) => p.id)).toEqual(['2']);
    expect(searchProjects(projects, '  ')).toHaveLength(2);
  });
});
