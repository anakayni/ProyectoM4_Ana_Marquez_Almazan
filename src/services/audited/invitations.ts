import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { Role } from '@/types/auth';
import { normalizeEmail } from '@/utils/email';
import { auditEntry, auditRef } from './audit';

export type InvitationErrorCode = 'already-pending' | 'already-member' | 'not-pending';

export class InvitationError extends Error {
  readonly code: InvitationErrorCode;

  constructor(code: InvitationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** Crea la invitación, o reactiva una cancelada. Devuelve el email normalizado. */
export async function createInvitation(db: Firestore, actorId: string, rawEmail: string, role: Role): Promise<string> {
  const email = normalizeEmail(rawEmail);
  const ref = doc(db, 'invitations', email);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      const data = {
        email,
        role,
        status: 'pending',
        invitedBy: actorId,
        createdAt: serverTimestamp(),
        acceptedBy: null,
        acceptedAt: null,
        rev: 1,
      };
      tx.set(ref, data);
      tx.set(
        auditRef(db, 'invitation', email, 1),
        auditEntry({ type: 'invitation', id: email, rev: 1, action: 'create', actorId, before: null, after: data }),
      );
      return;
    }
    const before = snap.data();
    if (before.status === 'pending') throw new InvitationError('already-pending', 'Este email ya tiene una invitación pendiente.');
    if (before.status === 'accepted') throw new InvitationError('already-member', 'Este email ya forma parte del equipo.');
    const rev = before.rev + 1;
    const after = { ...before, role, status: 'pending', invitedBy: actorId, createdAt: serverTimestamp(), rev };
    tx.set(ref, after);
    tx.set(
      auditRef(db, 'invitation', email, rev),
      auditEntry({ type: 'invitation', id: email, rev, action: 'update', actorId, before, after }),
    );
  });
  return email;
}

export async function revokeInvitation(db: Firestore, actorId: string, email: string): Promise<void> {
  const ref = doc(db, 'invitations', email);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().status !== 'pending') {
      throw new InvitationError('not-pending', 'Solo se pueden cancelar invitaciones pendientes.');
    }
    const before = snap.data();
    const rev = before.rev + 1;
    const after = { ...before, status: 'revoked', rev };
    tx.set(ref, after);
    tx.set(
      auditRef(db, 'invitation', email, rev),
      auditEntry({ type: 'invitation', id: email, rev, action: 'update', actorId, before, after }),
    );
  });
}
