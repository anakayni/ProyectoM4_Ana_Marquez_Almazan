import { useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { auditCsvRow, auditToCsv } from '@/features/audit/auditCsv';
import type { AuditFilters } from '@/features/audit/auditFilters';
import { describeAuditEntry, type AuditContext } from '@/features/audit/describeAuditEntry';
import { makeNameOf } from '@/features/team/members';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useProjects } from '@/hooks/useProjects';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTaskNumberFormat } from '@/hooks/useWorkspaceSettings';
import { fetchAllAudit } from '@/services/audit.service';
import type { AuditEntry } from '@/types/audit';
import { downloadTextFile } from '@/utils/download';
import { formatDateTime, toDateInputValue } from '@/utils/formatDate';
import { AuditEntryDialog } from './AuditEntryDialog';
import styles from './AuditLog.module.css';

const plural = (n: number) => `${n} ${n === 1 ? 'cambio' : 'cambios'}`;

/** Lista de la auditoría. Montar con `key` según los filtros: cada combinación empieza su propia lista. */
export function AuditLog({ filters }: { filters: AuditFilters }) {
  const members = useTeamMembers();
  const { projects } = useProjects();
  const formatNumber = useTaskNumberFormat();
  const ctx = useMemo<AuditContext>(
    () => ({
      nameOf: makeNameOf(members),
      projectNameOf: (id) => projects.find((p) => p.id === id)?.name ?? null,
      formatNumber,
    }),
    [members, projects, formatNumber],
  );
  const { entries, loading, loadingMore, error, hasMore, loadMore } = useAuditLog(filters);
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  async function exportCsv() {
    setExporting(true);
    setExportResult(null);
    try {
      const { entries: all, truncated } = await fetchAllAudit(filters);
      downloadTextFile(`auditoria-${toDateInputValue(new Date())}.csv`, auditToCsv(all.map((entry) => auditCsvRow(entry, ctx))));
      setExportResult({
        kind: 'info',
        text: truncated
          ? `Se exportaron los ${plural(all.length)} más recientes. Usa las fechas para exportar el resto.`
          : `Se exportaron ${plural(all.length)}.`,
      });
    } catch (err) {
      console.error('Error al exportar la auditoría:', err);
      setExportResult({ kind: 'error', text: 'No pudimos exportar. Intenta de nuevo.' });
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <Spinner label="Cargando auditoría…" />;

  return (
    <section aria-labelledby="audit-title" className={styles.section}>
      <div className={styles.head}>
        <h2 id="audit-title" className={styles.title}>Cambios</h2>
        <Button size="sm" variant="secondary" onClick={() => void exportCsv()} disabled={exporting || entries.length === 0}>
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </Button>
      </div>
      {exportResult && <Alert kind={exportResult.kind}>{exportResult.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {!error && entries.length === 0 && <p className={styles.empty}>No hay cambios con estos filtros.</p>}
      {entries.length > 0 && (
        <ul className={styles.list}>
          {entries.map((entry) => {
            const d = describeAuditEntry(entry, ctx);
            return (
              <li key={`${entry.entityType}_${entry.entityId}_${entry.rev}`}>
                <button type="button" className={styles.item} onClick={() => setOpen(entry)}>
                  <span className={styles.sentences}>{d.sentences.join('. ')}</span>
                  <span className={styles.meta}>{d.type} · {d.subject} · {formatDateTime(entry.at)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {entries.length > 0 && <p className={styles.count}>Mostrando {plural(entries.length)}</p>}
      {hasMore && (
        <Button variant="secondary" onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? 'Cargando…' : 'Cargar más'}
        </Button>
      )}
      {open && <AuditEntryDialog entry={open} ctx={ctx} onClose={() => setOpen(null)} />}
    </section>
  );
}
