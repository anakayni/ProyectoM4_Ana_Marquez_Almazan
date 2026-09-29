import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

/** Solo deja pasar a usuarios con sesión; si no, redirige a /login. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Cargando sesión…" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
