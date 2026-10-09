import { useEffect, useState } from 'react';
import { subscribeToTaskHistory } from '@/services/audit.service';
import type { AuditEntry } from '@/types/audit';

/**
 * Historial de una tarea. Quien lo usa debe montarlo con `key={taskId}`:
 * así cada tarea empieza con su propio estado de carga (sin reiniciar estado dentro del efecto).
 */
export function useTaskHistory(taskId: string) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeToTaskHistory(
        taskId,
        (next) => {
          setEntries(next);
          setLoading(false);
        },
        (err) => {
          console.error('Error al leer el historial:', err);
          setError('No pudimos cargar el historial.');
          setLoading(false);
        },
      ),
    [taskId],
  );

  return { entries, loading, error };
}
