import { collection, doc, onSnapshot, type DocumentData, type Timestamp } from 'firebase/firestore';
import * as invitations from '@/services/audited/invitations';
import { syncPersonCards, type PersonCard } from '@/services/audited/people';
import * as users from '@/services/audited/users';
import type { AuthUser, Role, UserProfile } from '@/types/auth';
import type { Invitation } from '@/types/invitation';
import { subscribeFanOut } from '@/utils/fanOut';
import { db } from './firebase';
import { subscribeToGuestProjectIds } from './projects.service';

export { InvitationError } from '@/services/audited/invitations';
export { NoInvitationError } from '@/services/audited/users';

function toProfile(uid: string, d: DocumentData): UserProfile {
  return {
    uid,
    email: d.email,
    displayName: d.displayName,
    photo: d.photo ?? null,
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

/**
 * Lo que el Invitado ve del equipo: las tarjetas de sus proyectos, unidas por persona.
 * Se adaptan a UserProfile para que el resto de la app las use igual (sin email; "team" cuenta como miembro).
 */
export function subscribeToGuestPeople(uid: string, onData: (members: UserProfile[]) => void, onError: (error: Error) => void): () => void {
  return subscribeFanOut<PersonCard>(
    (onIds, onErr) => subscribeToGuestProjectIds(uid, onIds, onErr),
    (projectId, onItems, onErr) =>
      onSnapshot(collection(db, 'projects', projectId, 'people'), (snap) => onItems(snap.docs.map((d) => d.data() as PersonCard)), onErr),
    (cards) => {
      const byUid = new Map(cards.map((c) => [c.uid, c]));
      onData(
        [...byUid.values()]
          .map((c): UserProfile => ({
            uid: c.uid, email: '', displayName: c.displayName, photo: c.photo, active: c.active,
            role: c.role === 'guest' ? 'guest' : 'member', invitedBy: null, rev: 0,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );
    },
    onError,
  );
}

export const claimInvitation = (user: AuthUser) => users.claimInvitation(db, user);
export const createInvitation = (actorId: string, email: string, role: Role) =>
  invitations.createInvitation(db, actorId, email, role);
export const revokeInvitation = (actorId: string, email: string) => invitations.revokeInvitation(db, actorId, email);

/**
 * Después de guardar el perfil, copia los datos a sus tarjetas de proyecto.
 * Si eso falla, el perfil ya quedó guardado: las tarjetas se corrigen en el próximo cambio.
 */
function syncCards(uid: string): Promise<void> {
  return syncPersonCards(db, uid).catch((err: unknown) => console.error('No se pudieron actualizar las tarjetas:', err));
}

export const updateMember = (actorId: string, uid: string, patch: { role?: Role; active?: boolean }) =>
  users.updateMember(db, actorId, uid, patch).then(() => syncCards(uid));
export const updateOwnProfile = (uid: string, patch: { displayName?: string; photo?: string | null }) =>
  users.updateOwnProfile(db, uid, patch).then(() => syncCards(uid));
