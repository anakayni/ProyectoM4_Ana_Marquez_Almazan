import type { NameOf } from '@/features/team/members';
import type { Task } from '@/types/task';
import { TodoItem, type TodoItemHandlers } from './TodoItem';
import styles from './TodoList.module.css';

type TodoListProps = TodoItemHandlers & {
  tasks: Task[];
  /** Nombre de un integrante a partir de su UID */
  nameOf: NameOf;
  /** Mensajes para la lista vacía (p. ej. cuando un filtro no tiene resultados). */
  emptyTitle?: string;
  emptyHint?: string;
  /** Permisos según el rol (por defecto, todo permitido) */
  canEdit?: boolean;
  canDelete?: (task: Task) => boolean;
};

export function TodoList({
  tasks,
  nameOf,
  emptyTitle = 'Todavía no tienes tareas',
  emptyHint = 'Crea una con "+ Nueva tarea".',
  canEdit = true,
  canDelete = () => true,
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
        <TodoItem key={task.id} task={task} nameOf={nameOf} canEdit={canEdit} canDelete={canDelete(task)} {...handlers} />
      ))}
    </ul>
  );
}
