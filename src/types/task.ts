export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  /** Fecha de creación en milisegundos (convertida desde el Timestamp de Firestore) */
  createdAt: number;
}

/** Campos que el usuario completa en el formulario */
export type TaskInput = Pick<Task, 'title' | 'description'>;

export type TaskPatch = Partial<TaskInput & Pick<Task, 'completed'>>;

export type TaskFilter = 'all' | 'pending' | 'done';

export type TaskCounts = Record<TaskFilter, number>;
