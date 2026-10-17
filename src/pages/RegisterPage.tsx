import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AuthLayout, authDividerClass, authFormClass } from '@/components/auth/AuthLayout';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { useAuth } from '@/hooks/useAuth';
import { useAuthAction } from '@/hooks/useAuthAction';
import type { RegisterFormValues } from '@/types/auth';
import { normalizeEmail } from '@/utils/email';
import { hasErrors, validateRegister, type FieldErrors } from '@/utils/validators';

type RegisterField = keyof RegisterFormValues;

const FIELDS: { name: RegisterField; label: string; type: string; autoComplete: string }[] = [
  { name: 'name', label: 'Nombre', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Contraseña', type: 'password', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Repetir contraseña', type: 'password', autoComplete: 'new-password' },
];

export function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const { error, submitting, run } = useAuthAction();
  // El link de invitación trae el email: /register?email=ana@empresa.com
  const [params] = useSearchParams();
  const invitedEmail = normalizeEmail(params.get('email') ?? '');
  const [values, setValues] = useState<RegisterFormValues>({ name: '', email: invitedEmail, password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterField>>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateRegister(values);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    void run(() => register({ name: values.name, email: values.email, password: values.password }));
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle={invitedEmail ? 'Te invitaron a un espacio de trabajo. Regístrate con este email.' : 'Solo para personas invitadas por un administrador.'}
      footer={<>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></>}
    >
      {error && <Alert kind="error">{error}</Alert>}
      <form className={authFormClass} onSubmit={handleSubmit} noValidate>
        {FIELDS.map((field) => (
          <Field key={field.name} id={field.name} label={field.label} error={fieldErrors[field.name]}>
            <input
              id={field.name} type={field.type} autoComplete={field.autoComplete} className={fieldInputClass}
              value={values[field.name]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
              aria-invalid={Boolean(fieldErrors[field.name])}
              aria-describedby={fieldErrors[field.name] ? `${field.name}-error` : undefined}
            />
          </Field>
        ))}
        <Button type="submit" loading={submitting}>Crear cuenta</Button>
      </form>
      <div className={authDividerClass}>o</div>
      <GoogleButton onClick={() => void run(loginWithGoogle)} disabled={submitting} />
    </AuthLayout>
  );
}
