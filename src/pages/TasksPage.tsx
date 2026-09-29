import { useCallback, useState } from 'react';
import { TodoForm } from '@/components/tasks/TodoForm';
import { TodoList } from '@/components/tasks/TodoList';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import type { AppUser } from '@/types/auth';
import type { Task, TaskInput } from '@/types/task';
import styles from './TasksPage.module.css';

export function TasksPage() {
  const { user, logout } = useAuth();
  // ProtectedRoute garantiza que acá siempre hay usuario.
  return <TasksView user={user as AppUser} onLogout={logout} />;
}

function TasksView({ user, onLogout }: { user: AppUser; onLogout: () => Promise<void> }) {
  const { tasks, loading, error, retry, create, update, remove, toggle } = useTasks(user.uid);
  const [editing, setEditing] = useState<Task | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const pending = tasks.filter((t) => !t.completed).length;

  async function safely(action: () => Promise<void>, success?: string) {
    try {
      await action();
      if (success) setToast({ kind: 'success', message: success });
    } catch (err) {
      console.error('Error al actualizar la tarea:', err);
      setToast({ kind: 'error', message: 'No pudimos guardar el cambio. Inténtalo de nuevo.' });
    }
  }

  async function handleCreate(values: TaskInput) {
    await create(values); // si falla, TodoForm muestra el error
    setToast({ kind: 'success', message: 'Tarea creada.' });
  }

  async function handleEdit(values: TaskInput) {
    if (!editing) return;
    await update(editing.id, values);
    setEditing(null);
    setToast({ kind: 'success', message: 'Tarea actualizada.' });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>MateCode <span>Tasks</span></p>
          <h1 className={styles.greeting}>Hola, {user.displayName || user.email}</h1>
          {!loading && !error && (
            <p className={styles.summary}>{pending} pendientes · {tasks.length - pending} completadas</p>
          )}
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" size="sm" onClick={() => void onLogout()}>Cerrar sesión</Button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="new-task-title">
          <h2 id="new-task-title" className={styles.sectionTitle}>Nueva tarea</h2>
          <TodoForm onSubmit={handleCreate} />
        </section>

        <section aria-labelledby="list-title">
          <h2 id="list-title" className={styles.sectionTitle}>Mis tareas</h2>
          {loading && <Spinner label="Cargando tareas…" />}
          {error && (
            <Alert kind="error">
              {error} <Button size="sm" variant="ghost" onClick={retry}>Reintentar</Button>
            </Alert>
          )}
          {!loading && !error && (
            <TodoList
              tasks={tasks}
              onToggle={(id, completed) => void safely(() => toggle(id, completed))}
              onEdit={setEditing}
              onDelete={(id) => void safely(() => remove(id), 'Tarea eliminada.')}
            />
          )}
        </section>
      </main>

      {editing && (
        <Modal title="Editar tarea" onClose={() => setEditing(null)}>
          <TodoForm
            initialValues={{ title: editing.title, description: editing.description }}
            submitLabel="Guardar cambios"
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </div>
  );
}
