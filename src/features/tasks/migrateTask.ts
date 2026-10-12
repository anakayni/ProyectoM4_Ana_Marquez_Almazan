// Sin imports a propósito: scripts/migrate-tasks.mjs la usa directo con Node 24 (que ejecuta TypeScript simple).

export type RawTask = Record<string, unknown>;

/** `action: 'create'` cuando la tarea no tenía historial (formato de producción, sin `rev`). */
export type Migration = { data: RawTask; action: 'create' | 'update' } | null;

const CURRENT_FIELDS = ['status', 'assigneeId', 'completedBy', 'completedAt', 'projectId', 'number', 'subtasks'];
const OLD_FIELDS = ['completed', 'userId'];

/**
 * Convierte una tarea de formatos anteriores al actual. Devuelve null si ya está al día.
 * `nextNumber` se usa solo si la tarea todavía no tiene número.
 */
export function migrateTask(doc: RawTask, nextNumber: number): Migration {
  const upToDate = CURRENT_FIELDS.every((f) => f in doc) && !OLD_FIELDS.some((f) => f in doc);
  if (upToDate) return null;

  const { completed, userId, ...rest } = doc;
  const createdBy = rest.createdBy ?? userId;
  const updatedBy = rest.updatedBy ?? createdBy;
  const hadRev = typeof rest.rev === 'number';
  const status = rest.status ?? (completed === true ? 'done' : 'todo');
  const done = status === 'done';

  return {
    action: hadRev ? 'update' : 'create',
    data: {
      ...rest,
      createdBy,
      updatedBy,
      rev: hadRev ? (rest.rev as number) + 1 : 1,
      status,
      assigneeId: rest.assigneeId ?? null,
      projectId: rest.projectId ?? null,
      number: typeof rest.number === 'number' ? rest.number : nextNumber,
      subtasks: rest.subtasks ?? [],
      // Antes no se guardaba quién completó: se usa el último editor y la última fecha conocida.
      completedBy: rest.completedBy ?? (done ? updatedBy : null),
      completedAt: rest.completedAt ?? (done ? (rest.updatedAt ?? rest.createdAt ?? null) : null),
    },
  };
}
