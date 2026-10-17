import type { EntityType } from '@/types/audit';

/** `actorId: ''` = todas las personas; fechas 'YYYY-MM-DD' locales o '' (sin límite). */
export type AuditFilters = { entityType: EntityType | 'all'; actorId: string; from: string; to: string };

export const EMPTY_AUDIT_FILTERS: AuditFilters = { entityType: 'all', actorId: '', from: '', to: '' };

export const ENTITY_FILTER_OPTIONS: { value: EntityType; label: string }[] = [
  { value: 'task', label: 'Tareas' },
  { value: 'project', label: 'Proyectos' },
  { value: 'user', label: 'Personas' },
  { value: 'invitation', label: 'Invitaciones' },
  { value: 'settings', label: 'Ajustes' },
];

function localMidnight(value: string, plusDays = 0): number {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day + plusDays).getTime();
}

/** Desde las 00:00 de `from` hasta antes de las 00:00 del día siguiente a `to` (así "hasta" incluye ese día). */
export function filterBounds({ from, to }: Pick<AuditFilters, 'from' | 'to'>): { start: number | null; end: number | null } {
  return { start: from ? localMidnight(from) : null, end: to ? localMidnight(to, 1) : null };
}
