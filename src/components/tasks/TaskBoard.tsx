import { Avatar } from '@/components/layout/Avatar';
import type { NameOf } from '@/features/team/members';
import { PRIORITY_LABEL, STATUSES, STATUS_LABEL, type Task, type TaskStatus } from '@/types/task';
import { dueStatus, formatDueDate } from '@/utils/formatDate';
import { StatusSelect } from './StatusSelect';
import styles from './TaskBoard.module.css';

export type TaskView = 'list' | 'board';

type Props = {
  tasks: Task[];
  nameOf: NameOf;
  canEdit: boolean;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onOpen: (task: Task) => void;
};

/** Tablero de 3 columnas. Sin arrastrar: la tarea cambia de columna con su selector de estado. */
export function TaskBoard({ tasks, nameOf, canEdit, onStatusChange, onOpen }: Props) {
  return (
    <div className={styles.board}>
      {STATUSES.map((status) => {
        const column = tasks.filter((t) => t.status === status);
        return (
          <section key={status} className={styles.column} aria-labelledby={`column-${status}`}>
            <h3 id={`column-${status}`} className={styles.heading}>
              {STATUS_LABEL[status]} <span className={styles.count}>{column.length}</span>
            </h3>
            {column.length === 0 ? (
              <p className={styles.empty}>Sin tareas</p>
            ) : (
              <ul className={styles.cards}>
                {column.map((task) => {
                  const assignee = nameOf(task.assigneeId);
                  return (
                    <li key={task.id} className={styles.card}>
                      <button type="button" className={styles.title} onClick={() => onOpen(task)}>{task.title}</button>
                      <div className={styles.meta}>
                        <span className={`${styles.badge} ${styles[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
                        {task.dueDate && status !== 'done' && (
                          <span className={`${styles.due} ${styles[dueStatus(task.dueDate)]}`}>{formatDueDate(task.dueDate)}</span>
                        )}
                      </div>
                      <div className={styles.footer}>
                        <span title={assignee ?? 'Sin asignar'}>
                          <Avatar name={assignee ?? ''} />
                          <span className="visually-hidden">{assignee ? `Responsable: ${assignee}` : 'Sin asignar'}</span>
                        </span>
                        <StatusSelect status={task.status} taskTitle={task.title} canEdit={canEdit} onChange={(s) => onStatusChange(task.id, s)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
