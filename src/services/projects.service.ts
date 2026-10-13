import { collection, onSnapshot, type QueryDocumentSnapshot, type Timestamp } from 'firebase/firestore';
import { setProjectMembers as setMembers } from '@/services/audited/people';
import * as audited from '@/services/audited/projects';
import type { Project, ProjectInput, ProjectPatch } from '@/types/project';
import { db } from './firebase';

function toProject(snap: QueryDocumentSnapshot): Project {
  const d = snap.data({ serverTimestamps: 'estimate' });
  return {
    id: snap.id,
    name: d.name,
    description: d.description ?? '',
    color: d.color,
    ownerId: d.ownerId,
    startDate: d.startDate,
    endDate: d.endDate,
    archived: Boolean(d.archived),
    createdBy: d.createdBy,
    createdAt: (d.createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
    rev: d.rev,
  };
}

/** Todos los proyectos en tiempo real, ordenados por fecha de fin. */
export function subscribeToProjects(onData: (projects: Project[]) => void, onError: (error: Error) => void): () => void {
  return onSnapshot(
    collection(db, 'projects'),
    (snap) => onData(snap.docs.map(toProject).sort((a, b) => a.endDate.localeCompare(b.endDate) || a.name.localeCompare(b.name))),
    onError,
  );
}

// Cada escritura deja su entrada de auditoría (ver services/audited/projects.ts).
export const createProject = (actorId: string, input: ProjectInput) => audited.createProject(db, actorId, input);
export const updateProject = (actorId: string, id: string, patch: ProjectPatch) => audited.updateProject(db, actorId, id, patch);
export const deleteProject = (actorId: string, id: string) => audited.deleteProject(db, actorId, id);
/** Solo el admin: quiénes están en el proyecto (auditado, con sus tarjetas). */
export const setProjectMembers = (actorId: string, projectId: string, memberIds: string[]) =>
  setMembers(db, actorId, projectId, memberIds);
