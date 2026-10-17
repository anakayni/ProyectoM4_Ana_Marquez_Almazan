import { STATUSES, STATUS_LABEL, type TaskStatus } from '@/types/task';
import styles from './StatusSelect.module.css';

type Props = { status: TaskStatus; taskTitle: string; canEdit: boolean; onChange: (status: TaskStatus) => void };

/** Estado de una tarea: selector para quien puede editar, etiqueta para lectores. */
export function StatusSelect({ status, taskTitle, canEdit, onChange }: Props) {
  if (!canEdit) return <span className={`${styles.pill} ${styles[status]}`}>{STATUS_LABEL[status]}</span>;
  return (
    <select
      className={`${styles.pill} ${styles.select} ${styles[status]}`} value={status}
      aria-label={`Estado de "${taskTitle}"`} onChange={(e) => onChange(e.target.value as TaskStatus)}
    >
      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
    </select>
  );
}
