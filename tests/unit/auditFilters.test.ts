import { describe, expect, it } from 'vitest';
import { filterBounds } from '@/features/audit/auditFilters';

describe('filterBounds', () => {
  it('sin fechas no limita', () => {
    expect(filterBounds({ from: '', to: '' })).toEqual({ start: null, end: null });
  });

  it('"desde" empieza a las 00:00 y "hasta" incluye todo ese día', () => {
    expect(filterBounds({ from: '2026-06-10', to: '2026-06-12' })).toEqual({
      start: new Date(2026, 5, 10).getTime(),
      end: new Date(2026, 5, 13).getTime(),
    });
  });
});
