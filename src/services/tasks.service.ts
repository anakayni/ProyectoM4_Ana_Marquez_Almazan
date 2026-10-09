import { collection, onSnapshot, type QueryDocumentSnapshot, type Timestamp } from 'firebase/firestore';
import * as audited from '@/services/audited/tasks';
import type { Task, TaskInput, TaskPatch } from '@/types/task';
import { db } from './firebase';

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
    completedBy: data.completedBy ?? null,
    completedAt: (data.completedAt as Timestamp | null)?.toMillis() ?? null,
    priority: data.priority ?? 'media',
    dueDate: data.dueDate ?? null,
    createdAt: (data.createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
  };
}

/**
 * Todas las tareas del equipo en tiempo real (las reglas exigen un perfil activo).
 * Se ordena en el cliente: la más nueva primero.
 */
export function subscribeToTasks(onData: (tasks: Task[]) => void, onError: (error: Error) => void): () => void {
  return onSnapshot(
    collection(db, 'tasks'),
    (snapshot) => onData(snapshot.docs.map(toTask).sort((a, b) => b.createdAt - a.createdAt)),
    onError,
  );
}

// Cada escritura deja su entrada de auditoría (ver services/audited/tasks.ts).
export const createTask = (actorId: string, input: TaskInput) => audited.createTask(db, actorId, input);
export const updateTask = (actorId: string, id: string, patch: TaskPatch) => audited.updateTask(db, actorId, id, patch);
export const deleteTask = (actorId: string, id: string) => audited.deleteTask(db, actorId, id);
