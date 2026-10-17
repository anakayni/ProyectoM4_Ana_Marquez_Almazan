export type Priority = 'alta' | 'media' | 'baja';

export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  /** Quién la creó (ya no es "el dueño": todo el equipo ve todas las tareas) */
  createdBy: string;
  /** Quién hizo el último cambio */
  updatedBy: string;
  /** Versión: sube de a 1 con cada cambio y obliga a dejar una entrada de auditoría */
  rev: number;
  title: string;
  description: string;
  status: TaskStatus;
  /** Responsable (admin o miembro), o null = "Sin asignar" */
  assigneeId: string | null;
  /** Quién la pasó a Hecha y cuándo (ms); null si no está hecha */
  completedBy: string | null;
  completedAt: number | null;
  /** Proyecto, o null = "Sin proyecto" */
  projectId: string | null;
  /** Número correlativo del espacio (se muestra como MC-n) */
  number: number;
  /** Pasos dentro de la tarea (máximo 20) */
  subtasks: Subtask[];
  priority: Priority;
  /** Fecha local en formato YYYY-MM-DD, o null si no tiene vencimiento */
  dueDate: string | null;
  /** Fecha de creación en milisegundos (convertida desde el Timestamp de Firestore) */
  createdAt: number;
}

/** Campos que el usuario completa en el formulario */
export type TaskInput = Pick<Task, 'title' | 'description' | 'priority' | 'dueDate' | 'assigneeId' | 'projectId'>;

/** Lo que se pide para crear: desde una columna del tablero puede nacer "en curso". */
export type NewTask = TaskInput & { status?: Exclude<TaskStatus, 'done'> };

export type TaskPatch = Partial<TaskInput & Pick<Task, 'status' | 'subtasks'>>;

export type SortMode = 'recent' | 'due' | 'priority';

export type TaskView = 'list' | 'table' | 'board';

export type TaskScope = 'mine' | 'team' | 'unassigned';



export const PRIORITIES: readonly Priority[] = ['alta', 'media', 'baja'];

export const PRIORITY_LABEL: Record<Priority, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };

export const STATUSES: readonly TaskStatus[] = ['todo', 'doing', 'done'];

/** Lo único que Lector e Invitado pueden leer (las reglas lo exigen). */
export const OPEN_STATUSES = ['todo', 'doing'] as const;

export const STATUS_LABEL: Record<TaskStatus, string> = { todo: 'Pendiente', doing: 'En curso', done: 'Hecha' };

export const SCOPES: readonly TaskScope[] = ['mine', 'team', 'unassigned'];

export const SCOPE_LABEL: Record<TaskScope, string> = { mine: 'Mías', team: 'Todo el equipo', unassigned: 'Sin asignar' };
