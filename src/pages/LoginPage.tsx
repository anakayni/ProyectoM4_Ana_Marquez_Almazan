import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthLayout, authDividerClass, authFormClass } from '@/components/auth/AuthLayout';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { useAuth } from '@/hooks/useAuth';
import { useAuthAction } from '@/hooks/useAuthAction';
import { hasErrors, validateLogin, type FieldErrors } from '@/utils/validators';

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const { error, submitting, run } = useAuthAction();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'email' | 'password'>>({});

  // Si el login funciona, PublicOnlyRoute redirige solo a /tasks.
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    void run(() => login(email, password));
  }

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Organiza tus tareas del día."
      footer={<>¿No tienes cuenta? <Link to="/register">Regístrate</Link></>}
    >
      {error && <Alert kind="error">{error}</Alert>}
      <form className={authFormClass} onSubmit={handleSubmit} noValidate>
        <Field id="email" label="Email" error={fieldErrors.email}>
          <input
            id="email" type="email" autoComplete="email" className={fieldInputClass}
            value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
        </Field>
        <Field id="password" label="Contraseña" error={fieldErrors.password}>
          <input
            id="password" type="password" autoComplete="current-password" className={fieldInputClass}
            value={password} onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          />
        </Field>
        <Button type="submit" loading={submitting}>Iniciar sesión</Button>
      </form>
      <div className={authDividerClass}>o</div>
      <GoogleButton onClick={() => void run(loginWithGoogle)} disabled={submitting} />
    </AuthLayout>
  );
}
