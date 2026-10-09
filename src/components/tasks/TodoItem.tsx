import { Avatar } from '@/components/layout/Avatar';
import type { NameOf } from '@/features/team/members';
import { PRIORITY_LABEL, type Task, type TaskStatus } from '@/types/task';
import { dueStatus, formatDay, formatDueDate } from '@/utils/formatDate';
import { StatusSelect } from './StatusSelect';
import styles from './TodoItem.module.css';

export type TodoItemHandlers = {
  onStatusChange: (id: string, status: TaskStatus) => void;
  /** Abre el panel de detalle (ahí están Editar, Eliminar y el historial) */
  onOpen: (task: Task) => void;
};

type TodoItemProps = TodoItemHandlers & {
  task: Task;
  nameOf: NameOf;
  /** Puede cambiar el estado (admin y miembro) */
  canEdit: boolean;
};

export function TodoItem({ task, nameOf, canEdit, onStatusChange, onOpen }: TodoItemProps) {
  const done = task.status === 'done';
  const assignee = nameOf(task.assigneeId);

  return (
    <li className={`${styles.item} ${done ? styles.completed : ''}`}>
      <span className={styles.assignee} title={assignee ?? 'Sin asignar'}>
        <Avatar name={assignee ?? ''} />
        <span className="visually-hidden">{assignee ? `Responsable: ${assignee}` : 'Sin asignar'}</span>
      </span>
      <div className={styles.body}>
        <h3 className={styles.title}>
          <button type="button" className={styles.titleButton} onClick={() => onOpen(task)}>{task.title}</button>
        </h3>
        {task.description && <p className={styles.description}>{task.description}</p>}
        <p className={styles.meta}>
          <span className={`${styles.badge} ${styles[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
          {task.dueDate && !done && (
            <span className={`${styles.due} ${styles[dueStatus(task.dueDate)]}`}>{formatDueDate(task.dueDate)}</span>
          )}
          {done && task.completedAt !== null && (
            <span className={styles.doneBy}>Hecha por {nameOf(task.completedBy) ?? 'alguien'} · {formatDay(task.completedAt)}</span>
          )}
        </p>
      </div>
      <div className={styles.side}>
        <StatusSelect status={task.status} taskTitle={task.title} canEdit={canEdit} onChange={(s) => onStatusChange(task.id, s)} />
      </div>
    </li>
  );
}
