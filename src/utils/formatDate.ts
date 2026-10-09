const MS_PER_DAY = 24 * 60 * 60 * 1000;

const shortDate = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

/** Convierte 'YYYY-MM-DD' a una fecha local a medianoche (sin corrimientos por zona horaria). */
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Días calendario desde hoy hasta la fecha (negativo si ya pasó). */
export function daysUntil(dueDate: string, today: Date = new Date()): number {
  return Math.round((parseLocalDate(dueDate).getTime() - startOfDay(today).getTime()) / MS_PER_DAY);
}

export type DueStatus = 'overdue' | 'today' | 'upcoming';

export function dueStatus(dueDate: string, today: Date = new Date()): DueStatus {
  const days = daysUntil(dueDate, today);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  return 'upcoming';
}

/** Etiqueta corta: "Vencida · 29 sept", "Vence hoy" o "3 oct". */
export function formatDueDate(dueDate: string, today: Date = new Date()): string {
  const status = dueStatus(dueDate, today);
  if (status === 'today') return 'Vence hoy';
  const label = shortDate.format(parseLocalDate(dueDate));
  return status === 'overdue' ? `Vencida · ${label}` : label;
}

/** Fecha local como 'YYYY-MM-DD' (el formato de <input type="date">). */
export function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "8 oct" a partir de milisegundos (p. ej. cuándo se completó). */
export function formatDay(ms: number): string {
  return shortDate.format(new Date(ms));
}

/** "8 oct" a partir de 'YYYY-MM-DD'. */
export function formatDateLabel(value: string): string {
  return shortDate.format(parseLocalDate(value));
}

const dateTime = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** "hace un momento", "hace 5 min", "hace 3 h" o "3 oct, 18:30". */
export function formatRelative(ms: number, now: number = Date.now()): string {
  const minutes = Math.floor((now - ms) / 60000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 24 * 60) return `hace ${Math.floor(minutes / 60)} h`;
  return dateTime.format(new Date(ms));
}
