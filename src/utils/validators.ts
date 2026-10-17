import type { RegisterFormValues } from '@/types/auth';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 500;
export const PASSWORD_MIN = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Ingresa tu email.';
  if (!EMAIL_PATTERN.test(value)) return 'El email no tiene un formato válido.';
  return undefined;
}

/** Elimina las claves sin error para que `{}` signifique "todo válido". */
function compact<K extends string>(errors: Record<K, string | undefined>): FieldErrors<K> {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as FieldErrors<K>;
}

export function validateLogin(values: { email: string; password: string }): FieldErrors<'email' | 'password'> {
  return compact({
    email: validateEmail(values.email),
    password: values.password ? undefined : 'Ingresa tu contraseña.',
  });
}

export function validateRegister(
  values: RegisterFormValues,
): FieldErrors<'name' | 'email' | 'password' | 'confirmPassword'> {
  return compact({
    name: values.name.trim() ? undefined : 'Ingresa tu nombre.',
    email: validateEmail(values.email),
    password:
      values.password.length >= PASSWORD_MIN
        ? undefined
        : `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
    confirmPassword: values.confirmPassword === values.password ? undefined : 'Las contraseñas no coinciden.',
  });
}

export function validateTask(values: { title: string; description: string }): FieldErrors<'title' | 'description'> {
  const title = values.title.trim();
  return compact({
    title: !title ? 'El título es obligatorio.' : title.length > TITLE_MAX ? `Máximo ${TITLE_MAX} caracteres.` : undefined,
    description: values.description.length > DESCRIPTION_MAX ? `Máximo ${DESCRIPTION_MAX} caracteres.` : undefined,
  });
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
