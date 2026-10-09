import { useCallback, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SendSummaryButton } from '@/components/tasks/SendSummaryButton';
import { TaskFilters } from '@/components/tasks/TaskFilters';
import { TodoForm } from '@/components/tasks/TodoForm';
import { TodoList } from '@/components/tasks/TodoList';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { can } from '@/features/auth/permissions';
import { countTasks, filterTasks } from '@/features/tasks/filterTasks';
import { sortTasks } from '@/features/tasks/sortTasks';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import type { UserProfile } from '@/types/auth';
import type { SortMode, Task, TaskFilter, TaskInput } from '@/types/task';
import styles from './TasksPage.module.css';

export function TasksPage() {
  const { profile } = useAuth();
  // RequireAccess garantiza que acá siempre hay un perfil activo.
  return <TasksView profile={profile as UserProfile} />;
}

function TasksView({ profile }: { profile: UserProfile }) {
  const { tasks, loading, error, retry, create, update, remove, toggle } = useTasks(profile.uid);
  const canCreate = can(profile, 'task:create');
  const canEdit = can(profile, 'task:edit');
  const [editing, setEditing] = useState<Task | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sort, setSort] = useState<SortMode>('recent');
  const dismissToast = useCallback(() => setToast(null), []);

  const counts = countTasks(tasks);
  const visibleTasks = sortTasks(filterTasks(tasks, filter), sort);

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
    <>
      <PageHeader
        title="Mis tareas"
        subtitle={
          !loading && !error ? (
            <span className={styles.counts}>{counts.pending} pendientes · {counts.done} completadas</span>
          ) : undefined
        }
        actions={<SendSummaryButton onResult={setToast} />}
      />

      <main className={styles.main}>
        {canCreate ? (
          <section className={styles.card} aria-labelledby="new-task-title">
            <h2 id="new-task-title" className={styles.sectionTitle}>Nueva tarea</h2>
            <TodoForm onSubmit={handleCreate} />
          </section>
        ) : (
          <Alert kind="info">Tienes acceso de solo lectura: puedes ver las tareas del equipo, pero no modificarlas.</Alert>
        )}

        <section aria-labelledby="list-title">
          <h2 id="list-title" className={styles.sectionTitle}>Tareas del equipo</h2>
          {loading && <Spinner label="Cargando tareas…" />}
          {error && (
            <Alert kind="error">
              {error} <Button size="sm" variant="ghost" onClick={retry}>Reintentar</Button>
            </Alert>
          )}
          {!loading && !error && tasks.length > 0 && (
            <div className={styles.toolbar}>
              <TaskFilters value={filter} counts={counts} onChange={setFilter} />
              <label className={styles.sort}>
                Ordenar por
                <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
                  <option value="recent">Más recientes</option>
                  <option value="due">Vencimiento</option>
                  <option value="priority">Prioridad</option>
                </select>
              </label>
            </div>
          )}
          {!loading && !error && (
            <TodoList
              tasks={visibleTasks}
              canEdit={canEdit}
              canDelete={(task) => can(profile, 'task:delete', { createdBy: task.createdBy })}
              {...(tasks.length > 0
                ? { emptyTitle: 'No hay tareas en este filtro', emptyHint: 'Prueba con otro filtro.' }
                : !canCreate && { emptyHint: 'Cuando el equipo cree tareas, aparecerán aquí.' })}
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
            initialValues={{
              title: editing.title,
              description: editing.description,
              priority: editing.priority,
              dueDate: editing.dueDate,
            }}
            submitLabel="Guardar cambios"
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </>
  );
}
