export type EntityType = 'task' | 'invitation' | 'user';
export type AuditAction = 'create' | 'update' | 'delete';

/** Foto de un documento tal como estaba guardado en Firestore. */
export type Snapshot = Record<string, unknown>;

export interface AuditEntry {
  entityType: EntityType;
  entityId: string;
  rev: number;
  action: AuditAction;
  actorId: string;
  /** Milisegundos (convertido desde el Timestamp del servidor) */
  at: number;
  before: Snapshot | null;
  after: Snapshot | null;
}
