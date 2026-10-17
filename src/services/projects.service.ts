import { collection, onSnapshot, query, where, type QueryDocumentSnapshot, type Timestamp } from 'firebase/firestore';
import { setProjectMembers as setMembers } from '@/services/audited/people';
import * as audited from '@/services/audited/projects';
import type { Viewer } from '@/types/auth';
import type { GuestAccess, Project, ProjectInput, ProjectPatch } from '@/types/project';
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
    memberIds: d.memberIds ?? [],
    guestAccess: d.guestAccess ?? {},
    createdBy: d.createdBy,
    createdAt: (d.createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
    rev: d.rev,
  };
}

/** Proyectos en tiempo real, ordenados por fecha de fin. El Invitado pide solo los suyos (las reglas lo exigen). */
export function subscribeToProjects(
  viewer: Viewer,
  onData: (projects: Project[]) => void,
  onError: (error: Error) => void,
): () => void {
  const source = viewer.role === 'guest'
    ? query(collection(db, 'projects'), where('memberIds', 'array-contains', viewer.uid))
    : collection(db, 'projects');
  return onSnapshot(
    source,
    (snap) => onData(snap.docs.map(toProject).sort((a, b) => a.endDate.localeCompare(b.endDate) || a.name.localeCompare(b.name))),
    onError,
  );
}

/** IDs de los proyectos del Invitado, en tiempo real (base para pedir sus tareas y sus personas). */
export function subscribeToGuestProjectIds(uid: string, onIds: (ids: string[]) => void, onError: (error: Error) => void): () => void {
  return onSnapshot(
    query(collection(db, 'projects'), where('memberIds', 'array-contains', uid)),
    (snap) => onIds(snap.docs.map((d) => d.id)),
    onError,
  );
}

// Cada escritura deja su entrada de auditoría (ver services/audited/projects.ts).
export const createProject = (actorId: string, input: ProjectInput) => audited.createProject(db, actorId, input);
export const updateProject = (actorId: string, id: string, patch: ProjectPatch) => audited.updateProject(db, actorId, id, patch);
export const deleteProject = (actorId: string, id: string) => audited.deleteProject(db, actorId, id);
/** Solo el admin: quiénes están en el proyecto (auditado, con sus tarjetas). */
export const setProjectMembers = (actorId: string, projectId: string, memberIds: string[], access?: Record<string, GuestAccess>) =>
  setMembers(db, actorId, projectId, memberIds, access);
