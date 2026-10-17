import { collection, onSnapshot, query, where, type QueryDocumentSnapshot, type Timestamp } from 'firebase/firestore';
import * as audited from '@/services/audited/tasks';
import type { Viewer } from '@/types/auth';
import { seesDoneTasks } from '@/features/auth/permissions';
import { OPEN_STATUSES, type NewTask, type Task, type TaskPatch } from '@/types/task';
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

/** Solo pendientes y en curso: lo único que Lector e Invitado pueden pedir. */
const openOnly = () => where('status', 'in', [...OPEN_STATUSES]);

/**
 * Tareas en tiempo real, la más nueva primero. Admin y miembro: todas. Lector: solo abiertas.
 * Invitado: abiertas de cada proyecto suyo (una consulta por proyecto: es lo que las reglas pueden comprobar).
 */
export function subscribeToTasks(viewer: Viewer, onData: (tasks: Task[]) => void, onError: (error: Error) => void): () => void {
  const emit = (docs: QueryDocumentSnapshot[]) => onData(newestFirst(docs.map(toTask)));
  if (seesDoneTasks(viewer.role)) return onSnapshot(collection(db, 'tasks'), (snap) => emit(snap.docs), onError);
  if (viewer.role !== 'guest') return onSnapshot(query(collection(db, 'tasks'), openOnly()), (snap) => emit(snap.docs), onError);
  return subscribeFanOut<Task>(
    (onIds, onErr) => subscribeToGuestProjectIds(viewer.uid, onIds, onErr),
    (projectId, onItems, onErr) =>
      onSnapshot(
        query(collection(db, 'tasks'), where('projectId', '==', projectId), openOnly()),
        (snap) => onItems(snap.docs.map(toTask)),
        onErr,
      ),
    (tasks) => onData(newestFirst(tasks)),
    onError,
  );
}

// Cada escritura deja su entrada de auditoría (ver services/audited/tasks.ts).
export const createTask = (actorId: string, input: NewTask) => audited.createTask(db, actorId, input);
export const updateTask = (actorId: string, id: string, patch: TaskPatch) => audited.updateTask(db, actorId, id, patch);
export const deleteTask = (actorId: string, id: string) => audited.deleteTask(db, actorId, id);
