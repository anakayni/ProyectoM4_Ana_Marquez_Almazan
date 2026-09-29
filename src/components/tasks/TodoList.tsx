import type { Task } from '@/types/task';
import { TodoItem, type TodoItemHandlers } from './TodoItem';
import styles from './TodoList.module.css';

type TodoListProps = TodoItemHandlers & { tasks: Task[] };

export function TodoList({ tasks, ...handlers }: TodoListProps) {
  if (tasks.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Todavía no tienes tareas</p>
        <p>Crea la primera con el formulario.</p>
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
