import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

/** Solo para visitantes (login/registro); con sesión activa redirige a /tasks. */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Cargando sesión…" />;
  if (user) return <Navigate to="/tasks" replace />;
  return children;
}
