export type Priority = 'alta' | 'media' | 'baja';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  /** Fecha local en formato YYYY-MM-DD, o null si no tiene vencimiento */
  dueDate: string | null;
  /** Fecha de creación en milisegundos (convertida desde el Timestamp de Firestore) */
  createdAt: number;
}

/** Campos que el usuario completa en el formulario */
export type TaskInput = Pick<Task, 'title' | 'description' | 'priority' | 'dueDate'>;

export type TaskPatch = Partial<TaskInput & Pick<Task, 'completed'>>;

export type TaskFilter = 'all' | 'pending' | 'done';

export type TaskCounts = Record<TaskFilter, number>;

export type SortMode = 'recent' | 'due' | 'priority';

export const PRIORITIES: readonly Priority[] = ['alta', 'media', 'baja'];

export const PRIORITY_LABEL: Record<Priority, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };
