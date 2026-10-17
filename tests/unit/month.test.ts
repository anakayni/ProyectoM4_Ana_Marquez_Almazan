import { describe, expect, it } from 'vitest';
import { addMonths, agendaDays, dayLabel, monthGrid, monthLabel, projectMarkers, tasksByDay } from '@/features/calendar/month';
import type { Project } from '@/types/project';
import type { Task, TaskStatus } from '@/types/task';

const task = (number: number, dueDate: string | null, status: TaskStatus = 'todo'): Task => ({
  id: String(number), createdBy: 'x', updatedBy: 'x', rev: 1, title: `T${number}`, description: '', status, assigneeId: null,
  completedBy: null, completedAt: null, projectId: null, number, subtasks: [], priority: 'media', dueDate, createdAt: 1,
});
const project = (id: string, startDate: string, endDate: string): Project => ({
  id, name: id, description: '', color: '#4D7C8A', ownerId: 'a', startDate, endDate, archived: false, createdBy: 'a', createdAt: 1, rev: 1,
});

describe('monthGrid', () => {
  it('octubre 2026 empieza el lunes 28 de septiembre y tiene 5 semanas', () => {
    const grid = monthGrid(2026, 9, '2026-10-12');
    expect(grid).toHaveLength(5);
    expect(grid[0][0]).toEqual({ date: '2026-09-28', day: 28, inMonth: false, isToday: false });
    expect(grid[0][3]).toMatchObject({ date: '2026-10-01', inMonth: true });
    expect(grid.flat().find((d) => d.isToday)?.date).toBe('2026-10-12');
    expect(grid[4][6].date).toBe('2026-11-01');
  });
  it('un mes que empieza en domingo (febrero 2026) arranca el lunes anterior', () => {
    expect(monthGrid(2026, 1, '2026-01-01')[0][0].date).toBe('2026-01-26');
  });
  it('un mes que empieza en lunes (junio 2026) no tiene días del mes anterior', () => {
    expect(monthGrid(2026, 5, '2026-01-01')[0][0]).toMatchObject({ date: '2026-06-01', inMonth: true });
  });
  it('febrero bisiesto (2028) llega al 29', () => {
    const days = monthGrid(2028, 1, '2028-01-01').flat().filter((d) => d.inMonth);
    expect(days.at(-1)?.date).toBe('2028-02-29');
  });
});

describe('addMonths y etiquetas', () => {
  it('cruza el cambio de año', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
  it('nombres en español', () => {
    expect(monthLabel(2026, 9)).toBe('Octubre 2026');
    expect(dayLabel('2026-10-12')).toBe('12 de octubre');
  });
});

describe('tasksByDay', () => {
  it('agrupa por vencimiento, sin fecha afuera, no hechas primero y por número', () => {
    const byDay = tasksByDay([task(3, '2026-10-12', 'done'), task(5, '2026-10-12'), task(2, '2026-10-12'), task(9, null)]);
    expect(byDay.get('2026-10-12')?.map((t) => t.number)).toEqual([2, 5, 3]);
    expect([...byDay.keys()]).toEqual(['2026-10-12']);
  });
});

describe('projectMarkers y agendaDays', () => {
  it('marca inicio y fin de cada proyecto', () => {
    const markers = projectMarkers([project('Portal', '2026-10-01', '2026-10-15')]);
    expect(markers.get('2026-10-01')?.[0]).toMatchObject({ kind: 'start' });
    expect(markers.get('2026-10-15')?.[0]).toMatchObject({ kind: 'end' });
  });
  it('la agenda solo trae días del mes con contenido, en orden', () => {
    const grid = monthGrid(2026, 9, '2026-10-12');
    const byDay = tasksByDay([task(1, '2026-10-20'), task(2, '2026-09-30')]);
    const markers = projectMarkers([project('Portal', '2026-10-01', '2026-12-01')]);
    expect(agendaDays(grid, byDay, markers).map((d) => d.date)).toEqual(['2026-10-01', '2026-10-20']);
  });
});
