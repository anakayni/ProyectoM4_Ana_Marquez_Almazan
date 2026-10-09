import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { NameOf } from '@/features/team/members';
import { PRIORITY_LABEL, type Task, type TaskStatus } from '@/types/task';
import { formatDay, formatDueDate } from '@/utils/formatDate';
import { StatusSelect } from './StatusSelect';
import styles from './TaskDetailPanel.module.css';
import { TaskHistory } from './TaskHistory';

type Props = {
  task: Task;
  nameOf: NameOf;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
};

/** Todo sobre una tarea: datos, acciones según permisos e historial de cambios. */
export function TaskDetailPanel({ task, nameOf, canEdit, canDelete, onClose, onEdit, onDelete, onStatusChange }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Modal title={task.title} onClose={onClose} variant="panel">
      <div className={styles.body}>
        {task.description && <p className={styles.description}>{task.description}</p>}
        <dl className={styles.facts}>
          <dt>Estado</dt>
          <dd><StatusSelect status={task.status} taskTitle={task.title} canEdit={canEdit} onChange={(s) => onStatusChange(task.id, s)} /></dd>
          <dt>Responsable</dt>
          <dd>{nameOf(task.assigneeId) ?? 'Sin asignar'}</dd>
          <dt>Prioridad</dt>
          <dd>{PRIORITY_LABEL[task.priority]}</dd>
          <dt>Vence</dt>
          <dd>{task.dueDate ? formatDueDate(task.dueDate) : 'Sin fecha'}</dd>
          {task.completedAt !== null && (
            <>
              <dt>Hecha por</dt>
              <dd>{nameOf(task.completedBy) ?? 'alguien'} · {formatDay(task.completedAt)}</dd>
            </>
          )}
          <dt>Creada por</dt>
          <dd>{nameOf(task.createdBy) ?? 'alguien'} · {formatDay(task.createdAt)}</dd>
        </dl>

        {(canEdit || canDelete) && (
          <div className={styles.actions}>
            {confirming ? (
              <>
                <span className={styles.confirmText}>¿Eliminar esta tarea?</span>
                <Button size="sm" variant="danger" onClick={() => onDelete(task.id)}>Sí, eliminar</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
              </>
            ) : (
              <>
                {canEdit && <Button size="sm" variant="secondary" onClick={() => onEdit(task)}>Editar</Button>}
                {canDelete && <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>Eliminar</Button>}
              </>
            )}
          </div>
        )}

        <section aria-labelledby="history-title" className={styles.history}>
          <h3 id="history-title" className={styles.sectionTitle}>Historial</h3>
          <TaskHistory key={task.id} taskId={task.id} nameOf={nameOf} />
        </section>
      </div>
    </Modal>
  );
}
