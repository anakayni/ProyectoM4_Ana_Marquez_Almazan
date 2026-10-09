import { describe, expect, it } from 'vitest';
import { resolveAccess } from '@/features/auth/resolveAccess';

const user = { uid: 'u', email: 'u@x.com', displayName: 'U', emailVerified: true };
const profile = {
  uid: 'u', email: 'u@x.com', displayName: 'U', role: 'member' as const, active: true, invitedBy: 'a', rev: 1,
};

describe('resolveAccess', () => {
  it('cargando mientras Firebase resuelve la sesión', () => {
    expect(resolveAccess({ authReady: false, user: null, profile: undefined, claimFailed: false })).toBe('loading');
  });

  it('sin sesión', () => {
    expect(resolveAccess({ authReady: true, user: null, profile: undefined, claimFailed: false })).toBe('signed-out');
  });

  it('email sin verificar', () => {
    const unverified = { ...user, emailVerified: false };
    expect(resolveAccess({ authReady: true, user: unverified, profile: undefined, claimFailed: false })).toBe('unverified');
  });

  it('cargando mientras llega el perfil (undefined = todavía no se sabe)', () => {
    expect(resolveAccess({ authReady: true, user, profile: undefined, claimFailed: false })).toBe('loading');
  });

  it('sin perfil y con el reclamo en curso → cargando', () => {
    expect(resolveAccess({ authReady: true, user, profile: null, claimFailed: false })).toBe('loading');
  });

  it('sin perfil y el reclamo falló → sin invitación', () => {
    expect(resolveAccess({ authReady: true, user, profile: null, claimFailed: true })).toBe('no-invitation');
  });

  it('perfil desactivado', () => {
    const inactive = { ...profile, active: false };
    expect(resolveAccess({ authReady: true, user, profile: inactive, claimFailed: false })).toBe('inactive');
  });

  it('perfil activo', () => {
    expect(resolveAccess({ authReady: true, user, profile, claimFailed: false })).toBe('active');
  });
});
