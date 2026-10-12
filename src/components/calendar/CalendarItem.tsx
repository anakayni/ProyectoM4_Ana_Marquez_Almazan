import type { ProjectMarker } from '@/features/calendar/month';
import type { ProjectOf } from '@/features/projects/projectOf';
import { formatTaskNumber } from '@/features/tasks/taskNumber';
import { isOverdue } from '@/features/tasks/taskStats';
import type { Task } from '@/types/task';
import styles from './CalendarItem.module.css';

type TaskChipProps = { task: Task; projectOf: ProjectOf; today: string; onOpen: (task: Task) => void };

/** Una tarea en el calendario: borde con el color de su proyecto, tachada si está hecha, roja si está vencida. */
export function TaskChip({ task, projectOf, today, onOpen }: TaskChipProps) {
  const project = projectOf(task.projectId);
  const state = task.status === 'done' ? styles.done : isOverdue(task, today) ? styles.overdue : '';
  return (
    <button
      type="button" className={`${styles.chip} ${state}`} style={{ borderLeftColor: project?.color ?? 'var(--color-border-strong)' }}
      onClick={() => onOpen(task)}
    >
      {formatTaskNumber(task.number)} {task.title}
    </button>
  );
}

/** Inicio o fin de un proyecto. */
export function MarkerChip({ marker }: { marker: ProjectMarker }) {
  return (
    <span className={styles.marker}>
      <i className={styles.diamond} style={{ backgroundColor: marker.project.color }} aria-hidden="true" />
      {marker.kind === 'start' ? 'Inicio' : 'Fin'} · {marker.project.name}
    </span>
  );
}
