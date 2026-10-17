import {
  collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, Timestamp, where,
  type QueryConstraint, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { filterBounds, type AuditFilters } from '@/features/audit/auditFilters';
import type { AuditEntry } from '@/types/audit';
import { db } from './firebase';

function toEntry(d: QueryDocumentSnapshot): AuditEntry {
  const data = d.data({ serverTimestamps: 'estimate' });
  return { ...data, at: (data.at as Timestamp | null)?.toMillis() ?? Date.now() } as AuditEntry;
}

/**
 * Historial de una tarea en tiempo real. Dos filtros de igualdad no necesitan índice compuesto;
 * `entityType == 'task'` además es lo que permite la lectura en las reglas. Se ordena en el cliente.
 */
export function subscribeToTaskHistory(
  taskId: string,
  onData: (entries: AuditEntry[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(collection(db, 'auditLog'), where('entityType', '==', 'task'), where('entityId', '==', taskId));
  return onSnapshot(q, (snap) => onData(snap.docs.map(toEntry).sort((a, b) => b.rev - a.rev)), onError);
}

export const AUDIT_PAGE_SIZE = 50;

/** Marca dónde terminó la página anterior (lo usa Firestore para seguir desde ahí). */
export type AuditCursor = QueryDocumentSnapshot;
export type AuditPage = { entries: AuditEntry[]; cursor: AuditCursor | null; hasMore: boolean };

/**
 * Una página de la auditoría completa (solo admin), de la más reciente a la más vieja.
 * Tipo + persona + fecha necesitan los índices de `firestore.indexes.json`.
 */
export async function fetchAuditPage(filters: AuditFilters, cursor: AuditCursor | null, pageSize = AUDIT_PAGE_SIZE): Promise<AuditPage> {
  const { start, end } = filterBounds(filters);
  const constraints: QueryConstraint[] = [];
  if (filters.entityType !== 'all') constraints.push(where('entityType', '==', filters.entityType));
  if (filters.actorId) constraints.push(where('actorId', '==', filters.actorId));
  if (start !== null) constraints.push(where('at', '>=', Timestamp.fromMillis(start)));
  if (end !== null) constraints.push(where('at', '<', Timestamp.fromMillis(end)));
  constraints.push(orderBy('at', 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  // Uno de más: si llega, hay otra página (sin contar todo).
  constraints.push(limit(pageSize + 1));
  const snap = await getDocs(query(collection(db, 'auditLog'), ...constraints));
  const docs = snap.docs.slice(0, pageSize);
  return { entries: docs.map(toEntry), cursor: docs.at(-1) ?? null, hasMore: snap.docs.length > pageSize };
}

/** Todo lo que coincide con los filtros, de a 500, hasta `max` (para exportar). */
export async function fetchAllAudit(filters: AuditFilters, max = 5000): Promise<{ entries: AuditEntry[]; truncated: boolean }> {
  const entries: AuditEntry[] = [];
  let cursor: AuditCursor | null = null;
  for (;;) {
    const page: AuditPage = await fetchAuditPage(filters, cursor, 500);
    entries.push(...page.entries);
    if (!page.hasMore) return { entries, truncated: false };
    if (entries.length >= max) return { entries, truncated: true };
    cursor = page.cursor;
  }
}
