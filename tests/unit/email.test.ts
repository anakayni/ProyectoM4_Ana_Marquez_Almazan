import { expect, it } from 'vitest';
import { normalizeEmail } from '@/utils/email';

it('normaliza espacios y mayúsculas', () => {
  expect(normalizeEmail('  Ana@Empresa.COM ')).toBe('ana@empresa.com');
});
