import { describe, expect, it } from 'vitest';
import { assigneeOptions, makeNameOf } from '@/features/team/members';
import type { Role, UserProfile } from '@/types/auth';

const member = (uid: string, role: Role, active = true): UserProfile => ({
  uid, email: `${uid}@x.com`, displayName: uid.toUpperCase(), role, active, invitedBy: null, rev: 1,
});
const team = [member('ana', 'admin'), member('luis', 'member'), member('vera', 'viewer'), member('ex', 'member', false)];

describe('assigneeOptions', () => {
  it('solo admins y miembros activos', () => {
    expect(assigneeOptions(team, null)).toEqual([{ uid: 'ana', label: 'ANA' }, { uid: 'luis', label: 'LUIS' }]);
  });
  it('agrega al responsable actual si ya no es asignable, marcado como inactivo', () => {
    expect(assigneeOptions(team, 'ex')).toContainEqual({ uid: 'ex', label: 'EX (inactiva)' });
  });
});

describe('makeNameOf', () => {
  const nameOf = makeNameOf(team);
  it('devuelve el nombre o null', () => {
    expect(nameOf('luis')).toBe('LUIS');
    expect(nameOf('nadie')).toBeNull();
    expect(nameOf(null)).toBeNull();
  });
});
