import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import type { Access } from '@/types/auth';

/** Ruta "natural" para cada estado de acceso. */
// eslint-disable-next-line react/only-export-components -- helper ligado a esta guardia
export function homeFor(access: Access): string {
  switch (access) {
    case 'active':
      return '/tasks';
    case 'unverified':
      return '/verify-email';
    case 'no-invitation':
    case 'inactive':
      return '/no-access';
    default:
      return '/login';
  }
}

/** Muestra la página solo si el estado de acceso está en `allow`; si no, redirige a donde corresponde. */
export function RequireAccess({ allow, children }: { allow: Access[]; children: ReactNode }) {
  const { access } = useAuth();
  if (access === 'loading') return <Spinner label="Cargando sesión…" />;
  if (!allow.includes(access)) return <Navigate to={homeFor(access)} replace />;
  return children;
}
