import { describe, expect, it } from 'vitest';
import { hasErrors, validateLogin, validateRegister, validateTask } from '@/utils/validators';

describe('validateLogin', () => {
  it('pide email y contraseña', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Ingresa tu email.',
      password: 'Ingresa tu contraseña.',
    });
  });

  it('rechaza emails mal formados', () => {
    expect(validateLogin({ email: 'ana@', password: 'secreto' }).email).toBe('El email no tiene un formato válido.');
  });

  it('acepta datos válidos (recortando espacios del email)', () => {
    expect(validateLogin({ email: '  ana@mail.com ', password: 'secreto' })).toEqual({});
  });
});

describe('validateRegister', () => {
  const valid = { name: 'Ana', email: 'ana@mail.com', password: 'secreto', confirmPassword: 'secreto' };

  it('acepta datos válidos', () => {
    expect(validateRegister(valid)).toEqual({});
  });

  it('exige nombre', () => {
    expect(validateRegister({ ...valid, name: '  ' }).name).toBe('Ingresa tu nombre.');
  });

  it('exige contraseña de al menos 6 caracteres', () => {
    expect(validateRegister({ ...valid, password: '123', confirmPassword: '123' }).password).toBe(
      'La contraseña debe tener al menos 6 caracteres.',
    );
  });

  it('exige que las contraseñas coincidan', () => {
    expect(validateRegister({ ...valid, confirmPassword: 'otra' }).confirmPassword).toBe('Las contraseñas no coinciden.');
  });
});

describe('validateTask', () => {
  it('exige título', () => {
    expect(validateTask({ title: '   ', description: '' }).title).toBe('El título es obligatorio.');
  });

  it('limita el título a 80 caracteres', () => {
    expect(validateTask({ title: 'a'.repeat(81), description: '' }).title).toBe('Máximo 80 caracteres.');
  });

  it('limita la descripción a 500 caracteres', () => {
    expect(validateTask({ title: 'Tarea', description: 'a'.repeat(501) }).description).toBe('Máximo 500 caracteres.');
  });

  it('acepta título válido y descripción vacía', () => {
    expect(validateTask({ title: 'Tarea', description: '' })).toEqual({});
  });
});

describe('hasErrors', () => {
  it('detecta si hay al menos un error', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ title: 'x' })).toBe(true);
  });
});
