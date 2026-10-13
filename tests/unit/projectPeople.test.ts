import { describe, expect, it } from 'vitest';
import { projectPeople } from '@/features/projects/projectPeople';

describe('projectPeople', () => {
  it('responsable + lista, sin repetidos', () => {
    expect(projectPeople({ ownerId: 'ana', memberIds: ['gus', 'ana'] })).toEqual(['ana', 'gus']);
    expect(projectPeople({ ownerId: 'ana' })).toEqual(['ana']);
  });
});
