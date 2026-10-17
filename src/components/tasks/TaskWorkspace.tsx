import { LayoutGrid, List, Table2 } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { TaskBoard } from './TaskBoard';
import { TaskDialogs } from './TaskDialogs';
import { TaskTable } from './TaskTable';
import { TodoList } from './TodoList';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { FiltersPopover } from '@/components/ui/FiltersPopover';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { ViewTabs } from '@/components/ui/ViewTabs';
import { can, seesDoneTasks } from '@/features/auth/permissions';
import { canEditInProject } from '@/features/projects/projectAccess';
import { makeProjectOf } from '@/features/projects/projectOf';
import { makeNameOf, makePersonOf, unknownPersonFor } from '@/features/team/members';
import { scopeTasks } from '@/features/tasks/scopeTasks';
import { filterByPriority, filterByProject, searchTasks, type PriorityFilter, type ProjectFilter } from '@/features/tasks/searchTasks';
import { sortTasks } from '@/features/tasks/sortTasks';
import { isOverdue } from '@/features/tasks/taskStats';
import { usePreference } from '@/hooks/usePreference';
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { UserProfile } from '@/types/auth';
import { PRIORITIES, PRIORITY_LABEL, SCOPES, SCOPE_LABEL, type SortMode, type NewTask, type TaskScope, type Task, type TaskStatus, type TaskView } from '@/types/task';
import { toDateInputValue } from '@/utils/formatDate';
import { StickyHeader } from '@/components/layout/StickyHeader';
import { NoProjectsYet } from '@/components/projects/NoProjectsYet';
import styles from './TaskWorkspace.module.css';

type TaskWorkspaceProps = {
  profile: UserProfile;
  /** Si se pasa, solo se ven las tareas de ese proyecto y las nuevas se crean dentro de él */
  projectId?: string;
  /** Recibe el botón "+ Nueva tarea" (o null si no puede crear) y devuelve el encabezado de la página */
  renderHeader: (newTaskButton: ReactNode) => ReactNode;
};

/** Tareas con alcance, tarjetas, vistas, panel y creación. La usan Mis tareas y la página de cada proyecto. */
export function TaskWorkspace({ profile, projectId, renderHeader }: TaskWorkspaceProps) {
  const { tasks, loading, error, retry, create, update, remove, setStatus } = useTasks(profile.uid);
  const canEdit = can(profile, 'task:edit');
  const showDone = seesDoneTasks(profile.role);
  const [confirmDoneId, setConfirmDoneId] = useState<string | null>(null);
  const members = useTeamMembers();
  const { projects, loading: projectsLoading } = useProjects();
  // El Invitado crea y edita solo en sus proyectos donde "Puede editar".
  const editableProjects = projects.filter((p) => !p.archived && canEditInProject(profile.role, profile.uid, p));
  const canCreate = can(profile, 'task:create') && (profile.role !== 'guest' || editableProjects.length > 0);
  // El Invitado sin proyectos no tiene nada que ver ni dónde crear: se le explica qué pasa.
  const withoutProjects = profile.role === 'guest' && !projectsLoading && projects.length === 0;
  const { taskPrefix } = useWorkspaceSettings();
  const [creating, setCreating] = useState<Partial<NewTask> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [sort, setSort] = useState<SortMode>('recent');
  // En un proyecto se empieza viendo a todo el equipo, y la elección se recuerda aparte.
  const [scope, setScope] = usePreference<TaskScope>(
    projectId ? 'matecode.scope.project' : 'matecode.scope', canEdit && !projectId ? 'mine' : 'team', SCOPES,
  );
  // Clave nueva (etapa 10): todos arrancan en el tablero, la vista principal.
  const [view, setView] = usePreference<TaskView>('matecode.view.v2', 'board', ['board', 'list', 'table']);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  // "Hoy" se fija al abrir la página (para saber qué está vencido); recargar actualiza la fecha.
  const [today] = useState(() => toDateInputValue(new Date()));
  const dismissToast = useCallback(() => setToast(null), []);

  const nameOf = makeNameOf(members, unknownPersonFor(profile.role));
  const personOf = makePersonOf(members, unknownPersonFor(profile.role));
  const projectOf = makeProjectOf(projects);
  const canEditTask = (task: Task) => canEditInProject(profile.role, profile.uid, projectOf(task.projectId));
  const inProject = projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;
  const scoped = scopeTasks(inProject, scope, profile.uid);
  const filtered = filterByProject(filterByPriority(searchTasks(scoped, query, taskPrefix), priority), projectId ? 'all' : projectFilter);
  const visibleTasks = sortTasks(onlyOverdue ? filtered.filter((t) => isOverdue(t, today)) : filtered, sort);
  // Cuántos filtros recortan la lista (el alcance y el orden no cuentan: son la forma de mirar).
  const activeFilters = Number(priority !== 'all') + Number(!projectId && projectFilter !== 'all') + Number(onlyOverdue);

  function clearFilters() {
    setPriority('all');
    setProjectFilter('all');
    setOnlyOverdue(false);
    setSort('recent');
  }

  async function safely(action: () => Promise<void>, success?: string) {
    try {
      await action();
      if (success) setToast({ kind: 'success', message: success });
    } catch (err) {
      console.error('Error al actualizar la tarea:', err);
      setToast({ kind: 'error', message: 'No pudimos guardar el cambio. Inténtalo de nuevo.' });
    }
  }

  // El Invitado deja de ver una tarea al terminarla: se le pide confirmación antes.
  function changeStatus(id: string, status: TaskStatus) {
    if (profile.role === 'guest' && status === 'done') setConfirmDoneId(id);
    else void safely(() => setStatus(id, status));
  }

  return (
    <>
      <StickyHeader>
        {renderHeader(canCreate && !withoutProjects ? <Button size="sm" onClick={() => setCreating(projectId ? { projectId } : {})}>+ Nueva tarea</Button> : null)}
        {!withoutProjects && (
          <div className={styles.bar}>
            <ViewTabs
              label="Vista" name="view" value={view} onChange={setView}
              options={[
                { value: 'board', label: 'Tablero', icon: LayoutGrid },
                { value: 'list', label: 'Lista', icon: List },
                { value: 'table', label: 'Tabla', icon: Table2 },
              ]}
            />
            <div className={styles.tools}>
              <label className="visually-hidden" htmlFor="task-search">Buscar tareas</label>
              <input
                id="task-search" type="search" className={styles.search} value={query}
                placeholder={`Buscar o ${taskPrefix}-…`} onChange={(e) => setQuery(e.target.value)}
              />
              <FiltersPopover activeCount={activeFilters} onClear={clearFilters}>
                <SegmentedControl
                  label="Mostrar" name="scope" value={scope} onChange={setScope}
                  options={SCOPES.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))}
                />
                <label className={styles.field}>
                  Prioridad
                  <select value={priority} onChange={(e) => setPriority(e.target.value as PriorityFilter)}>
                    <option value="all">Todas</option>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                  </select>
                </label>
                {!projectId && (
                  <label className={styles.field}>
                    Proyecto
                    <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                      <option value="all">Todos</option>
                      <option value="none">Sin proyecto</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archived ? ' (archivado)' : ''}</option>)}
                    </select>
                  </label>
                )}
                <label className={styles.check}>
                  <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} />
                  Solo vencidas
                </label>
                <label className={styles.field}>
                  Ordenar por
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
                    <option value="recent">Más recientes</option>
                    <option value="due">Vencimiento</option>
                    <option value="priority">Prioridad</option>
                  </select>
                </label>
              </FiltersPopover>
            </div>
          </div>
        )}
      </StickyHeader>

      <main className={styles.main}>
        {withoutProjects ? <NoProjectsYet /> : (
        <>
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
              {view === 'board' ? (
                <TaskBoard
                  showDone={showDone}
                  today={today}
                  onAdd={canCreate ? (status) => setCreating({ ...(projectId && { projectId }), status }) : undefined}
                  tasks={visibleTasks}
                  nameOf={nameOf}
                  personOf={personOf}
                  projectOf={projectOf}
                  canEdit={canEdit}
                  canEditTask={canEditTask}
                  onStatusChange={changeStatus}
                  onOpen={(task) => setOpenId(task.id)}
                />
              ) : view === 'table' && visibleTasks.length > 0 ? (
                <TaskTable
                  tasks={visibleTasks}
                  nameOf={nameOf}
                  personOf={personOf}
                  projectOf={projectOf}
                  canEdit={canEdit}
                  canEditTask={canEditTask}
                  onStatusChange={changeStatus}
                  onOpen={(task) => setOpenId(task.id)}
                />
              ) : (
                <TodoList
                  tasks={visibleTasks}
                  nameOf={nameOf}
                  personOf={personOf}
                  projectOf={projectOf}
                  canEdit={canEdit}
                  canEditTask={canEditTask}
                  {...(query.trim()
                    ? { emptyTitle: 'No encontramos tareas', emptyHint: 'Prueba con otras palabras o con el número (MC-…).' }
                    : onlyOverdue
                      ? { emptyTitle: 'No hay tareas vencidas', emptyHint: 'Desactiva "Solo vencidas" en Filtros para ver todas.' }
                      : scope === 'mine'
                        ? { emptyTitle: 'No tienes tareas asignadas', emptyHint: 'Prueba con "Todo el equipo".' }
                        : !canCreate && { emptyHint: 'Cuando el equipo cree tareas, aparecerán aquí.' })}
                  onStatusChange={changeStatus}
                  onOpen={(task) => setOpenId(task.id)}
                />
              )}
            </>
          )}
        </section>
        </>
        )}
      </main>

      <TaskDialogs
        profile={profile} tasks={tasks} members={members} projects={projects}
        openId={openId} onCloseTask={() => setOpenId(null)}
        creating={creating} onCloseCreate={() => setCreating(null)}
        actions={{ create, update, remove }} onToast={setToast}
      />

      {confirmDoneId && (
        <Modal title="¿Marcar como hecha?" onClose={() => setConfirmDoneId(null)}>
          <p>Dejarás de verla: las tareas terminadas solo las ven el admin y los miembros.</p>
          <div className={styles.confirmActions}>
            <Button variant="ghost" onClick={() => setConfirmDoneId(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                const id = confirmDoneId;
                setConfirmDoneId(null);
                void safely(() => setStatus(id, 'done'));
              }}
            >
              Sí, marcar
            </Button>
          </div>
        </Modal>
      )}

      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </>
  );
}
