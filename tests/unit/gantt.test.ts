import { describe, expect, it } from 'vitest';
import {
  addDays, barPosition, ganttRange, isoWeek, pointPosition, rangeAround, rangeLabel, startOfWeek,
} from '@/features/calendar/gantt';

describe('fechas', () => {
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('startOfWeek da el lunes', () => {
    expect(startOfWeek('2026-10-15')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12');
  });
  it.each([
    ['2026-09-28', 40], ['2026-10-12', 42], ['2026-01-01', 1], ['2026-12-31', 53], ['2027-01-01', 53], ['2025-12-29', 1],
  ])('isoWeek(%s) = %i', (date, week) => {
    expect(isoWeek(date)).toBe(week);
  });
});

describe('ganttRange', () => {
  it('5 semanas desde el lunes', () => {
    const range = ganttRange('2026-09-30');
    expect(range).toMatchObject({ start: '2026-09-28', end: '2026-11-01', days: 35 });
    expect(range.weeks.map((w) => w.week)).toEqual([40, 41, 42, 43, 44]);
  });
  it('rangeAround deja la semana de hoy en el medio', () => {
    expect(rangeAround('2026-10-14').start).toBe('2026-09-28');
  });
  it('título', () => {
    expect(rangeLabel(ganttRange('2026-09-28'))).toBe('28 sept → 1 nov 2026');
  });
});

describe('posiciones', () => {
  const range = ganttRange('2026-09-28'); // 35 días

  it('un punto va en el centro de su día; fuera del rango es null', () => {
    expect(pointPosition('2026-09-28', range)).toBeCloseTo((0.5 / 35) * 100);
    expect(pointPosition('2026-11-01', range)).toBeCloseTo((34.5 / 35) * 100);
    expect(pointPosition('2026-11-02', range)).toBeNull();
    expect(pointPosition('2026-09-27', range)).toBeNull();
  });

  it('una barra dentro del rango ocupa sus días completos', () => {
    const bar = barPosition('2026-10-05', '2026-10-11', range)!;
    expect(bar.left).toBeCloseTo((7 / 35) * 100);
    expect(bar.width).toBeCloseTo((7 / 35) * 100);
  });

  it('se recorta si empieza antes o termina después', () => {
    expect(barPosition('2026-09-01', '2026-12-31', range)).toEqual({ left: 0, width: 100 });
  });

  it('fuera del rango es null', () => {
    expect(barPosition('2026-08-01', '2026-09-27', range)).toBeNull();
    expect(barPosition('2026-11-02', '2026-12-01', range)).toBeNull();
  });
});
