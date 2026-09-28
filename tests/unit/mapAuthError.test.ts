import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTH_ERROR, mapAuthError } from '@/features/auth/mapAuthError';

describe('mapAuthError', () => {
  it('traduce credenciales inválidas', () => {
    expect(mapAuthError({ code: 'auth/invalid-credential' })).toBe(
      'Email o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.',
    );
  });

  it('traduce email ya registrado', () => {
    expect(mapAuthError({ code: 'auth/email-already-in-use' })).toMatch(/ya existe una cuenta/i);
  });

  it('traduce popup de Google cerrado', () => {
    expect(mapAuthError({ code: 'auth/popup-closed-by-user' })).toMatch(/cerraste la ventana de google/i);
  });

  it('usa un mensaje genérico para códigos desconocidos o valores raros', () => {
    expect(mapAuthError({ code: 'auth/algo-nuevo' })).toBe(DEFAULT_AUTH_ERROR);
    expect(mapAuthError(new Error('x'))).toBe(DEFAULT_AUTH_ERROR);
    expect(mapAuthError(null)).toBe(DEFAULT_AUTH_ERROR);
  });
});
