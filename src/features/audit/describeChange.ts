import { diffSnapshots, type FieldChange } from '@/features/audit/diffSnapshots';
import type { NameOf } from '@/features/team/members';
import type { AuditEntry } from '@/types/audit';
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type Subtask, type TaskStatus } from '@/types/task';
import { formatDateLabel } from '@/utils/formatDate';

export type ProjectNameOf = (id: string | null) => string | null;

function actor(actorId: string, nameOf: NameOf): string {
  if (actorId === 'system') return 'El sistema';
  return nameOf(actorId) ?? 'Alguien';
}

const status = (value: unknown) => STATUS_LABEL[value as TaskStatus] ?? 'sin estado';
const priority = (value: unknown) => PRIORITY_LABEL[value as Priority] ?? 'sin prioridad';

/** Una frase por subtarea que cambió: completada, reabierta, quitada o agregada (en ese orden). */
function subtaskSentences(who: string, before: Subtask[], after: Subtask[]): string[] {
  const old = new Map(before.map((s) => [s.id, s]));
  const now = new Map(after.map((s) => [s.id, s]));
  const toggled = after.flatMap((s) => {
    const prev = old.get(s.id);
    if (!prev || prev.done === s.done) return [];
    return [`${who} ${s.done ? 'completó' : 'reabrió'} la subtarea «${s.title}»`];
  });
  const removed = before.filter((s) => !now.has(s.id)).map((s) => `${who} quitó la subtarea «${s.title}»`);
  const added = after.filter((s) => !old.has(s.id)).map((s) => `${who} agregó la subtarea «${s.title}»`);
  return [...toggled, ...removed, ...added];
}

/** Frases para un campo que cambió. Los campos internos (rev, completado, número, migración) no se cuentan. */
function sentences(who: string, { field, from, to }: FieldChange, nameOf: NameOf, projectNameOf: ProjectNameOf): string[] {
  switch (field) {
    case 'status':
      return [`${who} cambió el estado de ${status(from)} a ${status(to)}`];
    case 'assigneeId':
      return [to ? `${who} asignó a ${nameOf(String(to)) ?? 'alguien'}` : `${who} quitó el responsable`];
    case 'projectId':
      return [to ? `${who} movió la tarea a «${projectNameOf(String(to)) ?? 'otro proyecto'}»` : `${who} quitó la tarea del proyecto`];
    case 'priority':
      return [`${who} cambió la prioridad de ${priority(from)} a ${priority(to)}`];
    case 'dueDate':
      return [to ? `${who} cambió el vencimiento a ${formatDateLabel(String(to))}` : `${who} quitó el vencimiento`];
    case 'title':
      return [`${who} cambió el título`];
    case 'description':
      return [`${who} cambió la descripción`];
    case 'subtasks':
      return subtaskSentences(who, (from ?? []) as Subtask[], (to ?? []) as Subtask[]);
    default:
      return [];
  }
}

/** Convierte una entrada de auditoría de una tarea en frases para el historial. */
export function describeChange(entry: AuditEntry, nameOf: NameOf, projectNameOf: ProjectNameOf = () => null): string[] {
  const who = actor(entry.actorId, nameOf);
  if (entry.action === 'create') return [`${who} creó la tarea`];
  if (entry.action === 'delete') return [`${who} eliminó la tarea`];
  const result = diffSnapshots(entry.before, entry.after).flatMap((change) => sentences(who, change, nameOf, projectNameOf));
  return result.length > 0 ? result : [`${who} actualizó la tarea`];
}
