import type { ProjectOf } from '@/features/projects/projectOf';
import type { NameOf, PersonOf } from '@/features/team/members';
import type { Task } from '@/types/task';
import { TodoItem, type TodoItemHandlers } from './TodoItem';
import styles from './TodoList.module.css';

type TodoListProps = TodoItemHandlers & {
  tasks: Task[];
  /** Nombre de un integrante a partir de su UID */
  nameOf: NameOf;
  /** Foto y estado de un integrante (para el avatar del responsable) */
  personOf: PersonOf;
  /** Proyecto de cada tarea (para su etiqueta) */
  projectOf: ProjectOf;
  /** Mensajes para la lista vacía (p. ej. cuando un filtro no tiene resultados). */
  emptyTitle?: string;
  emptyHint?: string;
  /** Puede cambiar el estado (por defecto, sí) */
  canEdit?: boolean;
};

export function TodoList({
  tasks,
  nameOf,
  personOf,
  projectOf,
  emptyTitle = 'Todavía no tienes tareas',
  emptyHint = 'Crea una con "+ Nueva tarea".',
  canEdit = true,
  ...handlers
}: TodoListProps) {
  if (tasks.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>{emptyTitle}</p>
        <p>{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {tasks.map((task) => (
        <TodoItem key={task.id} task={task} nameOf={nameOf} personOf={personOf} projectOf={projectOf} canEdit={canEdit} {...handlers} />
      ))}
    </ul>
  );
}
