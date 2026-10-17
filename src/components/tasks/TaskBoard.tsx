import type { ProjectOf } from '@/features/projects/projectOf';
import type { NameOf, PersonOf } from '@/features/team/members';
import { STATUSES, STATUS_LABEL, type Task, type TaskStatus } from '@/types/task';
import { TaskCard } from './TaskCard';
import styles from './TaskBoard.module.css';

type Props = {
  tasks: Task[];
  nameOf: NameOf;
  personOf: PersonOf;
  projectOf: ProjectOf;
  canEdit: boolean;
  /** Si se pasa, decide tarea por tarea (el Invitado edita solo donde "Puede editar"). */
  canEditTask?: (task: Task) => boolean;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onOpen: (task: Task) => void;
  /** Lector e Invitado: sin la columna "Hecha". */
  showDone?: boolean;
  /** "+ Agregar tarea" al pie de Pendiente y En curso (solo si puede crear). */
  onAdd?: (status: 'todo' | 'doing') => void;
  /** 'YYYY-MM-DD' de hoy, para marcar lo vencido. */
  today?: string;
};

/** Tablero de 3 columnas. Sin arrastrar: la tarea cambia de columna con su selector de estado. */
export function TaskBoard({
  tasks, nameOf, personOf, projectOf, canEdit, canEditTask, onStatusChange, onOpen, showDone = true, onAdd, today,
}: Props) {
  return (
    <div className={`${styles.board} ${showDone ? '' : styles.two}`}>
      {STATUSES.filter((s) => showDone || s !== 'done').map((status) => {
        const column = tasks.filter((t) => t.status === status);
        return (
          <section key={status} className={styles.column} aria-labelledby={`column-${status}`}>
            <h3 id={`column-${status}`} className={styles.heading}>
              {STATUS_LABEL[status]} <span className={`${styles.count} ${styles[status]}`}>{column.length}</span>
            </h3>
            {column.length === 0 ? (
              <p className={styles.empty}>Sin tareas</p>
            ) : (
              <ul className={styles.cards}>
                {column.map((task) => (
                  <TaskCard
                    key={task.id} task={task} nameOf={nameOf} personOf={personOf} projectOf={projectOf} today={today}
                    editable={canEditTask ? canEditTask(task) : canEdit} onStatusChange={onStatusChange} onOpen={onOpen}
                  />
                ))}
              </ul>
            )}
            {onAdd && status !== 'done' && (
              <button type="button" className={styles.add} onClick={() => onAdd(status)}>+ Agregar tarea</button>
            )}
          </section>
        );
      })}
    </div>
  );
}
