import { toDateInputValue } from '@/utils/formatDate';

export type GanttRange = { start: string; end: string; days: number; weeks: { start: string; week: number }[] };

const DAY_MS = 24 * 60 * 60 * 1000;

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Días calendario entre dos fechas (sin problemas de horario de verano: se redondea). */
function diffDays(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS);
}

export function addDays(date: string, n: number): string {
  const d = parse(date);
  return toDateInputValue(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

export function startOfWeek(date: string): string {
  return addDays(date, -((parse(date).getDay() + 6) % 7));
}

/** Semana ISO 8601: la semana 1 es la que contiene el primer jueves del año. */
export function isoWeek(date: string): number {
  const thursday = addDays(startOfWeek(date), 3);
  const jan1 = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(diffDays(jan1, thursday) / 7) + 1;
}

export function ganttRange(from: string, weeks = 5): GanttRange {
  const start = startOfWeek(from);
  const days = weeks * 7;
  return {
    start,
    end: addDays(start, days - 1),
    days,
    weeks: Array.from({ length: weeks }, (_, i) => {
      const weekStart = addDays(start, i * 7);
      return { start: weekStart, week: isoWeek(weekStart) };
    }),
  };
}

/** Ventana con la semana de hoy en el medio. */
export function rangeAround(today: string, weeks = 5): GanttRange {
  return ganttRange(addDays(startOfWeek(today), -Math.floor(weeks / 2) * 7), weeks);
}

export function pointPosition(date: string, range: GanttRange): number | null {
  const index = diffDays(range.start, date);
  if (index < 0 || index >= range.days) return null;
  return ((index + 0.5) / range.days) * 100;
}

export function barPosition(startDate: string, endDate: string, range: GanttRange): { left: number; width: number } | null {
  const from = Math.max(0, diffDays(range.start, startDate));
  const to = Math.min(range.days, diffDays(range.start, endDate) + 1);
  if (to <= 0 || from >= range.days || to <= from) return null;
  return { left: (from / range.days) * 100, width: ((to - from) / range.days) * 100 };
}

const short = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

export function rangeLabel(range: GanttRange): string {
  return `${short.format(parse(range.start))} → ${short.format(parse(range.end))} ${range.end.slice(0, 4)}`;
}
