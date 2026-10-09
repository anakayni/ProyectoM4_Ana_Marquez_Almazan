import { diffSnapshots, type FieldChange } from '@/features/audit/diffSnapshots';
import type { NameOf } from '@/features/team/members';
import type { AuditEntry } from '@/types/audit';
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type TaskStatus } from '@/types/task';
import { formatDateLabel } from '@/utils/formatDate';

function actor(actorId: string, nameOf: NameOf): string {
  if (actorId === 'system') return 'El sistema';
  return nameOf(actorId) ?? 'Alguien';
}

const status = (value: unknown) => STATUS_LABEL[value as TaskStatus] ?? 'sin estado';
const priority = (value: unknown) => PRIORITY_LABEL[value as Priority] ?? 'sin prioridad';

/** Una frase por campo que cambió. Los campos internos (rev, completado, migración) no se cuentan. */
function sentence(who: string, { field, from, to }: FieldChange, nameOf: NameOf): string | null {
  switch (field) {
    case 'status':
      return `${who} cambió el estado de ${status(from)} a ${status(to)}`;
    case 'assigneeId':
      return to ? `${who} asignó a ${nameOf(String(to)) ?? 'alguien'}` : `${who} quitó el responsable`;
    case 'priority':
      return `${who} cambió la prioridad de ${priority(from)} a ${priority(to)}`;
    case 'dueDate':
      return to ? `${who} cambió el vencimiento a ${formatDateLabel(String(to))}` : `${who} quitó el vencimiento`;
    case 'title':
      return `${who} cambió el título`;
    case 'description':
      return `${who} cambió la descripción`;
    default:
      return null;
  }
}

/** Convierte una entrada de auditoría de una tarea en frases para el historial. */
export function describeChange(entry: AuditEntry, nameOf: NameOf): string[] {
  const who = actor(entry.actorId, nameOf);
  if (entry.action === 'create') return [`${who} creó la tarea`];
  if (entry.action === 'delete') return [`${who} eliminó la tarea`];
  const sentences = diffSnapshots(entry.before, entry.after)
    .map((change) => sentence(who, change, nameOf))
    .filter((s): s is string => s !== null);
  return sentences.length > 0 ? sentences : [`${who} actualizó la tarea`];
}
