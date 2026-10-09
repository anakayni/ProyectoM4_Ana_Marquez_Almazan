import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { describeChange } from '@/features/audit/describeChange';
import type { NameOf } from '@/features/team/members';
import { useTaskHistory } from '@/hooks/useTaskHistory';
import { formatRelative } from '@/utils/formatDate';
import styles from './TaskHistory.module.css';

/** Quién cambió qué y cuándo, a partir de la auditoría (la más nueva primero). */
export function TaskHistory({ taskId, nameOf }: { taskId: string; nameOf: NameOf }) {
  const { entries, loading, error } = useTaskHistory(taskId);
  if (loading) return <Spinner label="Cargando historial…" />;
  if (error) return <Alert kind="error">{error}</Alert>;

  return (
    <ol className={styles.list}>
      {entries.flatMap((entry) =>
        describeChange(entry, nameOf).map((text, i) => (
          <li key={`${entry.rev}-${i}`} className={styles.item}>
            <span>{text}</span>
            <time className={styles.time} dateTime={new Date(entry.at).toISOString()}>{formatRelative(entry.at)}</time>
          </li>
        )),
      )}
    </ol>
  );
}
