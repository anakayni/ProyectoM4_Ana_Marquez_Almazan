import type { Project } from '@/types/project';
import type { Task } from '@/types/task';
import { toDateInputValue } from '@/utils/formatDate';

export type CalendarDay = { date: string; day: number; inMonth: boolean; isToday: boolean };
export type ProjectMarker = { project: Project; kind: 'start' | 'end' };
export type AgendaDay = { date: string; tasks: Task[]; markers: ProjectMarker[] };

/** Semanas de lunes a domingo que cubren el mes (`month` va de 0 a 11). */
export function monthGrid(year: number, month: number, today: string): CalendarDay[][] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      // El constructor de Date corrige el desborde (p. ej. día 0 o 32) sin problemas de horario de verano.
      const date = new Date(year, month, 1 - offset + w * 7 + d);
      const iso = toDateInputValue(date);
      return { date: iso, day: date.getDate(), inMonth: date.getMonth() === month, isToday: iso === today };
    }),
  );
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

const monthName = new Intl.DateTimeFormat('es', { month: 'long' });
const longDay = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });

export function monthLabel(year: number, month: number): string {
  const name = monthName.format(new Date(year, month, 1));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** '12 de octubre' (para etiquetas accesibles y títulos). */
export function dayLabel(date: string): string {
  return longDay.format(parse(date));
}

/** Tareas agrupadas por vencimiento: primero las no hechas, después por número. */
export function tasksByDay(tasks: readonly Task[]): Map<string, Task[]> {
  const byDay = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    byDay.set(task.dueDate, [...(byDay.get(task.dueDate) ?? []), task]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.number - b.number);
  }
  return byDay;
}

export function projectMarkers(projects: readonly Project[]): Map<string, ProjectMarker[]> {
  const markers = new Map<string, ProjectMarker[]>();
  const add = (date: string, marker: ProjectMarker) => markers.set(date, [...(markers.get(date) ?? []), marker]);
  for (const project of projects) {
    add(project.startDate, { project, kind: 'start' });
    add(project.endDate, { project, kind: 'end' });
  }
  return markers;
}

/** Para el celular: solo los días del mes que tienen tareas o marcas. */
export function agendaDays(grid: CalendarDay[][], byDay: Map<string, Task[]>, markers: Map<string, ProjectMarker[]>): AgendaDay[] {
  return grid
    .flat()
    .filter((d) => d.inMonth && (byDay.has(d.date) || markers.has(d.date)))
    .map((d) => ({ date: d.date, tasks: byDay.get(d.date) ?? [], markers: markers.get(d.date) ?? [] }));
}
