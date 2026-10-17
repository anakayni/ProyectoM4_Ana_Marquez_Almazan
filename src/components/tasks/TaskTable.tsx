import { Avatar } from '@/components/layout/Avatar';
import { ProjectTag } from '@/components/projects/ProjectTag';
import type { ProjectOf } from '@/features/projects/projectOf';
import { subtaskProgress } from '@/features/tasks/subtasks';
import type { NameOf, PersonOf } from '@/features/team/members';
import { PRIORITY_LABEL, type Task, type TaskStatus } from '@/types/task';
import { dueStatus, formatDueDate } from '@/utils/formatDate';
import { useTaskNumberFormat } from '@/hooks/useWorkspaceSettings';
import { StatusSelect } from './StatusSelect';
import styles from './TaskTable.module.css';

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
};

/** Vista Tabla. En pantallas angostas cada fila se muestra como tarjeta (ver CSS). */
export function TaskTable({ tasks, nameOf, personOf, projectOf, canEdit, canEditTask, onStatusChange, onOpen }: Props) {
  const formatNumber = useTaskNumberFormat();
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">Tareas</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Tarea</th>
            <th scope="col">Prioridad y proyecto</th>
            <th scope="col">Vence</th>
            <th scope="col">Asignado</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const done = task.status === 'done';
            const project = projectOf(task.projectId);
            const person = personOf(task.assigneeId);
            const assignee = nameOf(task.assigneeId);
            const sub = subtaskProgress(task.subtasks);
            return (
              <tr key={task.id} className={done ? styles.done : undefined}>
                <td data-label="#" className={styles.number}>{formatNumber(task.number)}</td>
                <td data-label="Tarea">
                  {done && <span className="visually-hidden">Hecha: </span>}
                  <button type="button" className={styles.title} onClick={() => onOpen(task)}>{task.title}</button>
                  {task.description && <p className={styles.description}>{task.description}</p>}
                  {sub.total > 0 && <p className={styles.sub}>☑ {sub.done} de {sub.total}</p>}
                </td>
                <td data-label="Prioridad y proyecto">
                  <span className={`${styles.badge} ${styles[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
                  {project && <div className={styles.project}><ProjectTag project={project} muted={done} /></div>}
                </td>
                <td data-label="Vence">
                  {task.dueDate && !done ? (
                    <span className={`${styles.due} ${styles[dueStatus(task.dueDate)]}`}>{formatDueDate(task.dueDate)}</span>
                  ) : (
                    <span className={styles.muted}>{done ? 'Hecha' : 'Sin fecha'}</span>
                  )}
                </td>
                <td data-label="Asignado">
                  <span className={styles.person}>
                    <Avatar name={assignee ?? ''} photo={person?.photo} inactive={person ? !person.active : false} muted={done} />
                    <span>{assignee ?? 'Sin asignar'}</span>
                  </span>
                </td>
                <td data-label="Estado">
                  <StatusSelect status={task.status} taskTitle={task.title} canEdit={canEditTask ? canEditTask(task) : canEdit} onChange={(s) => onStatusChange(task.id, s)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
