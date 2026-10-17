import { doc, serverTimestamp, type DocumentReference, type Firestore } from 'firebase/firestore';
import type { AuditAction, EntityType, Snapshot } from '@/types/audit';

/** ID predecible: las reglas exigen que exista la entrada `{tipo}_{id}_{rev}` para aceptar el cambio. */
export function auditId(type: EntityType, id: string, rev: number): string {
  return `${type}_${id}_${rev}`;
}

export function auditRef(db: Firestore, type: EntityType, id: string, rev: number): DocumentReference {
  return doc(db, 'auditLog', auditId(type, id, rev));
}

/** Entrada de auditoría. Las reglas verifican el actor, la hora y que before/after coincidan con los datos reales. */
export function auditEntry(params: {
  type: EntityType;
  id: string;
  rev: number;
  action: AuditAction;
  actorId: string;
  before: Snapshot | null;
  after: Snapshot | null;
}) {
  return {
    entityType: params.type,
    entityId: params.id,
    rev: params.rev,
    action: params.action,
    actorId: params.actorId,
    at: serverTimestamp(),
    before: params.before,
    after: params.after,
  };
}
