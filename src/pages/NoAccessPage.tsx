import { AuthLayout, authFormClass } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

/** Sesión válida pero sin acceso: sin invitación o desactivada por un administrador. */
export function NoAccessPage() {
  const { access, user, logout } = useAuth();
  const inactive = access === 'inactive';

  return (
    <AuthLayout
      title={inactive ? 'Tu acceso fue desactivado' : 'No tienes invitación a este espacio'}
      subtitle="MateCode Tasks es solo para personas invitadas."
    >
      <p>
        {inactive ? (
          'Si crees que es un error, contacta a un administrador.'
        ) : (
          <>Pide a un administrador que te invite con <strong>{user?.email}</strong>.</>
        )}
      </p>
      <div className={authFormClass}>
        <Button variant="secondary" onClick={() => void logout()}>Cerrar sesión</Button>
      </div>
    </AuthLayout>
  );
}
