import { CalendarDays } from 'lucide-react';
import { Avatar } from '@/components/layout/Avatar';
import { ProjectTag } from '@/components/projects/ProjectTag';
import type { ProjectOf } from '@/features/projects/projectOf';
import { subtaskProgress } from '@/features/tasks/subtasks';
import type { NameOf, PersonOf } from '@/features/team/members';
import { useTaskNumberFormat } from '@/hooks/useWorkspaceSettings';
import { PRIORITY_LABEL, type Task, type TaskStatus } from '@/types/task';
import { dueStatus, formatDateLabel, formatDueDate } from '@/utils/formatDate';
import { StatusSelect } from './StatusSelect';
import styles from './TaskCard.module.css';

type Props = {
  task: Task; nameOf: NameOf; personOf: PersonOf; projectOf: ProjectOf; editable: boolean;
  /** 'YYYY-MM-DD' de hoy (si no se pasa, se usa la fecha actual). */
  today?: string;
  onStatusChange: (id: string, status: TaskStatus) => void; onOpen: (task: Task) => void;
};

/** Tarjeta del tablero: lo esencial de una tarea de un vistazo. */
export function TaskCard({ task, nameOf, personOf, projectOf, editable, today, onStatusChange, onOpen }: Props) {
  const formatNumber = useTaskNumberFormat();
  const done = task.status === 'done';
  const assignee = nameOf(task.assigneeId);
  const person = personOf(task.assigneeId);
  const project = projectOf(task.projectId);
  const sub = subtaskProgress(task.subtasks);
  // Mediodía local de "hoy": así la fecha no se corre por zona horaria.
  const todayDate = today ? new Date(`${today}T12:00:00`) : undefined;
  const due = task.dueDate && !done ? dueStatus(task.dueDate, todayDate) : null;
  return (
    <li className={`${styles.card} ${done ? styles.done : ''}`}>
      <div className={styles.top}>
        <span className={styles.number}>{formatNumber(task.number)}</span>
        <span className={`${styles.priority} ${styles[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
      </div>
      {done && <span className="visually-hidden">Hecha: </span>}
      <button type="button" className={styles.title} onClick={() => onOpen(task)}>{task.title}</button>
      {task.description && <p className={styles.description}>{task.description}</p>}
      {sub.total > 0 && (
        <div className={styles.progress}>
          <div className={styles.progressRow}><span>Subtareas</span><span>{sub.done}/{sub.total}</span></div>
          <div
            className={styles.track} role="progressbar" aria-label={`Subtareas de ${task.title}`}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={sub.percent}
          >
            <span style={{ width: `${sub.percent}%` }} />
          </div>
        </div>
      )}
      <div className={styles.who}>
        <span className={styles.whoLabel}>
          Asignada a
          <span title={assignee ?? 'Sin asignar'}>
            <Avatar name={assignee ?? ''} photo={person?.photo} inactive={person ? !person.active : false} muted={done} />
            <span className="visually-hidden">{assignee ?? 'Sin asignar'}</span>
          </span>
        </span>
        <StatusSelect status={task.status} taskTitle={task.title} canEdit={editable} onChange={(s) => onStatusChange(task.id, s)} />
      </div>
      {(task.dueDate || project) && (
        <div className={styles.footer}>
          {task.dueDate ? (
            <span className={`${styles.due} ${due === 'overdue' ? styles.overdue : ''}`}>
              <CalendarDays size={15} aria-hidden="true" />
              {done ? formatDateLabel(task.dueDate) : formatDueDate(task.dueDate, todayDate)}
            </span>
          ) : <span />}
          {project && <ProjectTag project={project} muted={done} />}
        </div>
      )}
    </li>
  );
}
