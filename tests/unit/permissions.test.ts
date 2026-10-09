import { describe, expect, it } from 'vitest';
import { can } from '@/features/auth/permissions';

const admin = { uid: 'a', role: 'admin' as const };
const member = { uid: 'm', role: 'member' as const };
const viewer = { uid: 'v', role: 'viewer' as const };

describe('can', () => {
  it('lector solo lee', () => {
    expect(can(viewer, 'task:create')).toBe(false);
    expect(can(viewer, 'task:edit')).toBe(false);
    expect(can(viewer, 'task:delete', { createdBy: 'v' })).toBe(false);
  });

  it('miembro crea y edita, pero borra solo lo que creó', () => {
    expect(can(member, 'task:create')).toBe(true);
    expect(can(member, 'task:edit')).toBe(true);
    expect(can(member, 'task:delete', { createdBy: 'm' })).toBe(true);
    expect(can(member, 'task:delete', { createdBy: 'otro' })).toBe(false);
  });

  it('admin puede todo, incluido gestionar el equipo', () => {
    expect(can(admin, 'task:delete', { createdBy: 'otro' })).toBe(true);
    expect(can(admin, 'team:manage')).toBe(true);
    expect(can(admin, 'audit:read-all')).toBe(true);
    expect(can(member, 'team:manage')).toBe(false);
  });

  it('sin perfil no puede nada', () => {
    expect(can(null, 'task:create')).toBe(false);
  });
});
