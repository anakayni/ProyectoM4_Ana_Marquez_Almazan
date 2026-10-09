import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore';
import type { AuditEntry } from '@/types/audit';
import { db } from './firebase';

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
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs
          .map((d) => {
            const data = d.data({ serverTimestamps: 'estimate' });
            return { ...data, at: (data.at as Timestamp | null)?.toMillis() ?? Date.now() } as AuditEntry;
          })
          .sort((a, b) => b.rev - a.rev),
      ),
    onError,
  );
}
