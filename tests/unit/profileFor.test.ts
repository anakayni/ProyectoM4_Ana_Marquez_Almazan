import { describe, expect, it } from 'vitest';
import { profileFor } from '@/features/auth/profileFor';

describe('profileFor', () => {
  it('la cuenta con el email del admin (sin importar mayúsculas) es Administrador', () => {
    expect(profileFor({ uid: 'a', email: 'AnaKayni@gmail.com', displayName: 'Ana' }, 'anakayni@gmail.com')).toEqual({
      email: 'anakayni@gmail.com', displayName: 'Ana', role: 'admin', active: true, invitedBy: 'system', rev: 1,
    });
  });

  it('las demás son Miembro', () => {
    expect(profileFor({ uid: 'b', email: 'otra@gmail.com', displayName: 'Otra' }, 'anakayni@gmail.com').role).toBe('member');
  });

  it('sin nombre, usa la parte del email antes de la arroba', () => {
    expect(profileFor({ uid: 'c', email: 'sin.nombre@gmail.com', displayName: undefined }, 'x@y.com').displayName).toBe('sin.nombre');
  });
});
