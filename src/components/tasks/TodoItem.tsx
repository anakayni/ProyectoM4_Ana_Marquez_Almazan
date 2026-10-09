import { useState } from 'react';
import { Avatar } from '@/components/layout/Avatar';
import { Button } from '@/components/ui/Button';
import type { NameOf } from '@/features/team/members';
import { PRIORITY_LABEL, type Task, type TaskStatus } from '@/types/task';
import { dueStatus, formatDay, formatDueDate } from '@/utils/formatDate';
import { StatusSelect } from './StatusSelect';
import styles from './TodoItem.module.css';

export type TodoItemHandlers = {
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

type TodoItemProps = TodoItemHandlers & {
  task: Task;
  nameOf: NameOf;
  /** Puede cambiar el estado y editar (admin y miembro) */
  canEdit: boolean;
  /** Puede eliminar esta tarea (admin: todas; miembro: las que creó) */
  canDelete: boolean;
};

export function TodoItem({ task, nameOf, canEdit, canDelete, onStatusChange, onEdit, onDelete }: TodoItemProps) {
  // Confirmación dentro de la tarjeta, en vez de window.confirm.
  const [confirming, setConfirming] = useState(false);
  const done = task.status === 'done';
  const assignee = nameOf(task.assigneeId);

  return (
    <li className={`${styles.item} ${done ? styles.completed : ''}`}>
      <span className={styles.assignee} title={assignee ?? 'Sin asignar'}>
        <Avatar name={assignee ?? ''} />
        <span className="visually-hidden">{assignee ? `Responsable: ${assignee}` : 'Sin asignar'}</span>
      </span>
      <div className={styles.body}>
        <h3 className={styles.title}>{task.title}</h3>
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
        {(canEdit || canDelete) && (
          <div className={styles.actions}>
            {confirming ? (
              <>
                <span className={styles.confirmText}>¿Eliminar?</span>
                <Button size="sm" variant="danger" onClick={() => onDelete(task.id)}>Sí, eliminar</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
              </>
            ) : (
              <>
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => onEdit(task)} aria-label={`Editar "${task.title}"`}>Editar</Button>
                )}
                {canDelete && (
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label={`Eliminar "${task.title}"`}>Eliminar</Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
