import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

// Versión provisoria: la lista de tareas llega en la fase 3.
export function TasksPage() {
  const { user, logout } = useAuth();
  return (
    <main style={{ padding: 'var(--space-6)' }}>
      <h1>Hola, {user?.displayName || user?.email}</h1>
      <Button variant="secondary" onClick={() => void logout()}>Cerrar sesión</Button>
    </main>
  );
}
