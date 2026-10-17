import {
  collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch,
  type Firestore, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { ProjectInput, ProjectPatch } from '@/types/project';
import { auditEntry, auditRef } from './audit';
import { cardFrom, cardRef } from './people';

/** Cada tarea desvinculada son 2 escrituras (tarea + auditoría); Firestore acepta 500 por lote. */
const UNLINK_CHUNK = 240;

function clean<T extends ProjectPatch>(patch: T): T {
  return {
    ...patch,
    ...(patch.name !== undefined && { name: patch.name.trim() }),
    ...(patch.description !== undefined && { description: patch.description.trim() }),
  };
}

export async function createProject(db: Firestore, actorId: string, input: ProjectInput): Promise<string> {
  const ref = doc(collection(db, 'projects'));
  const data = {
    ...clean(input),
    archived: false,
    createdBy: actorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: actorId,
    rev: 1,
  };
  const owner = await getDoc(doc(db, 'users', input.ownerId));
  const batch = writeBatch(db);
  batch.set(ref, data);
  batch.set(
    auditRef(db, 'project', ref.id, 1),
    auditEntry({ type: 'project', id: ref.id, rev: 1, action: 'create', actorId, before: null, after: data }),
  );
  // El responsable es persona del proyecto: el Invitado ve su tarjeta.
  if (owner.exists()) batch.set(cardRef(db, ref.id, input.ownerId), cardFrom(input.ownerId, owner.data()));
  await batch.commit();
  return ref.id;
}

export async function updateProject(db: Firestore, actorId: string, id: string, patch: ProjectPatch): Promise<void> {
  const ref = doc(db, 'projects', id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('El proyecto ya no existe.');
    const before = snap.data();
    // En una transacción, todas las lecturas van antes de las escrituras.
    const ownerChanged = patch.ownerId !== undefined && patch.ownerId !== before.ownerId;
    const newOwner = ownerChanged ? await tx.get(doc(db, 'users', patch.ownerId as string)) : null;
    const rev = before.rev + 1;
    const after = { ...before, ...clean(patch), rev, updatedBy: actorId, updatedAt: serverTimestamp() };
    tx.set(ref, after);
    tx.set(auditRef(db, 'project', id, rev), auditEntry({ type: 'project', id, rev, action: 'update', actorId, before, after }));
    if (ownerChanged && newOwner?.exists()) {
      tx.set(cardRef(db, id, newOwner.id), cardFrom(newOwner.id, newOwner.data()));
      // El responsable anterior deja de ser persona del proyecto si no está en la lista.
      if (!(before.memberIds ?? []).includes(before.ownerId)) tx.delete(cardRef(db, id, before.ownerId));
    }
  });
}

/** Borra el proyecto (solo admin) y deja sus tareas "Sin proyecto", cada una con su auditoría. */
export async function deleteProject(db: Firestore, actorId: string, id: string): Promise<void> {
  const projectRef = doc(db, 'projects', id);
  const cards = (await getDocs(collection(db, 'projects', id, 'people'))).docs;
  const linked = (await getDocs(query(collection(db, 'tasks'), where('projectId', '==', id)))).docs;
  const chunks: QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < linked.length; i += UNLINK_CHUNK) chunks.push(linked.slice(i, i + UNLINK_CHUNK));
  if (chunks.length === 0) chunks.push([]);

  for (const [index, chunk] of chunks.entries()) {
    const batch = writeBatch(db);
    for (const snap of chunk) {
      const before = snap.data();
      const rev = before.rev + 1;
      const after = { ...before, projectId: null, rev, updatedBy: actorId, updatedAt: serverTimestamp() };
      batch.set(snap.ref, after);
      batch.set(
        auditRef(db, 'task', snap.id, rev),
        auditEntry({ type: 'task', id: snap.id, rev, action: 'update', actorId, before, after }),
      );
    }
    if (index === chunks.length - 1) {
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const before = projectSnap.data();
        const rev = before.rev + 1;
        batch.delete(projectRef);
        batch.set(
          auditRef(db, 'project', id, rev),
          auditEntry({ type: 'project', id, rev, action: 'delete', actorId, before, after: null }),
        );
      }
    }
    await batch.commit();
  }

  // Las tarjetas se borran después: las reglas lo permiten cuando el proyecto ya no existe.
  if (cards.length > 0) {
    const batch = writeBatch(db);
    cards.forEach((snap) => batch.delete(snap.ref));
    await batch.commit();
  }
}
