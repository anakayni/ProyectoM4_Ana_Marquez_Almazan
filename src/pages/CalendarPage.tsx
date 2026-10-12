import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import { AgendaView } from '@/components/calendar/AgendaView';
import { DayDialog } from '@/components/calendar/DayDialog';
import { MonthView } from '@/components/calendar/MonthView';
import { PageHeader } from '@/components/layout/PageHeader';
import { TaskDialogs } from '@/components/tasks/TaskDialogs';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { can } from '@/features/auth/permissions';
import { addMonths, agendaDays, monthGrid, monthLabel, projectMarkers, tasksByDay } from '@/features/calendar/month';
import { makeProjectOf } from '@/features/projects/projectOf';
import { scopeTasks } from '@/features/tasks/scopeTasks';
import { filterByProject, type ProjectFilter } from '@/features/tasks/searchTasks';
import { makeNameOf } from '@/features/team/members';
import { useAuth } from '@/hooks/useAuth';
import { usePreference } from '@/hooks/usePreference';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { UserProfile } from '@/types/auth';
import { SCOPES, SCOPE_LABEL, type TaskInput, type TaskScope } from '@/types/task';
import { toDateInputValue } from '@/utils/formatDate';
import styles from './CalendarPage.module.css';

export function CalendarPage() {
  const { profile } = useAuth();
  const me = profile as UserProfile; // RequireAccess garantiza un perfil activo
  const { tasks, loading, error, retry, create, update, remove } = useTasks(me.uid);
  const members = useTeamMembers();
  const { projects } = useProjects();
  // "Hoy" se fija al abrir la página; recargar actualiza la fecha.
  const [today] = useState(() => toDateInputValue(new Date()));
  const current = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 };
  const [cursor, setCursor] = useState(current);
  const [scope, setScope] = usePreference<TaskScope>('matecode.scope.calendar', 'team', SCOPES);
  const [hideDone, setHideDone] = usePreference<'yes' | 'no'>('matecode.calendar.hideDone', 'no', ['yes', 'no']);
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState<Partial<TaskInput> | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const nameOf = makeNameOf(members);
  const projectOf = makeProjectOf(projects);
  const visible = filterByProject(scopeTasks(tasks, scope, me.uid), projectFilter).filter(
    (t) => hideDone === 'no' || t.status !== 'done',
  );
  const markedProjects =
    projectFilter === 'none' ? [] : projects.filter((p) => !p.archived && (projectFilter === 'all' || p.id === projectFilter));
  const grid = monthGrid(cursor.year, cursor.month, today);
  const byDay = tasksByDay(visible);
  const markers = projectMarkers(markedProjects);
  const onCreate = can(me, 'task:create') ? (date: string) => { setOpenDay(null); setCreating({ dueDate: date }); } : null;
  const openTask = (id: string) => { setOpenDay(null); setOpenId(id); };

  return (
    <>
      <PageHeader title="Calendario" />
      <main className={styles.page}>
        <div className={styles.toolbar}>
          <div className={styles.month}>
            <Button size="sm" variant="secondary" aria-label="Mes anterior" onClick={() => setCursor(addMonths(cursor.year, cursor.month, -1))}>
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <h2 className={styles.monthTitle} aria-live="polite">{monthLabel(cursor.year, cursor.month)}</h2>
            <Button size="sm" variant="secondary" aria-label="Mes siguiente" onClick={() => setCursor(addMonths(cursor.year, cursor.month, 1))}>
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCursor(current)}>Hoy</Button>
          </div>
          <div className={styles.filters}>
            <SegmentedControl
              label="Mostrar" name="calendar-scope" value={scope} onChange={setScope}
              options={SCOPES.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))}
            />
            <label className={styles.select}>
              Proyecto
              <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                <option value="all">Todos</option>
                <option value="none">Sin proyecto</option>
                {projects.filter((p) => !p.archived).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={hideDone === 'yes'} onChange={(e) => setHideDone(e.target.checked ? 'yes' : 'no')} />
              Ocultar hechas
            </label>
          </div>
        </div>

        {loading && <Spinner label="Cargando tareas…" />}
        {error && <Alert kind="error">{error} <Button size="sm" variant="ghost" onClick={retry}>Reintentar</Button></Alert>}
        {!loading && !error && (
          <>
            <MonthView
              grid={grid} byDay={byDay} markers={markers} projectOf={projectOf} today={today}
              onOpenTask={(t) => openTask(t.id)} onCreate={onCreate} onOpenDay={setOpenDay}
            />
            <AgendaView
              days={agendaDays(grid, byDay, markers)} projectOf={projectOf} nameOf={nameOf} today={today}
              onOpenTask={(t) => openTask(t.id)} onCreate={onCreate}
            />
          </>
        )}
      </main>

      {openDay && (
        <DayDialog
          date={openDay} tasks={byDay.get(openDay) ?? []} markers={markers.get(openDay) ?? []} projectOf={projectOf} today={today}
          onOpenTask={(t) => openTask(t.id)} onCreate={onCreate} onClose={() => setOpenDay(null)}
        />
      )}
      <TaskDialogs
        profile={me} tasks={tasks} members={members} projects={projects}
        openId={openId} onCloseTask={() => setOpenId(null)}
        creating={creating} onCloseCreate={() => setCreating(null)}
        actions={{ create, update, remove }} onToast={setToast}
      />
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </>
  );
}
