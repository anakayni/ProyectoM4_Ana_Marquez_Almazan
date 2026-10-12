import { collection, doc, runTransaction, serverTimestamp, type DocumentData, type Firestore } from 'firebase/firestore';
import type { TaskInput, TaskPatch } from '@/types/task';
import { auditEntry, auditRef } from './audit';

function cleanPatch(patch: TaskPatch): TaskPatch {
  const cleaned: TaskPatch = { ...patch };
  if (cleaned.title !== undefined) cleaned.title = cleaned.title.trim();
  if (cleaned.description !== undefined) cleaned.description = cleaned.description.trim();
  if (cleaned.subtasks !== undefined) cleaned.subtasks = cleaned.subtasks.map((s) => ({ ...s, title: s.title.trim() }));
  return cleaned;
}

/** Al pasar a Hecha se registra quién y cuándo; al salir de Hecha se vacía (las reglas exigen lo mismo). */
function completion(before: DocumentData, patch: TaskPatch, actorId: string) {
  if (patch.status === undefined || patch.status === before.status) return {};
  return patch.status === 'done'
    ? { completedBy: actorId, completedAt: serverTimestamp() }
    : { completedBy: null, completedAt: null };
}

export async function createTask(db: Firestore, actorId: string, input: TaskInput): Promise<string> {
  const ref = doc(collection(db, 'tasks'));
  const counter = doc(db, 'counters', 'tasks');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counter);
    if (!snap.exists()) throw new Error('Falta el contador de tareas: corre "npm run migrate-tasks".');
    const number: number = snap.data().next;
    const data = {
      createdBy: actorId,
      title: input.title.trim(),
      description: input.description.trim(),
      status: 'todo',
      assigneeId: input.assigneeId,
      projectId: input.projectId,
      completedBy: null,
      completedAt: null,
      number,
      subtasks: [],
      priority: input.priority,
      dueDate: input.dueDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: actorId,
      rev: 1,
    };
    // Si dos personas crean a la vez, Firestore reintenta la transacción y el número no se repite.
    tx.update(counter, { next: number + 1 });
    tx.set(ref, data);
    tx.set(
      auditRef(db, 'task', ref.id, 1),
      auditEntry({ type: 'task', id: ref.id, rev: 1, action: 'create', actorId, before: null, after: data }),
    );
  });
  return ref.id;
}

/**
 * Transacción: lee el estado actual (la foto "before") y escribe el cambio junto con su auditoría.
 * Si otra persona cambia la tarea al mismo tiempo, Firestore reintenta sobre la versión nueva.
 */
export async function updateTask(db: Firestore, actorId: string, id: string, patch: TaskPatch): Promise<void> {
  const ref = doc(db, 'tasks', id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('La tarea ya no existe.');
    const before = snap.data();
    const rev = before.rev + 1;
    const after = {
      ...before, ...cleanPatch(patch), ...completion(before, patch, actorId),
      rev, updatedBy: actorId, updatedAt: serverTimestamp(),
    };
    tx.set(ref, after);
    tx.set(auditRef(db, 'task', id, rev), auditEntry({ type: 'task', id, rev, action: 'update', actorId, before, after }));
  });
}

export async function deleteTask(db: Firestore, actorId: string, id: string): Promise<void> {
  const ref = doc(db, 'tasks', id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const before = snap.data();
    const rev = before.rev + 1;
    tx.delete(ref);
    tx.set(auditRef(db, 'task', id, rev), auditEntry({ type: 'task', id, rev, action: 'delete', actorId, before, after: null }));
  });
}
