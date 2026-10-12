# v2 Etapa 6A — Calendario, vista Mes: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sección Calendario con la vista Mes (tareas por vencimiento e inicio/fin de proyectos), agenda en celular, filtros, "+" por día para crear y el mismo panel editable de las tareas.

**Architecture:** Funciones puras en `src/features/calendar/` arman la grilla y agrupan tareas y marcas por día. El panel y la ventana "Nueva tarea" se extraen de `TaskWorkspace` a `TaskDialogs`, que reutilizan Mis tareas y el Calendario. `MonthView` (tabla) y `AgendaView` (lista) se renderizan juntas y CSS muestra una u otra.

**Tech Stack:** React 19, React Router 8, Vitest + RTL (`vi.useFakeTimers({ toFake: ['Date'] })` para fijar "hoy").

**Spec:** `docs/specs/2026-10-12-v2-etapa6-calendario-design.md` (parte 6A; la 6B —Gantt— tiene su propio plan)

## Global Constraints

- Sin cambios en Firestore (ni colecciones, ni reglas, ni migraciones).
- Fechas `YYYY-MM-DD` locales; "hoy" se pasa como parámetro a las funciones puras.
- Semanas de lunes a domingo; encabezados "Lun … Dom".
- Hasta 3 tareas por día en la grilla; el resto como "+N más".
- Tareas hechas tachadas; "Ocultar hechas" las saca y se recuerda.
- Vencidas (no hechas y con fecha anterior a hoy) con fondo de peligro.
- Celular (< 768px): agenda por día con contenido; la grilla se oculta.
- Textos: "Calendario", "Hoy", "Ocultar hechas", "+N más", "Inicio · {proyecto}", "Fin · {proyecto}", `aria-label` del "+": "Nueva tarea el {12 de octubre}".
- Contraste de texto ≥ 4.5:1 (tokens existentes; texto sobre colores de proyecto con `readableTextColor`).
- Cada tarea termina con `npm test`, `npm run build`, `npm run lint` en verde.
- Commits Conventional en español con trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/features/calendar/month.ts` | Crear | `monthGrid`, `addMonths`, `monthLabel`, `dayLabel`, `tasksByDay`, `projectMarkers`, `agendaDays` |
| `src/components/tasks/TaskDialogs.tsx` | Crear | Panel editable + "Nueva tarea" reutilizables |
| `src/components/tasks/TaskWorkspace.tsx` | Modificar | Usa `TaskDialogs` |
| `src/components/calendar/MonthView.tsx` (+ css) | Crear | Grilla del mes |
| `src/components/calendar/DayDialog.tsx` | Crear | Todas las tareas de un día |
| `src/components/calendar/AgendaView.tsx` (+ css) | Crear | Agenda para celular |
| `src/pages/CalendarPage.tsx` (+ css) | Crear | Página, filtros y navegación de meses |
| `src/features/navigation/navItems.ts`, `src/routes/AppRouter.tsx` | Modificar | Calendario encendido en `/calendar` |

---

### Task 1: Funciones del mes

**Files:**
- Create: `src/features/calendar/month.ts`
- Test: `tests/unit/month.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type CalendarDay = { date: string; day: number; inMonth: boolean; isToday: boolean };
  export type ProjectMarker = { project: Project; kind: 'start' | 'end' };
  export type AgendaDay = { date: string; tasks: Task[]; markers: ProjectMarker[] };
  export function monthGrid(year: number, month: number, today: string): CalendarDay[][]; // month 0–11
  export function addMonths(year: number, month: number, delta: number): { year: number; month: number };
  export function monthLabel(year: number, month: number): string;   // 'Octubre 2026'
  export function dayLabel(date: string): string;                     // '12 de octubre'
  export function tasksByDay(tasks: readonly Task[]): Map<string, Task[]>;
  export function projectMarkers(projects: readonly Project[]): Map<string, ProjectMarker[]>;
  export function agendaDays(grid: CalendarDay[][], byDay: Map<string, Task[]>, markers: Map<string, ProjectMarker[]>): AgendaDay[];
  ```

- [ ] **Step 1: Test que falla**

```ts
// tests/unit/month.test.ts
import { describe, expect, it } from 'vitest';
import { addMonths, agendaDays, dayLabel, monthGrid, monthLabel, projectMarkers, tasksByDay } from '@/features/calendar/month';
import type { Project } from '@/types/project';
import type { Task, TaskStatus } from '@/types/task';

const task = (number: number, dueDate: string | null, status: TaskStatus = 'todo'): Task => ({
  id: String(number), createdBy: 'x', updatedBy: 'x', rev: 1, title: `T${number}`, description: '', status, assigneeId: null,
  completedBy: null, completedAt: null, projectId: null, number, subtasks: [], priority: 'media', dueDate, createdAt: 1,
});
const project = (id: string, startDate: string, endDate: string): Project => ({
  id, name: id, description: '', color: '#4D7C8A', ownerId: 'a', startDate, endDate, archived: false, createdBy: 'a', createdAt: 1, rev: 1,
});

describe('monthGrid', () => {
  it('octubre 2026 empieza el lunes 28 de septiembre y tiene 5 semanas', () => {
    const grid = monthGrid(2026, 9, '2026-10-12');
    expect(grid).toHaveLength(5);
    expect(grid[0][0]).toEqual({ date: '2026-09-28', day: 28, inMonth: false, isToday: false });
    expect(grid[0][3]).toMatchObject({ date: '2026-10-01', inMonth: true });
    expect(grid.flat().find((d) => d.isToday)?.date).toBe('2026-10-12');
    expect(grid[4][6].date).toBe('2026-11-01');
  });
  it('un mes que empieza en domingo (febrero 2026) arranca el lunes anterior', () => {
    expect(monthGrid(2026, 1, '2026-01-01')[0][0].date).toBe('2026-01-26');
  });
  it('un mes que empieza en lunes (junio 2026) no tiene días del mes anterior', () => {
    expect(monthGrid(2026, 5, '2026-01-01')[0][0]).toMatchObject({ date: '2026-06-01', inMonth: true });
  });
  it('febrero bisiesto (2028) llega al 29', () => {
    const days = monthGrid(2028, 1, '2028-01-01').flat().filter((d) => d.inMonth);
    expect(days.at(-1)?.date).toBe('2028-02-29');
  });
});

describe('addMonths y etiquetas', () => {
  it('cruza el cambio de año', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
  it('nombres en español', () => {
    expect(monthLabel(2026, 9)).toBe('Octubre 2026');
    expect(dayLabel('2026-10-12')).toBe('12 de octubre');
  });
});

describe('tasksByDay', () => {
  it('agrupa por vencimiento, sin fecha afuera, no hechas primero y por número', () => {
    const byDay = tasksByDay([task(3, '2026-10-12', 'done'), task(5, '2026-10-12'), task(2, '2026-10-12'), task(9, null)]);
    expect(byDay.get('2026-10-12')?.map((t) => t.number)).toEqual([2, 5, 3]);
    expect([...byDay.keys()]).toEqual(['2026-10-12']);
  });
});

describe('projectMarkers y agendaDays', () => {
  it('marca inicio y fin de cada proyecto', () => {
    const markers = projectMarkers([project('Portal', '2026-10-01', '2026-10-15')]);
    expect(markers.get('2026-10-01')?.[0]).toMatchObject({ kind: 'start' });
    expect(markers.get('2026-10-15')?.[0]).toMatchObject({ kind: 'end' });
  });
  it('la agenda solo trae días del mes con contenido, en orden', () => {
    const grid = monthGrid(2026, 9, '2026-10-12');
    const byDay = tasksByDay([task(1, '2026-10-20'), task(2, '2026-09-30')]);
    const markers = projectMarkers([project('Portal', '2026-10-01', '2026-12-01')]);
    expect(agendaDays(grid, byDay, markers).map((d) => d.date)).toEqual(['2026-10-01', '2026-10-20']);
  });
});
```

- [ ] **Step 2: Correr y ver que falla** — `npx vitest run tests/unit/month.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/features/calendar/month.ts
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';
import { toDateInputValue } from '@/utils/formatDate';

export type CalendarDay = { date: string; day: number; inMonth: boolean; isToday: boolean };
export type ProjectMarker = { project: Project; kind: 'start' | 'end' };
export type AgendaDay = { date: string; tasks: Task[]; markers: ProjectMarker[] };

/** Semanas de lunes a domingo que cubren el mes (`month` va de 0 a 11). */
export function monthGrid(year: number, month: number, today: string): CalendarDay[][] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      // El constructor de Date corrige el desborde (p. ej. día 0 o 32) sin problemas de horario de verano.
      const date = new Date(year, month, 1 - offset + w * 7 + d);
      const iso = toDateInputValue(date);
      return { date: iso, day: date.getDate(), inMonth: date.getMonth() === month, isToday: iso === today };
    }),
  );
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

const monthName = new Intl.DateTimeFormat('es', { month: 'long' });
const longDay = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });

export function monthLabel(year: number, month: number): string {
  const name = monthName.format(new Date(year, month, 1));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** '12 de octubre' (para etiquetas accesibles y títulos). */
export function dayLabel(date: string): string {
  return longDay.format(parse(date));
}

/** Tareas agrupadas por vencimiento: primero las no hechas, después por número. */
export function tasksByDay(tasks: readonly Task[]): Map<string, Task[]> {
  const byDay = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    byDay.set(task.dueDate, [...(byDay.get(task.dueDate) ?? []), task]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.number - b.number);
  }
  return byDay;
}

export function projectMarkers(projects: readonly Project[]): Map<string, ProjectMarker[]> {
  const markers = new Map<string, ProjectMarker[]>();
  const add = (date: string, marker: ProjectMarker) => markers.set(date, [...(markers.get(date) ?? []), marker]);
  for (const project of projects) {
    add(project.startDate, { project, kind: 'start' });
    add(project.endDate, { project, kind: 'end' });
  }
  return markers;
}

/** Para el celular: solo los días del mes que tienen tareas o marcas. */
export function agendaDays(grid: CalendarDay[][], byDay: Map<string, Task[]>, markers: Map<string, ProjectMarker[]>): AgendaDay[] {
  return grid
    .flat()
    .filter((d) => d.inMonth && (byDay.has(d.date) || markers.has(d.date)))
    .map((d) => ({ date: d.date, tasks: byDay.get(d.date) ?? [], markers: markers.get(d.date) ?? [] }));
}
```

- [ ] **Step 4: Verificar y commit**

```bash
git add src/features/calendar tests/unit/month.test.ts
git commit -m "feat(v2): grilla del mes y tareas por día como funciones puras"
```

---

### Task 2: `TaskDialogs` reutilizable

**Files:**
- Create: `src/components/tasks/TaskDialogs.tsx`
- Modify: `src/components/tasks/TaskWorkspace.tsx`
- Test: `tests/components/TaskDialogs.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  type TaskDialogsProps = {
    profile: UserProfile;
    tasks: Task[];                         // lista viva: si la tarea abierta se borra, el panel se cierra
    members: UserProfile[];
    projects: Project[];
    openId: string | null;
    onCloseTask: () => void;
    creating: Partial<TaskInput> | null;   // valores iniciales de "Nueva tarea"; null = cerrada
    onCloseCreate: () => void;
    actions: Pick<ReturnType<typeof useTasks>, 'create' | 'update' | 'remove'>;
    onToast: (toast: ToastMessage) => void;
  };
  export function TaskDialogs(props: TaskDialogsProps): JSX.Element;
  ```

- [ ] **Step 1: Test que falla**

```tsx
// tests/components/TaskDialogs.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';

vi.mock('@/components/tasks/TaskHistory', () => ({ TaskHistory: () => null }));

import { TaskDialogs } from '@/components/tasks/TaskDialogs';

const me: UserProfile = { uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'member', active: true, invitedBy: null, rev: 1 };

describe('TaskDialogs', () => {
  it('crea con los valores iniciales (p. ej. el día del calendario)', async () => {
    const actions = { create: vi.fn().mockResolvedValue('n'), update: vi.fn(), remove: vi.fn() };
    const onCloseCreate = vi.fn();
    const onToast = vi.fn();
    render(
      <TaskDialogs
        profile={me} tasks={[]} members={[]} projects={[]} openId={null} onCloseTask={vi.fn()}
        creating={{ dueDate: '2026-10-20' }} onCloseCreate={onCloseCreate} actions={actions} onToast={onToast}
      />,
    );
    expect(screen.getByLabelText('Vence')).toHaveValue('2026-10-20');
    await userEvent.type(screen.getByLabelText('Título'), 'Llamar');
    await userEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));
    expect(actions.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Llamar', dueDate: '2026-10-20', assigneeId: 'ana' }));
    expect(onCloseCreate).toHaveBeenCalled();
    expect(onToast).toHaveBeenCalledWith({ kind: 'success', message: 'Tarea creada.' });
  });
});
```

- [ ] **Step 2: Correr y ver que falla** → FAIL.

- [ ] **Step 3: Implementar**

```tsx
// src/components/tasks/TaskDialogs.tsx
import { Modal } from '@/components/ui/Modal';
import type { ToastMessage } from '@/components/ui/Toast';
import { can } from '@/features/auth/permissions';
import { makeProjectOf } from '@/features/projects/projectOf';
import { assigneeOptions, makeNameOf } from '@/features/team/members';
import type { useTasks } from '@/hooks/useTasks';
import type { UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { Task, TaskInput } from '@/types/task';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TodoForm } from './TodoForm';

type TaskDialogsProps = {
  profile: UserProfile;
  /** Lista viva: si la tarea abierta se borra, el panel se cierra solo */
  tasks: Task[];
  members: UserProfile[];
  projects: Project[];
  openId: string | null;
  onCloseTask: () => void;
  /** Valores iniciales de "Nueva tarea" (p. ej. proyecto o vencimiento); null = ventana cerrada */
  creating: Partial<TaskInput> | null;
  onCloseCreate: () => void;
  actions: Pick<ReturnType<typeof useTasks>, 'create' | 'update' | 'remove'>;
  onToast: (toast: ToastMessage) => void;
};

/** Panel de una tarea y ventana "Nueva tarea", compartidos por Mis tareas, cada proyecto y el Calendario. */
export function TaskDialogs({
  profile, tasks, members, projects, openId, onCloseTask, creating, onCloseCreate, actions, onToast,
}: TaskDialogsProps) {
  const openTask = tasks.find((t) => t.id === openId) ?? null;
  const nameOf = makeNameOf(members);
  const projectOf = makeProjectOf(projects);

  async function handleCreate(values: TaskInput) {
    await actions.create(values); // si falla, TodoForm muestra el error
    onCloseCreate();
    onToast({ kind: 'success', message: 'Tarea creada.' });
  }

  return (
    <>
      {openTask && (
        <TaskDetailPanel
          key={openTask.id}
          task={openTask}
          nameOf={nameOf}
          projectOf={projectOf}
          assignees={assigneeOptions(members, openTask.assigneeId)}
          projects={projects.filter((p) => !p.archived || p.id === openTask.projectId)}
          canEdit={can(profile, 'task:edit')}
          canDelete={can(profile, 'task:delete', { createdBy: openTask.createdBy })}
          onClose={onCloseTask}
          onSave={async (patch) => {
            await actions.update(openTask.id, patch); // si falla, el panel muestra el error
            onToast({ kind: 'success', message: 'Cambios guardados.' });
          }}
          onDelete={(id) => {
            onCloseTask();
            actions.remove(id).then(
              () => onToast({ kind: 'success', message: 'Tarea eliminada.' }),
              (err: unknown) => {
                console.error('Error al eliminar la tarea:', err);
                onToast({ kind: 'error', message: 'No pudimos eliminar la tarea. Inténtalo de nuevo.' });
              },
            );
          }}
        />
      )}

      {creating && (
        <Modal title="Nueva tarea" onClose={onCloseCreate}>
          <TodoForm
            // Empieza asignada a quien la crea: si no, desaparecería de "Mías" al guardarla.
            initialValues={{ title: '', description: '', priority: 'media', dueDate: null, assigneeId: profile.uid, projectId: null, ...creating }}
            submitLabel="Crear tarea"
            assignees={assigneeOptions(members, profile.uid)}
            projects={projects.filter((p) => !p.archived)}
            onSubmit={handleCreate}
            onCancel={onCloseCreate}
          />
        </Modal>
      )}
    </>
  );
}
```

`TaskWorkspace.tsx`:
- `const [creating, setCreating] = useState<Partial<TaskInput> | null>(null);` (antes `boolean`); el botón "+ Nueva tarea" hace `setCreating(projectId ? { projectId } : {})`.
- Borrar `handleCreate`, el bloque `{openTask && <TaskDetailPanel…/>}` y el `{creating && <Modal…/>}`; en su lugar:

```tsx
      <TaskDialogs
        profile={profile} tasks={tasks} members={members} projects={projects}
        openId={openId} onCloseTask={() => setOpenId(null)}
        creating={creating} onCloseCreate={() => setCreating(null)}
        actions={{ create, update, remove }} onToast={setToast}
      />
```

- Quitar `openTask`, imports sin uso (`Modal`, `TodoForm`, `TaskDetailPanel`, `assigneeOptions` si ya no se usa) y dejar `safely` (lo sigue usando el cambio de estado de la lista).

- [ ] **Step 4: Verificar y commit**

Run: `npm test && npm run build && npm run lint` (los tests de `TaskWorkspace` deben seguir pasando).

```bash
git add src/components/tasks tests/components/TaskDialogs.test.tsx
git commit -m "refactor(v2): panel y nueva tarea reutilizables fuera de Mis tareas"
```

---

### Task 3: Vista Mes, ventana del día y agenda

**Files:**
- Create: `src/components/calendar/MonthView.tsx` (+ `.module.css`), `DayDialog.tsx`, `AgendaView.tsx` (+ `.module.css`), `CalendarItem.tsx`
- Test: `tests/components/MonthView.test.tsx`, `tests/components/AgendaView.test.tsx`

**Interfaces:**
- Consumes: `CalendarDay`, `ProjectMarker`, `AgendaDay`, `dayLabel` (T1); `isOverdue` (taskStats); `formatTaskNumber`; `readableTextColor`.
- Produces:
  ```ts
  type CalendarHandlers = { onOpenTask: (task: Task) => void; onCreate: ((date: string) => void) | null };
  export function MonthView(p: CalendarHandlers & { grid: CalendarDay[][]; byDay: Map<string, Task[]>; markers: Map<string, ProjectMarker[]>; projectOf: ProjectOf; today: string; onOpenDay: (date: string) => void }): JSX.Element;
  export function DayDialog(p: CalendarHandlers & { date: string; tasks: Task[]; markers: ProjectMarker[]; projectOf: ProjectOf; today: string; onClose: () => void }): JSX.Element;
  export function AgendaView(p: CalendarHandlers & { days: AgendaDay[]; projectOf: ProjectOf; nameOf: NameOf; today: string }): JSX.Element;
  export function TaskChip(p: { task: Task; projectOf: ProjectOf; today: string; onOpen: (task: Task) => void }): JSX.Element;      // CalendarItem.tsx
  export function MarkerChip(p: { marker: ProjectMarker }): JSX.Element;                                                            // CalendarItem.tsx
  ```

- [ ] **Step 1: Tests que fallan**

```tsx
// tests/components/MonthView.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MonthView } from '@/components/calendar/MonthView';
import { monthGrid, projectMarkers, tasksByDay } from '@/features/calendar/month';
import type { Project } from '@/types/project';
import type { Task, TaskStatus } from '@/types/task';

const TODAY = '2026-10-12';
const task = (number: number, dueDate: string, status: TaskStatus = 'todo'): Task => ({
  id: String(number), createdBy: 'x', updatedBy: 'x', rev: 1, title: `Tarea ${number}`, description: '', status, assigneeId: null,
  completedBy: null, completedAt: null, projectId: null, number, subtasks: [], priority: 'media', dueDate, createdAt: 1,
});
const portal: Project = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'a', startDate: '2026-10-01', endDate: '2026-10-30',
  archived: false, createdBy: 'a', createdAt: 1, rev: 1,
};

function setup(tasks: Task[], canCreate = true) {
  const handlers = { onOpenTask: vi.fn(), onCreate: canCreate ? vi.fn() : null, onOpenDay: vi.fn() };
  render(
    <MonthView
      grid={monthGrid(2026, 9, TODAY)} byDay={tasksByDay(tasks)} markers={projectMarkers([portal])}
      projectOf={() => null} today={TODAY} {...handlers}
    />,
  );
  return handlers;
}
const cell = (date: string) => screen.getByTestId(`day-${date}`);

describe('MonthView', () => {
  it('es una tabla con los días de la semana como encabezados', () => {
    setup([]);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
  });

  it('muestra las tareas en su día, vencidas y hechas, y abre el panel', async () => {
    const { onOpenTask } = setup([task(4, '2026-10-05'), task(5, '2026-10-08', 'done'), task(8, '2026-10-12')]);
    expect(within(cell('2026-10-05')).getByRole('button', { name: /MC-4 Tarea 4/ })).toHaveClass('overdue');
    expect(within(cell('2026-10-08')).getByRole('button', { name: /MC-5 Tarea 5/ })).toHaveClass('done');
    await userEvent.click(within(cell('2026-10-12')).getByRole('button', { name: /MC-8 Tarea 8/ }));
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ number: 8 }));
  });

  it('marca inicio y fin de proyecto', () => {
    setup([]);
    expect(within(cell('2026-10-01')).getByText('Inicio · Portal')).toBeInTheDocument();
    expect(within(cell('2026-10-30')).getByText('Fin · Portal')).toBeInTheDocument();
  });

  it('"+" crea en ese día; un lector no lo ve', async () => {
    const { onCreate } = setup([]);
    await userEvent.click(screen.getByRole('button', { name: 'Nueva tarea el 20 de octubre' }));
    expect(onCreate).toHaveBeenCalledWith('2026-10-20');
  });

  it('sin permiso de crear no hay "+"', () => {
    setup([], false);
    expect(screen.queryByRole('button', { name: /Nueva tarea el/ })).not.toBeInTheDocument();
  });

  it('con más de 3 tareas muestra "+N más" y abre el día', async () => {
    const { onOpenDay } = setup([1, 2, 3, 4, 5].map((n) => task(n, '2026-10-14')));
    const day = cell('2026-10-14');
    expect(within(day).getAllByRole('button', { name: /MC-/ })).toHaveLength(3);
    await userEvent.click(within(day).getByRole('button', { name: '+2 más' }));
    expect(onOpenDay).toHaveBeenCalledWith('2026-10-14');
  });

  it('resalta hoy', () => {
    setup([]);
    expect(cell(TODAY)).toHaveAttribute('aria-current', 'date');
  });
});
```

```tsx
// tests/components/AgendaView.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AgendaView } from '@/components/calendar/AgendaView';
import type { Task } from '@/types/task';

const task: Task = {
  id: '8', createdBy: 'x', updatedBy: 'x', rev: 1, title: 'Revisar login', description: '', status: 'doing', assigneeId: 'ana',
  completedBy: null, completedAt: null, projectId: null, number: 8, subtasks: [], priority: 'media', dueDate: '2026-10-12', createdAt: 1,
};

describe('AgendaView', () => {
  it('lista los días con contenido, con "Hoy" y "+" por día', async () => {
    const onCreate = vi.fn();
    const onOpenTask = vi.fn();
    render(
      <AgendaView
        days={[{ date: '2026-10-12', tasks: [task], markers: [] }]} projectOf={() => null}
        nameOf={(uid) => (uid === 'ana' ? 'Ana' : null)} today="2026-10-12" onCreate={onCreate} onOpenTask={onOpenTask}
      />,
    );
    expect(screen.getByRole('heading', { name: /Hoy · lunes, 12 de octubre/ })).toBeInTheDocument();
    expect(screen.getByText('Sin proyecto · En curso · Ana')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /MC-8 Revisar login/ }));
    expect(onOpenTask).toHaveBeenCalledWith(task);
    await userEvent.click(screen.getByRole('button', { name: 'Nueva tarea el 12 de octubre' }));
    expect(onCreate).toHaveBeenCalledWith('2026-10-12');
  });

  it('sin nada en el mes lo dice', () => {
    render(<AgendaView days={[]} projectOf={() => null} nameOf={() => null} today="2026-10-12" onCreate={null} onOpenTask={vi.fn()} />);
    expect(screen.getByText('No hay tareas ni fechas de proyectos este mes.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr y ver que fallan** → FAIL.

- [ ] **Step 3: Implementar**

```tsx
// src/components/calendar/CalendarItem.tsx
import type { ProjectMarker } from '@/features/calendar/month';
import type { ProjectOf } from '@/features/projects/projectOf';
import { formatTaskNumber } from '@/features/tasks/taskNumber';
import { isOverdue } from '@/features/tasks/taskStats';
import type { Task } from '@/types/task';
import styles from './CalendarItem.module.css';

type TaskChipProps = { task: Task; projectOf: ProjectOf; today: string; onOpen: (task: Task) => void };

/** Una tarea en el calendario: borde con el color de su proyecto, tachada si está hecha, roja si está vencida. */
export function TaskChip({ task, projectOf, today, onOpen }: TaskChipProps) {
  const project = projectOf(task.projectId);
  const state = task.status === 'done' ? styles.done : isOverdue(task, today) ? styles.overdue : '';
  return (
    <button
      type="button" className={`${styles.chip} ${state}`} style={{ borderLeftColor: project?.color ?? 'var(--color-border-strong)' }}
      onClick={() => onOpen(task)}
    >
      {formatTaskNumber(task.number)} {task.title}
    </button>
  );
}

/** Inicio o fin de un proyecto. */
export function MarkerChip({ marker }: { marker: ProjectMarker }) {
  return (
    <span className={styles.marker}>
      <i className={styles.diamond} style={{ backgroundColor: marker.project.color }} aria-hidden="true" />
      {marker.kind === 'start' ? 'Inicio' : 'Fin'} · {marker.project.name}
    </span>
  );
}
```

```css
/* src/components/calendar/CalendarItem.module.css */
.chip {
  display: block; width: 100%; padding: 1px var(--space-1); border: 0; border-left: 3px solid; border-radius: var(--radius-xs);
  background: var(--color-surface-subtle); color: var(--color-text-primary); font-size: var(--text-xs); text-align: left;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;
}
.chip:hover { text-decoration: underline; }
.done { text-decoration: line-through; color: var(--color-text-muted); }
.overdue { background: var(--color-status-danger-surface); }
.marker { display: flex; align-items: center; gap: var(--space-1); font-size: var(--text-xs); color: var(--color-text-primary); }
.diamond { width: 8px; height: 8px; transform: rotate(45deg); flex: none; }
```

> Las clases `done` y `overdue` se aplican tal cual en los tests porque `vite.config.ts` usa `classNameStrategy: 'non-scoped'`.

```tsx
// src/components/calendar/MonthView.tsx
import type { CalendarDay, ProjectMarker } from '@/features/calendar/month';
import { dayLabel } from '@/features/calendar/month';
import type { ProjectOf } from '@/features/projects/projectOf';
import type { Task } from '@/types/task';
import { MarkerChip, TaskChip } from './CalendarItem';
import styles from './MonthView.module.css';

const WEEKDAYS = [
  ['Lun', 'lunes'], ['Mar', 'martes'], ['Mié', 'miércoles'], ['Jue', 'jueves'], ['Vie', 'viernes'], ['Sáb', 'sábado'], ['Dom', 'domingo'],
];
const VISIBLE = 3;

type Props = {
  grid: CalendarDay[][];
  byDay: Map<string, Task[]>;
  markers: Map<string, ProjectMarker[]>;
  projectOf: ProjectOf;
  today: string;
  onOpenTask: (task: Task) => void;
  /** null = no puede crear (lector) */
  onCreate: ((date: string) => void) | null;
  onOpenDay: (date: string) => void;
};

/** Grilla del mes como tabla: los días de la semana son encabezados de columna. */
export function MonthView({ grid, byDay, markers, projectOf, today, onOpenTask, onCreate, onOpenDay }: Props) {
  return (
    <table className={styles.grid}>
      <caption className="visually-hidden">Tareas del mes por día de vencimiento</caption>
      <thead>
        <tr>{WEEKDAYS.map(([short, long]) => <th key={short} scope="col" abbr={long}>{short}</th>)}</tr>
      </thead>
      <tbody>
        {grid.map((week) => (
          <tr key={week[0].date}>
            {week.map((day) => {
              const tasks = byDay.get(day.date) ?? [];
              const extra = tasks.length - VISIBLE;
              return (
                <td
                  key={day.date} data-testid={`day-${day.date}`} aria-current={day.isToday ? 'date' : undefined}
                  className={`${styles.day} ${day.inMonth ? '' : styles.out} ${day.isToday ? styles.today : ''}`}
                >
                  <div className={styles.head}>
                    <span className={styles.number}>{day.day}</span>
                    {onCreate && (
                      <button type="button" className={styles.add} aria-label={`Nueva tarea el ${dayLabel(day.date)}`} onClick={() => onCreate(day.date)}>
                        +
                      </button>
                    )}
                  </div>
                  {(markers.get(day.date) ?? []).map((m) => <MarkerChip key={`${m.project.id}-${m.kind}`} marker={m} />)}
                  {tasks.slice(0, VISIBLE).map((t) => <TaskChip key={t.id} task={t} projectOf={projectOf} today={today} onOpen={onOpenTask} />)}
                  {extra > 0 && (
                    <button type="button" className={styles.more} onClick={() => onOpenDay(day.date)}>+{extra} más</button>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

```css
/* src/components/calendar/MonthView.module.css */
.grid { display: none; width: 100%; table-layout: fixed; border-collapse: collapse; background: var(--color-surface-default); border: 1px solid var(--color-border-default); }
.grid th { padding: var(--space-1); background: var(--color-surface-subtle); font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-secondary); }
.day { height: 104px; padding: var(--space-1); border: 1px solid var(--color-border-subtle); vertical-align: top; }
.day > * + * { margin-top: 2px; }
.out { background: var(--color-surface-subtle); }
.out .number { color: var(--color-text-muted); }
.today { box-shadow: inset 0 0 0 2px var(--color-action-primary); }
.today .number { padding: 0 var(--space-1); border-radius: var(--radius-pill); background: var(--color-action-primary); color: var(--color-text-inverse); }
.head { display: flex; justify-content: space-between; align-items: center; }
.number { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-primary); }
.add {
  width: 22px; height: 22px; padding: 0; border: 0; border-radius: var(--radius-sm); background: none;
  font-weight: var(--weight-semibold); color: var(--color-action-primary); cursor: pointer;
}
.add:hover { background: var(--color-surface-subtle); }
.more { padding: 0; border: 0; background: none; font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--color-text-link); cursor: pointer; }

@media (min-width: 768px) {
  .grid { display: table; }
}
```

```tsx
// src/components/calendar/DayDialog.tsx
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { ProjectMarker } from '@/features/calendar/month';
import { dayLabel } from '@/features/calendar/month';
import type { ProjectOf } from '@/features/projects/projectOf';
import type { Task } from '@/types/task';
import { MarkerChip, TaskChip } from './CalendarItem';

type Props = {
  date: string;
  tasks: Task[];
  markers: ProjectMarker[];
  projectOf: ProjectOf;
  today: string;
  onOpenTask: (task: Task) => void;
  onCreate: ((date: string) => void) | null;
  onClose: () => void;
};

/** Todo lo de un día (cuando no entra en la celda). */
export function DayDialog({ date, tasks, markers, projectOf, today, onOpenTask, onCreate, onClose }: Props) {
  return (
    <Modal title={dayLabel(date)} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {markers.map((m) => <MarkerChip key={`${m.project.id}-${m.kind}`} marker={m} />)}
        {tasks.map((t) => <TaskChip key={t.id} task={t} projectOf={projectOf} today={today} onOpen={onOpenTask} />)}
        {onCreate && <Button size="sm" onClick={() => onCreate(date)}>+ Nueva tarea este día</Button>}
      </div>
    </Modal>
  );
}
```

```tsx
// src/components/calendar/AgendaView.tsx
import type { AgendaDay } from '@/features/calendar/month';
import { dayLabel } from '@/features/calendar/month';
import type { ProjectOf } from '@/features/projects/projectOf';
import { formatTaskNumber } from '@/features/tasks/taskNumber';
import { isOverdue } from '@/features/tasks/taskStats';
import type { NameOf } from '@/features/team/members';
import { STATUS_LABEL, type Task } from '@/types/task';
import { MarkerChip } from './CalendarItem';
import styles from './AgendaView.module.css';

const weekdayDay = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });

function heading(date: string, today: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const label = weekdayDay.format(new Date(y, m - 1, d));
  return date === today ? `Hoy · ${label}` : label;
}

type Props = {
  days: AgendaDay[];
  projectOf: ProjectOf;
  nameOf: NameOf;
  today: string;
  onOpenTask: (task: Task) => void;
  onCreate: ((date: string) => void) | null;
};

/** Agenda del celular: un bloque por día con tareas o fechas de proyecto. */
export function AgendaView({ days, projectOf, nameOf, today, onOpenTask, onCreate }: Props) {
  return (
    <div className={styles.agenda}>
      {days.length === 0 && <p className={styles.empty}>No hay tareas ni fechas de proyectos este mes.</p>}
      {days.map((day) => (
        <section key={day.date} aria-labelledby={`agenda-${day.date}`} className={styles.day}>
          <div className={styles.head}>
            <h3 id={`agenda-${day.date}`} className={styles.title}>{heading(day.date, today)}</h3>
            {onCreate && (
              <button type="button" className={styles.add} aria-label={`Nueva tarea el ${dayLabel(day.date)}`} onClick={() => onCreate(day.date)}>+</button>
            )}
          </div>
          {day.markers.map((m) => <MarkerChip key={`${m.project.id}-${m.kind}`} marker={m} />)}
          {day.tasks.map((task) => {
            const project = projectOf(task.projectId);
            const state = task.status === 'done' ? styles.done : isOverdue(task, today) ? styles.overdue : '';
            return (
              <button
                key={task.id} type="button" className={`${styles.item} ${state}`}
                style={{ borderLeftColor: project?.color ?? 'var(--color-border-strong)' }} onClick={() => onOpenTask(task)}
              >
                <span className={styles.itemTitle}>{formatTaskNumber(task.number)} {task.title}</span>
                <span className={styles.itemMeta}>
                  {project?.name ?? 'Sin proyecto'} · {STATUS_LABEL[task.status]} · {nameOf(task.assigneeId) ?? 'Sin asignar'}
                </span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
```

```css
/* src/components/calendar/AgendaView.module.css */
.agenda { display: flex; flex-direction: column; gap: var(--space-4); }
.empty { color: var(--color-text-secondary); }
.day { display: flex; flex-direction: column; gap: var(--space-2); }
.head { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: var(--text-lg); font-weight: var(--weight-semibold); color: var(--color-text-heading); }
.title::first-letter { text-transform: uppercase; }
.add { width: 32px; height: 32px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); background: var(--color-surface-default); color: var(--color-action-primary); font-weight: var(--weight-semibold); }
.item {
  display: flex; flex-direction: column; gap: 2px; padding: var(--space-2) var(--space-3); text-align: left;
  background: var(--color-surface-default); border: 1px solid var(--color-border-default); border-left: 4px solid; border-radius: var(--radius-md); cursor: pointer;
}
.itemTitle { font-weight: var(--weight-medium); color: var(--color-text-primary); }
.itemMeta { font-size: var(--text-sm); color: var(--color-text-secondary); }
.done .itemTitle { text-decoration: line-through; color: var(--color-text-muted); }
.overdue { background: var(--color-status-danger-surface); }

@media (min-width: 768px) {
  .agenda { display: none; }
}
```

- [ ] **Step 4: Verificar y commit**

```bash
git add src/components/calendar tests/components/MonthView.test.tsx tests/components/AgendaView.test.tsx
git commit -m "feat(v2): vista mes, ventana del día y agenda del calendario"
```

---

### Task 4: Página Calendario

**Files:**
- Create: `src/pages/CalendarPage.tsx` (+ `.module.css`)
- Modify: `src/features/navigation/navItems.ts`, `src/routes/AppRouter.tsx`
- Test: `tests/components/CalendarPage.test.tsx`, `tests/unit/navItems.test.ts`, `tests/components/AppShell.test.tsx`, `tests/components/routes.test.tsx`

**Interfaces:**
- Consumes: T1–T3, `TaskDialogs` (T2), `useTasks`, `useTeamMembers`, `useProjects`, `usePreference`, `scopeTasks`, `filterByProject`, `SegmentedControl`.
- Produces: `CalendarPage(): JSX.Element` en `/calendar`.

- [ ] **Step 1: Tests que fallan**

```tsx
// tests/components/CalendarPage.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';
import type { Task, TaskStatus } from '@/types/task';

const state = vi.hoisted(() => ({ tasks: [] as Task[] }));
const me: UserProfile = { uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'member', active: true, invitedBy: null, rev: 1 };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: me }) }));
vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: state.tasks, loading: false, error: null, retry: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setStatus: vi.fn() }),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loading: false, error: null }) }));
vi.mock('@/components/tasks/TaskHistory', () => ({ TaskHistory: () => null }));

import { CalendarPage } from '@/pages/CalendarPage';

const task = (number: number, dueDate: string, status: TaskStatus = 'todo'): Task => ({
  id: String(number), createdBy: 'ana', updatedBy: 'ana', rev: 1, title: `Tarea ${number}`, description: '', status, assigneeId: 'ana',
  completedBy: null, completedAt: null, projectId: null, number, subtasks: [], priority: 'media', dueDate, createdAt: 1,
});
const renderPage = () => render(<MemoryRouter><CalendarPage /></MemoryRouter>);

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 12, 10));
    localStorage.clear();
    state.tasks = [task(1, '2026-10-20'), task(2, '2026-10-21', 'done'), task(3, '2026-11-03')];
  });
  afterEach(() => vi.useRealTimers());

  it('muestra el mes actual con sus tareas', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Octubre 2026' })).toBeInTheDocument();
    expect(within(screen.getByTestId('day-2026-10-20')).getByRole('button', { name: /MC-1/ })).toBeInTheDocument();
  });

  it('cambia de mes y vuelve a hoy', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Noviembre 2026' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Octubre 2026' })).toBeInTheDocument();
  });

  it('oculta las hechas', async () => {
    renderPage();
    expect(within(screen.getByTestId('day-2026-10-21')).getByRole('button', { name: /MC-2/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Ocultar hechas' }));
    expect(within(screen.getByTestId('day-2026-10-21')).queryByRole('button', { name: /MC-2/ })).not.toBeInTheDocument();
  });

  it('"+" abre Nueva tarea con el día puesto', async () => {
    renderPage();
    await userEvent.click(within(screen.getByTestId('day-2026-10-15')).getByRole('button', { name: 'Nueva tarea el 15 de octubre' }));
    expect(screen.getByLabelText('Vence')).toHaveValue('2026-10-15');
  });
});
```

Ajustes: `navItems.test.ts` → Calendario `'/calendar'` para todos y "Próximamente" solo `settings`; `AppShell.test.tsx` → "Próximamente" de 2 a 1 y el test de la pestaña pendiente usa **Ajustes** (`/Ajustes/`, `'Ajustes: próximamente.'`); `routes.test.tsx` → mock `@/pages/CalendarPage` con `<h1>Calendario</h1>`.

- [ ] **Step 2: Correr y ver que fallan** → FAIL.

- [ ] **Step 3: Implementar**

```tsx
// src/pages/CalendarPage.tsx
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
```

> `useState` con un objeto `current` recreado en cada render: el botón "Hoy" usa el valor de ese render (correcto, `today` no cambia). Si el lint marca las funciones flecha de `onCreate`/`openTask` por formato, separarlas en varias líneas.

```css
/* src/pages/CalendarPage.module.css */
.page { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-5) var(--space-4) var(--space-12); }
.toolbar { display: flex; flex-direction: column; gap: var(--space-3); }
.month { display: flex; align-items: center; gap: var(--space-2); }
.monthTitle { min-width: 9.5em; text-align: center; font-size: var(--text-3xl); font-weight: var(--weight-semibold); color: var(--color-text-heading); }
.filters { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.select { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-md); color: var(--color-text-secondary); }
.select select { min-height: 36px; padding: 0 var(--space-2); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); background: var(--color-surface-default); }
.check { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-md); color: var(--color-text-primary); }

@media (min-width: 768px) {
  .page { padding: var(--space-6) var(--space-8); }
  .toolbar { flex-direction: row; justify-content: space-between; align-items: center; flex-wrap: wrap; }
}
```

`navItems.ts`: Calendario `to: '/calendar'`. `AppRouter.tsx`: `<Route path="/calendar" element={<CalendarPage />} />` dentro del marco.

- [ ] **Step 4: Verificar y commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add -A src tests
git commit -m "feat(v2): calendario con vista mes, filtros y agenda"
```

---

### Task 5: Preview 6A

- [ ] Preview (`vercel --yes` + alias), producción 200, push.
- [ ] Prueba de la usuaria: mes actual con tareas y marcas de proyecto; ‹ › y "Hoy"; filtros (Mías / Equipo / Sin asignar, Proyecto, Ocultar hechas recordado); vencidas en rojo y hechas tachadas; "+" crea con la fecha; "+N más"; clic abre el panel editable; celular en agenda; lector sin "+".

---

## Autorrevisión del plan

- **Cobertura del spec (6A):** datos solo existentes (sin cambios en Firestore); crear con "+" (T3, T4); hechas tachadas y "Ocultar hechas" (T3, T4); vencidas (T3); "+N más" (T3); filtros (T4); celular en agenda (T3); `TaskDialogs` (T2); menú (T4); funciones del mes con casos borde (T1). El Gantt y las pestañas Mes/Gantt van en el plan 6B (la pestaña se agrega cuando haya Gantt, para no mostrar una vista vacía).
- **Ajustes respecto al spec:** el título del mes es un `h2` con `aria-live="polite"` para que el lector de pantalla anuncie el cambio; los marcadores solo muestran proyectos activos.
- **Consistencia de nombres:** `CalendarDay`, `ProjectMarker`, `AgendaDay`, `monthGrid`, `addMonths`, `monthLabel`, `dayLabel`, `tasksByDay`, `projectMarkers`, `agendaDays`, `TaskDialogs` (`creating: Partial<TaskInput> | null`, `actions`, `onToast`), `TaskChip`, `MarkerChip`, `MonthView`, `DayDialog`, `AgendaView`, `CalendarPage`.
