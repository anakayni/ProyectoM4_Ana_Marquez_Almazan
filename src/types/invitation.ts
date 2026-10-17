import type { Role } from './auth';

export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export const INVITATION_STATUS_LABEL: Record<InvitationStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  revoked: 'Cancelada',
};

export interface Invitation {
  email: string;
  role: Role;
  status: InvitationStatus;
  invitedBy: string;
  acceptedBy: string | null;
  rev: number;
  /** Milisegundos (convertido desde el Timestamp de Firestore) */
  createdAt: number;
}
