import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { can } from '@/features/auth/permissions';
import { useAuth } from '@/hooks/useAuth';

/** Solo para administradores (las reglas de Firestore lo vuelven a verificar en cada escritura). */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (!can(profile, 'team:manage')) return <Navigate to="/tasks" replace />;
  return children;
}
