import { LayoutGrid, List, Table2 } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { TaskBoard } from './TaskBoard';
import { TaskDialogs } from './TaskDialogs';
import { TaskStats } from './TaskStats';
import { TaskTable } from './TaskTable';
import { TodoList } from './TodoList';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { can, seesDoneTasks } from '@/features/auth/permissions';
import { makeProjectOf } from '@/features/projects/projectOf';
import { makeNameOf, makePersonOf, unknownPersonFor } from '@/features/team/members';
import { scopeTasks } from '@/features/tasks/scopeTasks';
import { filterByPriority, filterByProject, searchTasks, type PriorityFilter, type ProjectFilter } from '@/features/tasks/searchTasks';
import { sortTasks } from '@/features/tasks/sortTasks';
import { countTasks, filterByCard } from '@/features/tasks/taskStats';
import { usePreference } from '@/hooks/usePreference';
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { UserProfile } from '@/types/auth';
import { PRIORITIES, PRIORITY_LABEL, SCOPES, SCOPE_LABEL, type SortMode, type StatCard, type TaskInput, type TaskScope, type TaskStatus, type TaskView } from '@/types/task';
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
  const canCreate = can(profile, 'task:create');
  const canEdit = can(profile, 'task:edit');
  const showDone = seesDoneTasks(profile.role);
  const [confirmDoneId, setConfirmDoneId] = useState<string | null>(null);
  const members = useTeamMembers();
  const { projects, loading: projectsLoading } = useProjects();
  // El Invitado sin proyectos no tiene nada que ver ni dónde crear: se le explica qué pasa.
  const withoutProjects = profile.role === 'guest' && !projectsLoading && projects.length === 0;
  const { taskPrefix } = useWorkspaceSettings();
  const [creating, setCreating] = useState<Partial<TaskInput> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [sort, setSort] = useState<SortMode>('recent');
  // En un proyecto se empieza viendo a todo el equipo, y la elección se recuerda aparte.
  const [scope, setScope] = usePreference<TaskScope>(
    projectId ? 'matecode.scope.project' : 'matecode.scope', canEdit && !projectId ? 'mine' : 'team', SCOPES,
  );
  const [view, setView] = usePreference<TaskView>('matecode.view', 'list', ['list', 'table', 'board']);
  const [card, setCard] = useState<StatCard | null>(null);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<PriorityFilter>('all');
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  // "Hoy" se fija al abrir la página (para saber qué está vencido); recargar actualiza la fecha.
  const [today] = useState(() => toDateInputValue(new Date()));
  const dismissToast = useCallback(() => setToast(null), []);

  const nameOf = makeNameOf(members, unknownPersonFor(profile.role));
  const personOf = makePersonOf(members, unknownPersonFor(profile.role));
  const projectOf = makeProjectOf(projects);
  const inProject = projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;
  const scoped = scopeTasks(inProject, scope, profile.uid);
  // Las tarjetas cuentan lo que queda tras buscar y filtrar, así coinciden con lo que se ve.
  const filtered = filterByProject(filterByPriority(searchTasks(scoped, query, taskPrefix), priority), projectId ? 'all' : projectFilter);
  const stats = countTasks(filtered, today);
  const visibleTasks = sortTasks(filterByCard(filtered, card, today), sort);

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
        <div className={styles.bars}>
          <div className={styles.filters}>
            <label className="visually-hidden" htmlFor="task-search">Buscar tareas</label>
            <input
              id="task-search" type="search" className={styles.search} value={query}
              placeholder={`Buscar por título, descripción o ${taskPrefix}-…`} onChange={(e) => setQuery(e.target.value)}
            />
            <label className={styles.sort}>
              Prioridad
              <select value={priority} onChange={(e) => setPriority(e.target.value as PriorityFilter)}>
                <option value="all">Todas</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </label>
            {!projectId && (
              <label className={styles.sort}>
                Proyecto
                <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                  <option value="all">Todos</option>
                  <option value="none">Sin proyecto</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archived ? ' (archivado)' : ''}</option>)}
                </select>
              </label>
            )}
          </div>
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
              options={[
                { value: 'list', label: 'Lista', icon: List },
                { value: 'table', label: 'Tabla', icon: Table2 },
                { value: 'board', label: 'Tablero', icon: LayoutGrid },
              ]}
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
              <TaskStats stats={stats} selected={card} onSelect={setCard} showDone={showDone} />
              {view === 'board' ? (
                <TaskBoard
                  showDone={showDone}
                  tasks={visibleTasks}
                  nameOf={nameOf}
                  personOf={personOf}
                  projectOf={projectOf}
                  canEdit={canEdit}
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
                  {...(query.trim()
                    ? { emptyTitle: 'No encontramos tareas', emptyHint: 'Prueba con otras palabras o con el número (MC-…).' }
                    : card !== null
                      ? { emptyTitle: 'No hay tareas en este filtro', emptyHint: 'Haz clic de nuevo en la tarjeta para ver todas.' }
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
