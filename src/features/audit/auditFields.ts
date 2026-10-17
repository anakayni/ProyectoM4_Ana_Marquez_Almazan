import { ACCESS_LABEL } from '@/features/projects/projectAccess';
import { ROLE_LABEL, type Role } from '@/types/auth';
import type { GuestAccess } from '@/types/project';
import { INVITATION_STATUS_LABEL, type InvitationStatus } from '@/types/invitation';
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type Subtask, type TaskStatus } from '@/types/task';
import { formatDateLabel, formatDateTime } from '@/utils/formatDate';
import type { AuditContext } from './describeAuditEntry';

const FIELD_LABEL: Record<string, string> = {
  title: 'Título', description: 'Descripción', status: 'Estado', priority: 'Prioridad', assigneeId: 'Responsable',
  projectId: 'Proyecto', dueDate: 'Vencimiento', subtasks: 'Subtareas', number: 'Número', completedBy: 'Completada por',
  completedAt: 'Completada el', createdBy: 'Creado por', createdAt: 'Creación', name: 'Nombre', color: 'Color',
  ownerId: 'A cargo', startDate: 'Inicio', endDate: 'Fin', archived: 'Archivado', displayName: 'Nombre', email: 'Email',
  photo: 'Foto', role: 'Rol', active: 'Acceso activo', invitedBy: 'Invitada por', acceptedBy: 'Aceptada por',
  acceptedAt: 'Aceptada el', logo: 'Logo', palette: 'Colores', taskPrefix: 'Prefijo', memberIds: 'Personas', guestAccess: 'Acceso de Invitados',
};

/** Campos que guardan el ID de una persona. */
const PERSON_FIELDS = new Set(['assigneeId', 'ownerId', 'createdBy', 'completedBy', 'invitedBy', 'acceptedBy']);
/** Campos con fecha local 'YYYY-MM-DD'. */
const DATE_FIELDS = new Set(['dueDate', 'startDate', 'endDate']);

export function fieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? field;
}

const isTimestamp = (value: unknown): value is { toMillis: () => number } =>
  typeof value === 'object' && value !== null && typeof (value as { toMillis?: unknown }).toMillis === 'function';

/** Un valor guardado, en palabras: nombres en vez de IDs, etiquetas en vez de códigos, "(imagen)" en vez de datos. */
export function formatAuditValue(field: string, value: unknown, ctx: AuditContext): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (isTimestamp(value)) return formatDateTime(value.toMillis());
  if (PERSON_FIELDS.has(field)) return ctx.nameOf(String(value)) ?? 'Persona desconocida';
  if (field === 'projectId') return ctx.projectNameOf(String(value)) ?? 'Proyecto eliminado';
  if (field === 'number' && typeof value === 'number') return ctx.formatNumber(value);
  if (field === 'status') return STATUS_LABEL[value as TaskStatus] ?? INVITATION_STATUS_LABEL[value as InvitationStatus] ?? String(value);
  if (field === 'priority') return PRIORITY_LABEL[value as Priority] ?? String(value);
  if (field === 'role') return ROLE_LABEL[value as Role] ?? String(value);
  if (DATE_FIELDS.has(field)) return formatDateLabel(String(value));
  if (field === 'subtasks' && Array.isArray(value)) {
    return (value as Subtask[]).map((s) => `${s.done ? '✓' : '○'} ${s.title}`).join(' · ') || '—';
  }
  if (field === 'guestAccess' && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, GuestAccess>);
    return entries.map(([uid, access]) => `${ctx.nameOf(uid) ?? 'Persona desconocida'}: ${ACCESS_LABEL[access]}`).join(', ') || '—';
  }
  if (field === 'memberIds' && Array.isArray(value)) {
    return value.map((uid) => ctx.nameOf(String(uid)) ?? 'Persona desconocida').join(', ') || '—';
  }
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'string') return value.startsWith('data:image/') ? '(imagen)' : value;
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}
