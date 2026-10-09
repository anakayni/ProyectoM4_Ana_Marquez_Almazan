import { useState } from 'react';
import { AuthLayout, authFormClass } from '@/components/auth/AuthLayout';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

/** Las cuentas con contraseña deben confirmar su email antes de reclamar una invitación. */
export function VerifyEmailPage() {
  const { user, refreshVerification, resendVerification, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function handleCheck() {
    setChecking(true);
    setMessage(null);
    try {
      // Si ya está verificado, el estado de acceso cambia y la ruta redirige sola.
      const verified = await refreshVerification();
      if (!verified) {
        setMessage({ kind: 'error', text: 'Todavía no vemos la confirmación. Revisa también la carpeta de spam.' });
      }
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setMessage(null);
    try {
      await resendVerification();
      setMessage({ kind: 'success', text: 'Te enviamos un nuevo link.' });
    } catch (err) {
      console.error('Error al reenviar la verificación:', err);
      setMessage({ kind: 'error', text: 'No pudimos reenviar el email. Espera unos minutos e inténtalo de nuevo.' });
    }
  }

  return (
    <AuthLayout
      title="Confirma tu email"
      subtitle="Es el último paso para entrar al espacio de trabajo."
    >
      <p>
        Te enviamos un link a <strong>{user?.email}</strong>. Ábrelo y vuelve aquí.
      </p>
      {message && <Alert kind={message.kind}>{message.text}</Alert>}
      <div className={authFormClass}>
        <Button onClick={() => void handleCheck()} loading={checking}>Ya lo confirmé</Button>
        <Button variant="secondary" onClick={() => void handleResend()}>Reenviar email</Button>
        <Button variant="ghost" onClick={() => void logout()}>Cerrar sesión</Button>
      </div>
    </AuthLayout>
  );
}
