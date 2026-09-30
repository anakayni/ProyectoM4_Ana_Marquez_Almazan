import { describe, expect, it } from 'vitest';
import { daysUntil, dueStatus, formatDueDate, toDateInputValue } from '@/utils/formatDate';

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
