import { useCallback, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SendSummaryButton } from '@/components/tasks/SendSummaryButton';
import { TaskBoard, type TaskView } from '@/components/tasks/TaskBoard';
import { TaskStats } from '@/components/tasks/TaskStats';
import { TodoForm } from '@/components/tasks/TodoForm';
import { TodoList } from '@/components/tasks/TodoList';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { can } from '@/features/auth/permissions';
import { assigneeOptions, makeNameOf } from '@/features/team/members';
import { scopeTasks } from '@/features/tasks/scopeTasks';
import { sortTasks } from '@/features/tasks/sortTasks';
import { countTasks, filterByCard } from '@/features/tasks/taskStats';
import { useAuth } from '@/hooks/useAuth';
import { usePreference } from '@/hooks/usePreference';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { UserProfile } from '@/types/auth';
import { SCOPES, SCOPE_LABEL, type SortMode, type StatCard, type Task, type TaskInput, type TaskScope } from '@/types/task';
import { toDateInputValue } from '@/utils/formatDate';
import styles from './TasksPage.module.css';

export function TasksPage() {
  const { profile } = useAuth();
  // RequireAccess garantiza que acá siempre hay un perfil activo.
  return <TasksView profile={profile as UserProfile} />;
}

function TasksView({ profile }: { profile: UserProfile }) {
  const { tasks, loading, error, retry, create, update, remove, setStatus } = useTasks(profile.uid);
  const canCreate = can(profile, 'task:create');
  const canEdit = can(profile, 'task:edit');
  const members = useTeamMembers();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [sort, setSort] = useState<SortMode>('recent');
  const [scope, setScope] = usePreference<TaskScope>('matecode.scope', canEdit ? 'mine' : 'team', SCOPES);
  const [view, setView] = usePreference<TaskView>('matecode.view', 'list', ['list', 'board']);
  const [card, setCard] = useState<StatCard | null>(null);
  // "Hoy" se fija al abrir la página (para saber qué está vencido); recargar actualiza la fecha.
  const [today] = useState(() => toDateInputValue(new Date()));
  const dismissToast = useCallback(() => setToast(null), []);

  const nameOf = makeNameOf(members);
  const scoped = scopeTasks(tasks, scope, profile.uid);
  const stats = countTasks(scoped, today);
  const visibleTasks = sortTasks(filterByCard(scoped, card, today), sort);

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
    setCreating(false);
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
        actions={
          <>
            <SendSummaryButton onResult={setToast} />
            {canCreate && <Button size="sm" onClick={() => setCreating(true)}>+ Nueva tarea</Button>}
          </>
        }
      />

      <main className={styles.main}>
        {!canCreate && (
          <Alert kind="info">Tienes acceso de solo lectura: puedes ver las tareas del equipo, pero no modificarlas.</Alert>
        )}

        <section aria-label="Tareas" className={styles.tasks}>
          {loading && <Spinner label="Cargando tareas…" />}
          {error && (
            <Alert kind="error">
              {error} <Button size="sm" variant="ghost" onClick={retry}>Reintentar</Button>
            </Alert>
          )}
          {!loading && !error && (
            <>
              <div className={styles.toolbar}>
                <SegmentedControl
                  label="Mostrar" name="scope" value={scope}
                  onChange={(next) => {
                    setScope(next);
                    setCard(null);
                  }}
                  options={SCOPES.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))}
                />
                <SegmentedControl
                  label="Vista" name="view" value={view} onChange={setView}
                  options={[{ value: 'list', label: 'Lista' }, { value: 'board', label: 'Tablero' }]}
                />
                <label className={styles.sort}>
                  Ordenar por
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
                    <option value="recent">Más recientes</option>
                    <option value="due">Vencimiento</option>
                    <option value="priority">Prioridad</option>
                  </select>
                </label>
              </div>
              <TaskStats stats={stats} selected={card} onSelect={setCard} />
              {view === 'board' ? (
                <TaskBoard
                  tasks={visibleTasks}
                  nameOf={nameOf}
                  canEdit={canEdit}
                  onStatusChange={(id, status) => void safely(() => setStatus(id, status))}
                  // Hasta que exista el panel de detalle, abrir = editar (solo para quien puede editar).
                  onOpen={(task) => canEdit && setEditing(task)}
                />
              ) : (
                <TodoList
                  tasks={visibleTasks}
                  nameOf={nameOf}
                  canEdit={canEdit}
                  canDelete={(task) => can(profile, 'task:delete', { createdBy: task.createdBy })}
                  {...(card !== null
                    ? { emptyTitle: 'No hay tareas en este filtro', emptyHint: 'Haz clic de nuevo en la tarjeta para ver todas.' }
                    : scope === 'mine'
                      ? { emptyTitle: 'No tienes tareas asignadas', emptyHint: 'Prueba con "Todo el equipo".' }
                      : !canCreate && { emptyHint: 'Cuando el equipo cree tareas, aparecerán aquí.' })}
                  onStatusChange={(id, status) => void safely(() => setStatus(id, status))}
                  onEdit={setEditing}
                  onDelete={(id) => void safely(() => remove(id), 'Tarea eliminada.')}
                />
              )}
            </>
          )}
        </section>
      </main>

      {creating && (
        <Modal title="Nueva tarea" onClose={() => setCreating(false)}>
          <TodoForm
            // Empieza asignada a quien la crea: si no, desaparecería de "Mías" al guardarla.
            initialValues={{ title: '', description: '', priority: 'media', dueDate: null, assigneeId: profile.uid }}
            submitLabel="Crear tarea"
            assignees={assigneeOptions(members, profile.uid)}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Editar tarea" onClose={() => setEditing(null)}>
          <TodoForm
            initialValues={{
              title: editing.title,
              description: editing.description,
              priority: editing.priority,
              dueDate: editing.dueDate,
              assigneeId: editing.assigneeId,
            }}
            submitLabel="Guardar cambios"
            assignees={assigneeOptions(members, editing.assigneeId)}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </>
  );
}
