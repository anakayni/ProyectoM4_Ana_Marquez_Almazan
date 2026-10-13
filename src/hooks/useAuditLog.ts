import { useEffect, useState } from 'react';
import type { AuditFilters } from '@/features/audit/auditFilters';
import { fetchAuditPage, type AuditCursor } from '@/services/audit.service';
import type { AuditEntry } from '@/types/audit';

/**
 * Auditoría paginada. Quien lo usa lo monta con `key` según los filtros:
 * así cada combinación empieza de cero (sin reiniciar estado dentro del efecto).
 */
export function useAuditLog(filters: AuditFilters) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [cursor, setCursor] = useState<AuditCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAuditPage(filters, null).then(
      (page) => {
        if (cancelled) return;
        setEntries(page.entries);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        // Si falta un índice, Firestore deja acá el enlace para crearlo.
        console.error('Error al leer la auditoría:', err);
        setError('No pudimos cargar la auditoría.');
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [filters]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchAuditPage(filters, cursor);
      setEntries((prev) => [...prev, ...page.entries]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error('Error al leer más auditoría:', err);
      setError('No pudimos cargar más cambios.');
    } finally {
      setLoadingMore(false);
    }
  }

  return { entries, loading, loadingMore, error, hasMore, loadMore };
}
