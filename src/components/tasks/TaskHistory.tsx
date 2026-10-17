import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { describeChange, type ProjectNameOf } from '@/features/audit/describeChange';
import type { NameOf } from '@/features/team/members';
import { useTaskHistory } from '@/hooks/useTaskHistory';
import { formatRelative } from '@/utils/formatDate';
import styles from './TaskHistory.module.css';

type Props = { taskId: string; nameOf: NameOf; projectNameOf?: ProjectNameOf };

/** Quién cambió qué y cuándo, a partir de la auditoría (la más nueva primero). */
export function TaskHistory({ taskId, nameOf, projectNameOf }: Props) {
  const { entries, loading, error } = useTaskHistory(taskId);
  if (loading) return <Spinner label="Cargando historial…" />;
  if (error) return <Alert kind="error">{error}</Alert>;

  return (
    <ol className={styles.list}>
      {entries.flatMap((entry) =>
        describeChange(entry, nameOf, projectNameOf).map((text, i) => (
          <li key={`${entry.rev}-${i}`} className={styles.item}>
            <span>{text}</span>
            <time className={styles.time} dateTime={new Date(entry.at).toISOString()}>{formatRelative(entry.at)}</time>
          </li>
        )),
      )}
    </ol>
  );
}
