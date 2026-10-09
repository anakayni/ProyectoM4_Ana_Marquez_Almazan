import { describe, expect, it } from 'vitest';
import { daysUntil, dueStatus, formatDateLabel, formatDay, formatDueDate, formatRelative, toDateInputValue } from '@/utils/formatDate';

// Mediodía local para evitar sorpresas con zonas horarias.
const today = new Date(2026, 8, 30, 12);

describe('daysUntil', () => {
  it('calcula días calendario entre hoy y la fecha', () => {
    expect(daysUntil('2026-09-30', today)).toBe(0);
    expect(daysUntil('2026-10-02', today)).toBe(2);
    expect(daysUntil('2026-09-27', today)).toBe(-3);
  });
});

describe('dueStatus', () => {
  it('clasifica vencida, hoy y futura', () => {
    expect(dueStatus('2026-09-29', today)).toBe('overdue');
    expect(dueStatus('2026-09-30', today)).toBe('today');
    expect(dueStatus('2026-10-05', today)).toBe('upcoming');
  });
});

describe('formatDueDate', () => {
  it('arma una etiqueta corta en español', () => {
    expect(formatDueDate('2026-09-29', today)).toBe('Vencida · 29 sept');
    expect(formatDueDate('2026-09-30', today)).toBe('Vence hoy');
    expect(formatDueDate('2026-10-03', today)).toBe('3 oct');
  });
});

describe('toDateInputValue', () => {
  it('devuelve la fecha local en formato YYYY-MM-DD', () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatDay y formatDateLabel', () => {
  it('formatea milisegundos como día corto', () => {
    expect(formatDay(new Date(2026, 9, 8, 15, 30).getTime())).toBe(formatDateLabel('2026-10-08'));
  });
  it('formatea YYYY-MM-DD sin corrimiento de zona horaria', () => {
    expect(formatDateLabel('2026-10-08')).toMatch(/^8 oct/);
  });
});

describe('formatRelative', () => {
  const now = new Date(2026, 9, 8, 12, 0).getTime();
  it.each([
    [now - 20 * 1000, 'hace un momento'],
    [now - 5 * 60 * 1000, 'hace 5 min'],
    [now - 3 * 60 * 60 * 1000, 'hace 3 h'],
  ])('%s → %s', (ms, expected) => {
    expect(formatRelative(ms, now)).toBe(expected);
  });
  it('más de un día: fecha y hora', () => {
    expect(formatRelative(new Date(2026, 9, 3, 18, 30).getTime(), now)).toMatch(/^3 oct.*18:30$/);
  });
});
