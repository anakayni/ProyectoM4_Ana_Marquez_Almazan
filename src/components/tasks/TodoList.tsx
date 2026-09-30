import type { Task } from '@/types/task';
import { TodoItem, type TodoItemHandlers } from './TodoItem';
import styles from './TodoList.module.css';

type TodoListProps = TodoItemHandlers & {
  tasks: Task[];
  /** Mensajes para la lista vacía (p. ej. cuando un filtro no tiene resultados). */
  emptyTitle?: string;
  emptyHint?: string;
};

export function TodoList({
  tasks,
  emptyTitle = 'Todavía no tienes tareas',
  emptyHint = 'Crea la primera con el formulario.',
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
        <TodoItem key={task.id} task={task} {...handlers} />
      ))}
    </ul>
  );
}
