import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import type { Task, TaskInput, TaskPatch } from '@/types/task';
import { db } from './firebase';

const tasksCollection = collection(db, 'tasks');

function toTask(snapshot: QueryDocumentSnapshot): Task {
  // 'estimate': mientras el servidor no confirma, createdAt usa la hora local en vez de null.
  const data = snapshot.data({ serverTimestamps: 'estimate' });
  return {
    id: snapshot.id,
    userId: data.userId,
    title: data.title,
    description: data.description,
    completed: data.completed,
    // Las tareas creadas antes de agregar estos campos no los tienen: se usan valores por defecto.
    priority: data.priority ?? 'media',
    dueDate: data.dueDate ?? null,
    createdAt: (data.createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
  };
}

/**
 * Escucha en tiempo real las tareas del usuario.
 * Se ordena en el cliente para no necesitar un índice compuesto (where + orderBy).
 */
export function subscribeToTasks(
  uid: string,
  onData: (tasks: Task[]) => void,
  onError: (error: Error) => void,
): () => void {
  const userTasks = query(tasksCollection, where('userId', '==', uid));
  return onSnapshot(
    userTasks,
    (snapshot) => onData(snapshot.docs.map(toTask).sort((a, b) => b.createdAt - a.createdAt)),
    onError,
  );
}

export async function createTask(uid: string, input: TaskInput): Promise<void> {
  await addDoc(tasksCollection, {
    userId: uid,
    title: input.title.trim(),
    description: input.description.trim(),
    priority: input.priority,
    dueDate: input.dueDate,
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const cleaned: TaskPatch = { ...patch };
  if (cleaned.title !== undefined) cleaned.title = cleaned.title.trim();
  if (cleaned.description !== undefined) cleaned.description = cleaned.description.trim();
  await updateDoc(doc(db, 'tasks', id), { ...cleaned, updatedAt: serverTimestamp() });
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', id));
}
