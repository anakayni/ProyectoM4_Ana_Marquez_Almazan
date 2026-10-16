import { Avatar } from '@/components/layout/Avatar';
import { ProjectTag } from '@/components/projects/ProjectTag';
import type { ProjectOf } from '@/features/projects/projectOf';
import type { NameOf, PersonOf } from '@/features/team/members';
import { PRIORITY_LABEL, STATUSES, STATUS_LABEL, type Task, type TaskStatus } from '@/types/task';
import { dueStatus, formatDueDate } from '@/utils/formatDate';
import { useTaskNumberFormat } from '@/hooks/useWorkspaceSettings';
import { StatusSelect } from './StatusSelect';
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
};

/** Tablero de 3 columnas. Sin arrastrar: la tarea cambia de columna con su selector de estado. */
export function TaskBoard({ tasks, nameOf, personOf, projectOf, canEdit, canEditTask, onStatusChange, onOpen, showDone = true }: Props) {
  const formatNumber = useTaskNumberFormat();
  return (
    <div className={`${styles.board} ${showDone ? '' : styles.two}`}>
      {STATUSES.filter((s) => showDone || s !== 'done').map((status) => {
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
                  const person = personOf(task.assigneeId);
                  const project = projectOf(task.projectId);
                  const done = task.status === 'done';
                  return (
                    <li key={task.id} className={`${styles.card} ${done ? styles.done : ''}`}>
                      <span className={styles.number}>{formatNumber(task.number)}</span>
                      {done && <span className="visually-hidden">Hecha: </span>}
                      <button type="button" className={styles.title} onClick={() => onOpen(task)}>{task.title}</button>
                      <div className={styles.meta}>
                        <span className={`${styles.badge} ${styles[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
                        {project && <ProjectTag project={project} muted={done} />}
                        {task.dueDate && status !== 'done' && (
                          <span className={`${styles.due} ${styles[dueStatus(task.dueDate)]}`}>{formatDueDate(task.dueDate)}</span>
                        )}
                      </div>
                      <div className={styles.footer}>
                        <span title={assignee ?? 'Sin asignar'}>
                          <Avatar name={assignee ?? ''} photo={person?.photo} inactive={person ? !person.active : false} muted={done} />
                          <span className="visually-hidden">{assignee ? `Responsable: ${assignee}` : 'Sin asignar'}</span>
                        </span>
                        <StatusSelect status={task.status} taskTitle={task.title} canEdit={canEditTask ? canEditTask(task) : canEdit} onChange={(s) => onStatusChange(task.id, s)} />
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
