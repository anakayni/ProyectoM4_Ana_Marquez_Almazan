import {
  collectionGroup, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch,
  type DocumentData, type DocumentReference, type Firestore,
} from 'firebase/firestore';
import { auditEntry, auditRef } from './audit';

/** Lo que el Invitado ve de una persona: sin email ni rol interno. */
export type PersonCard = { uid: string; displayName: string; photo: string | null; active: boolean; role: 'guest' | 'team' };

/** Cada tarjeta valida su perfil y su proyecto: de a pocas para no pasar el límite de lecturas de las reglas. */
const SYNC_CHUNK = 5;

export function cardFrom(uid: string, user: DocumentData): PersonCard {
  return {
    uid,
    displayName: user.displayName,
    photo: user.photo ?? null,
    active: user.active,
    role: user.role === 'guest' ? 'guest' : 'team',
  };
}

export function cardRef(db: Firestore, projectId: string, uid: string): DocumentReference {
  return doc(db, 'projects', projectId, 'people', uid);
}

/** El admin define quiénes están en el proyecto: lista auditada + tarjetas de quienes entran y salen. */
export async function setProjectMembers(db: Firestore, actorId: string, projectId: string, memberIds: string[]): Promise<void> {
  const ref = doc(db, 'projects', projectId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('El proyecto ya no existe.');
    const before = snap.data();
    const previous: string[] = before.memberIds ?? [];
    const next = [...new Set(memberIds)];
    const added = next.filter((uid) => !previous.includes(uid));
    const removed = previous.filter((uid) => !next.includes(uid) && uid !== before.ownerId);
    const users = await Promise.all(added.map((uid) => tx.get(doc(db, 'users', uid))));

    const rev = before.rev + 1;
    const after = { ...before, memberIds: next, rev, updatedBy: actorId, updatedAt: serverTimestamp() };
    tx.set(ref, after);
    tx.set(auditRef(db, 'project', projectId, rev), auditEntry({ type: 'project', id: projectId, rev, action: 'update', actorId, before, after }));
    users.forEach((user, i) => {
      if (user.exists()) tx.set(cardRef(db, projectId, added[i]), cardFrom(added[i], user.data()));
    });
    removed.forEach((uid) => tx.delete(cardRef(db, projectId, uid)));
  });
}

/**
 * Copia el perfil actual a todas las tarjetas de la persona (después de cambiar nombre, foto, rol o activo).
 * Va aparte del cambio de perfil: las reglas comparan con el perfil ya guardado.
 */
export async function syncPersonCards(db: Firestore, uid: string): Promise<void> {
  const user = await getDoc(doc(db, 'users', uid));
  if (!user.exists()) return;
  const card = cardFrom(uid, user.data());
  const cards = (await getDocs(query(collectionGroup(db, 'people'), where('uid', '==', uid)))).docs;
  for (let i = 0; i < cards.length; i += SYNC_CHUNK) {
    const batch = writeBatch(db);
    cards.slice(i, i + SYNC_CHUNK).forEach((snap) => batch.set(snap.ref, card));
    await batch.commit();
  }
}
