import { describe, expect, it } from 'vitest';
import { diffSnapshots } from '@/features/audit/diffSnapshots';

describe('diffSnapshots', () => {
  it('lista solo los campos que cambiaron, ignorando metadatos', () => {
    const before = { title: 'A', completed: false, rev: 1, updatedAt: 1, updatedBy: 'u1' };
    const after = { title: 'B', completed: false, rev: 2, updatedAt: 2, updatedBy: 'u2' };
    expect(diffSnapshots(before, after)).toEqual([{ field: 'title', from: 'A', to: 'B' }]);
  });

  it('en una creación devuelve todos los campos con from = null', () => {
    expect(diffSnapshots(null, { title: 'A', rev: 1 })).toEqual([{ field: 'title', from: null, to: 'A' }]);
  });

  it('en un borrado devuelve todos los campos con to = null', () => {
    expect(diffSnapshots({ title: 'A', rev: 3 }, null)).toEqual([{ field: 'title', from: 'A', to: null }]);
  });
});
