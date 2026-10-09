import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PRIORITY_LABEL, type Task } from '@/types/task';
import { dueStatus, formatDueDate } from '@/utils/formatDate';
import styles from './TodoItem.module.css';

export type TodoItemHandlers = {
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

type TodoItemProps = TodoItemHandlers & {
  task: Task;
  /** Puede completar y editar (admin y miembro) */
  canEdit: boolean;
  /** Puede eliminar esta tarea (admin: todas; miembro: las que creó) */
  canDelete: boolean;
};

export function TodoItem({ task, canEdit, canDelete, onToggle, onEdit, onDelete }: TodoItemProps) {
  // Confirmación dentro de la tarjeta, en vez de window.confirm.
  const [confirming, setConfirming] = useState(false);

  return (
    <li className={`${styles.item} ${task.completed ? styles.completed : ''}`}>
      {canEdit ? (
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={task.completed}
          onChange={(e) => onToggle(task.id, e.target.checked)}
          aria-label={`Completar "${task.title}"`}
        />
      ) : (
        <span className={styles.status} aria-label={task.completed ? 'Completada' : 'Pendiente'}>
          {task.completed ? '✓' : '○'}
        </span>
      )}
      <div className={styles.body}>
        <h3 className={styles.title}>{task.title}</h3>
        {task.description && <p className={styles.description}>{task.description}</p>}
        <p className={styles.meta}>
          <span className={`${styles.badge} ${styles[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
          {task.dueDate && (
            <span className={`${styles.due} ${task.completed ? '' : styles[dueStatus(task.dueDate)]}`}>
              {formatDueDate(task.dueDate)}
            </span>
          )}
        </p>
      </div>
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
    </li>
  );
}
