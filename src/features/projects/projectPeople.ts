import type { UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';

/** Personas del proyecto: su responsable y quienes el admin agregó. */
export function projectPeople(project: Pick<Project, 'ownerId' | 'memberIds'>): string[] {
  return [...new Set([project.ownerId, ...(project.memberIds ?? [])])];
}

export type PersonRow = { uid: string; name: string; photo: string | null; active: boolean; isOwner: boolean; isGuest: boolean };

const byName = (a: UserProfile, b: UserProfile) => a.displayName.localeCompare(b.displayName);

/** Filas de "Personas del proyecto": el responsable primero, después por nombre. Quien no se conoce se omite. */
export function peopleRows(project: Pick<Project, 'ownerId' | 'memberIds'>, members: readonly UserProfile[]): PersonRow[] {
  const byUid = new Map(members.map((m) => [m.uid, m]));
  return projectPeople(project)
    .flatMap((uid) => {
      const m = byUid.get(uid);
      return m
        ? [{ uid, name: m.displayName, photo: m.photo ?? null, active: m.active, isOwner: uid === project.ownerId, isGuest: m.role === 'guest' }]
        : [];
    })
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name));
}

/** A quién se puede agregar: activos que todavía no están. Los lectores no (ya ven todo y no se les asigna). */
export function addableMembers(project: Pick<Project, 'ownerId' | 'memberIds'>, members: readonly UserProfile[]): UserProfile[] {
  const inProject = new Set(projectPeople(project));
  return members.filter((m) => m.active && m.role !== 'viewer' && !inProject.has(m.uid)).sort(byName);
}

/** Qué pasa al quitar a alguien: el Invitado deja de ver el proyecto; el equipo sigue viéndolo todo. */
export function removePersonMessage(name: string, isGuest: boolean, openAssigned: number): string {
  if (!isGuest) return `${name} dejará de aparecer en las personas de este proyecto.`;
  const base = `${name} dejará de ver este proyecto.`;
  if (openAssigned === 0) return base;
  const tasks = openAssigned === 1 ? '1 tarea asignada' : `${openAssigned} tareas asignadas`;
  return `${base} Tiene ${tasks} sin terminar aquí: quedan a su nombre, pero ya no podrá verlas.`;
}

/** Proyectos donde el admin agregó a esta persona. */
export function projectsOfGuest(projects: readonly Project[], uid: string): Project[] {
  return projects.filter((p) => (p.memberIds ?? []).includes(uid));
}

/** Proyectos de los que la persona es responsable (un Invitado no puede serlo). */
export function ownedProjects(projects: readonly Project[], uid: string): Project[] {
  return projects.filter((p) => p.ownerId === uid);
}
