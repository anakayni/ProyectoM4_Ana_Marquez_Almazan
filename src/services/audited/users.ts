import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { AuthUser, Role } from '@/types/auth';
import { normalizeEmail } from '@/utils/email';
import { auditEntry, auditRef } from './audit';

export class NoInvitationError extends Error {
  constructor() {
    super('No tienes una invitación pendiente para este espacio.');
  }
}

/** Crea el perfil con el rol de la invitación y la marca como aceptada, todo auditado. */
export async function claimInvitation(db: Firestore, user: AuthUser): Promise<void> {
  const email = normalizeEmail(user.email);
  const invRef = doc(db, 'invitations', email);
  const userRef = doc(db, 'users', user.uid);
  await runTransaction(db, async (tx) => {
    const invSnap = await tx.get(invRef);
    if (!invSnap.exists() || invSnap.data().status !== 'pending') throw new NoInvitationError();
    const inv = invSnap.data();

    const profile = {
      email,
      displayName: user.displayName.trim() || email.split('@')[0],
      role: inv.role,
      active: true,
      invitedBy: inv.invitedBy,
      joinedAt: serverTimestamp(),
      rev: 1,
    };
    tx.set(userRef, profile);
    tx.set(
      auditRef(db, 'user', user.uid, 1),
      auditEntry({ type: 'user', id: user.uid, rev: 1, action: 'create', actorId: user.uid, before: null, after: profile }),
    );

    const invRev = inv.rev + 1;
    const invAfter = { ...inv, status: 'accepted', acceptedBy: user.uid, acceptedAt: serverTimestamp(), rev: invRev };
    tx.set(invRef, invAfter);
    tx.set(
      auditRef(db, 'invitation', email, invRev),
      auditEntry({ type: 'invitation', id: email, rev: invRev, action: 'update', actorId: user.uid, before: inv, after: invAfter }),
    );
  });
}

/** Un admin cambia el rol o el estado activo de otra persona. */
export async function updateMember(
  db: Firestore,
  actorId: string,
  uid: string,
  patch: { role?: Role; active?: boolean },
): Promise<void> {
  const ref = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('El usuario no existe.');
    const before = snap.data();
    const rev = before.rev + 1;
    const after = { ...before, ...patch, rev };
    tx.set(ref, after);
    tx.set(auditRef(db, 'user', uid, rev), auditEntry({ type: 'user', id: uid, rev, action: 'update', actorId, before, after }));
  });
}

/** Cada persona cambia su propio nombre visible. */
export async function updateOwnName(db: Firestore, uid: string, displayName: string): Promise<void> {
  const ref = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('El usuario no existe.');
    const before = snap.data();
    const rev = before.rev + 1;
    const after = { ...before, displayName: displayName.trim(), rev };
    tx.set(ref, after);
    tx.set(
      auditRef(db, 'user', uid, rev),
      auditEntry({ type: 'user', id: uid, rev, action: 'update', actorId: uid, before, after }),
    );
  });
}
