import { collection, doc, onSnapshot, type DocumentData, type Timestamp } from 'firebase/firestore';
import * as invitations from '@/services/audited/invitations';
import * as users from '@/services/audited/users';
import type { AuthUser, Role, UserProfile } from '@/types/auth';
import type { Invitation } from '@/types/invitation';
import { db } from './firebase';

export { InvitationError } from '@/services/audited/invitations';
export { NoInvitationError } from '@/services/audited/users';

function toProfile(uid: string, d: DocumentData): UserProfile {
  return {
    uid,
    email: d.email,
    displayName: d.displayName,
    role: d.role,
    active: d.active,
    invitedBy: d.invitedBy,
    rev: d.rev,
  };
}

/** Perfil de la persona en tiempo real: si un admin la desactiva, la app se entera al instante. */
export function subscribeToProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => onData(snap.exists() ? toProfile(uid, snap.data()) : null),
    onError,
  );
}

/** Todo el equipo en tiempo real, ordenado por nombre (cualquier usuario activo puede leerlo). */
export function subscribeToMembers(onData: (members: UserProfile[]) => void, onError: (error: Error) => void): () => void {
  return onSnapshot(
    collection(db, 'users'),
    (snap) =>
      onData(snap.docs.map((d) => toProfile(d.id, d.data())).sort((a, b) => a.displayName.localeCompare(b.displayName))),
    onError,
  );
}

/** Invitaciones (solo admins: las reglas rechazan esta lectura para el resto). */
export function subscribeToInvitations(
  onData: (list: Invitation[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, 'invitations'),
    (snap) =>
      onData(
        snap.docs
          .map((d) => {
            const data = d.data({ serverTimestamps: 'estimate' });
            return {
              email: data.email,
              role: data.role,
              status: data.status,
              invitedBy: data.invitedBy,
              acceptedBy: data.acceptedBy,
              rev: data.rev,
              createdAt: (data.createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
            };
          })
          .sort((a, b) => b.createdAt - a.createdAt),
      ),
    onError,
  );
}

export const claimInvitation = (user: AuthUser) => users.claimInvitation(db, user);
export const createInvitation = (actorId: string, email: string, role: Role) =>
  invitations.createInvitation(db, actorId, email, role);
export const revokeInvitation = (actorId: string, email: string) => invitations.revokeInvitation(db, actorId, email);
