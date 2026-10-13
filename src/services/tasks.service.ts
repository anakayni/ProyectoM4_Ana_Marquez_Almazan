import { collection, onSnapshot, query, where, type QueryDocumentSnapshot, type Timestamp } from 'firebase/firestore';
import * as audited from '@/services/audited/tasks';
import type { Viewer } from '@/types/auth';
import type { Task, TaskInput, TaskPatch } from '@/types/task';
import { subscribeFanOut } from '@/utils/fanOut';
import { db } from './firebase';
import { subscribeToGuestProjectIds } from './projects.service';

function toTask(snapshot: QueryDocumentSnapshot): Task {
  // 'estimate': mientras el servidor no confirma, createdAt usa la hora local en vez de null.
  const data = snapshot.data({ serverTimestamps: 'estimate' });
  return {
    id: snapshot.id,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    rev: data.rev,
    title: data.title,
    description: data.description,
    status: data.status,
    assigneeId: data.assigneeId ?? null,
    projectId: data.projectId ?? null,
    number: data.number ?? 0,
    subtasks: data.subtasks ?? [],
    completedBy: data.completedBy ?? null,
    completedAt: (data.completedAt as Timestamp | null)?.toMillis() ?? null,
    priority: data.priority ?? 'media',
    dueDate: data.dueDate ?? null,
    createdAt: (data.createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
  };
}

const newestFirst = (tasks: Task[]) => tasks.sort((a, b) => b.createdAt - a.createdAt);

/**
 * Tareas en tiempo real. El equipo ve todas; el Invitado, las de sus proyectos
 * (una consulta por proyecto: es lo que las reglas pueden comprobar). La más nueva primero.
 */
export function subscribeToTasks(viewer: Viewer, onData: (tasks: Task[]) => void, onError: (error: Error) => void): () => void {
  if (viewer.role !== 'guest') {
    return onSnapshot(collection(db, 'tasks'), (snapshot) => onData(newestFirst(snapshot.docs.map(toTask))), onError);
  }
  return subscribeFanOut<Task>(
    (onIds, onErr) => subscribeToGuestProjectIds(viewer.uid, onIds, onErr),
    (projectId, onItems, onErr) =>
      onSnapshot(query(collection(db, 'tasks'), where('projectId', '==', projectId)), (snap) => onItems(snap.docs.map(toTask)), onErr),
    (tasks) => onData(newestFirst(tasks)),
    onError,
  );
}

// Cada escritura deja su entrada de auditoría (ver services/audited/tasks.ts).
export const createTask = (actorId: string, input: TaskInput) => audited.createTask(db, actorId, input);
export const updateTask = (actorId: string, id: string, patch: TaskPatch) => audited.updateTask(db, actorId, id, patch);
export const deleteTask = (actorId: string, id: string) => audited.deleteTask(db, actorId, id);
