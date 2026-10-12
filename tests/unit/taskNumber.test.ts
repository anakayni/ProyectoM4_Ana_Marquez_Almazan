import { describe, expect, it } from 'vitest';
import { formatTaskNumber } from '@/features/tasks/taskNumber';

describe('formatTaskNumber', () => {
  it('antepone el prefijo', () => {
    expect(formatTaskNumber(108)).toBe('MC-108');
  });
});
