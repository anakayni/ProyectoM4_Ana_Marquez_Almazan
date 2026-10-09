import type { Task } from '@/types/task';
import { TodoItem, type TodoItemHandlers } from './TodoItem';
import styles from './TodoList.module.css';

type TodoListProps = TodoItemHandlers & {
  tasks: Task[];
  /** Mensajes para la lista vacía (p. ej. cuando un filtro no tiene resultados). */
  emptyTitle?: string;
  emptyHint?: string;
  /** Permisos según el rol (por defecto, todo permitido) */
  canEdit?: boolean;
  canDelete?: (task: Task) => boolean;
};

export function TodoList({
  tasks,
  emptyTitle = 'Todavía no tienes tareas',
  emptyHint = 'Crea la primera con el formulario.',
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
        <TodoItem key={task.id} task={task} canEdit={canEdit} canDelete={canDelete(task)} {...handlers} />
      ))}
    </ul>
  );
}
