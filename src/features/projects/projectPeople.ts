import type { Project } from '@/types/project';

/** Personas del proyecto: su responsable y quienes el admin agregó. */
export function projectPeople(project: Pick<Project, 'ownerId' | 'memberIds'>): string[] {
  return [...new Set([project.ownerId, ...(project.memberIds ?? [])])];
}
