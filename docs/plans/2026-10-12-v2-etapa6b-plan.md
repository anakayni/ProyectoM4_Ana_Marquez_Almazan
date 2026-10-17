# v2 Etapa 6B — Calendario, vista Gantt: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pestaña Gantt en el Calendario: una fila por proyecto con su barra de inicio a fin (color y progreso real), las tareas como ◆ en su vencimiento y la línea "Hoy", en ventanas de 5 semanas.

**Architecture:** Funciones puras en `src/features/calendar/gantt.ts` calculan semanas y posiciones en %. `GanttView` dibuja filas con CSS grid (columna de nombres fija, desplazamiento lateral en celular). `CalendarPage` suma las pestañas Mes/Gantt (recordadas) y la navegación por semanas.

**Tech Stack:** React 19, React Router 8, Vitest + RTL.

**Spec:** `docs/specs/2026-10-12-v2-etapa6-calendario-design.md` (parte 6B)

## Global Constraints

- Sin cambios en Firestore.
- Ventana de 5 semanas (lunes a domingo); "Hoy" deja la semana actual en el medio (2 semanas antes).
- ‹ › mueven 5 semanas; título "28 sep → 1 nov 2026".
- Proyectos activos por defecto; casilla "Incluir archivados". Solo filas de proyectos que se cruzan con la ventana.
- Barra: enlace a `/projects/:id`, color del proyecto, texto con `readableTextColor`, `aria-label` "{nombre}, {1 de octubre} a {30 de noviembre}, {40}% hecho[, atrasado]".
- ◆: botón por tarea con vencimiento dentro de la ventana; `aria-label` "MC-{n} {título}, vence {12 de octubre}, {estado}"; clase `done` / `overdue`.
- Los filtros de la página (alcance, proyecto, ocultar hechas) también aplican al Gantt.
- Contraste de texto ≥ 4.5:1.
- Cada tarea termina con `npm test`, `npm run build`, `npm run lint` en verde.
- Commits Conventional en español con trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Funciones del Gantt

**Files:**
- Create: `src/features/calendar/gantt.ts`
- Test: `tests/unit/gantt.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type GanttRange = { start: string; end: string; days: number; weeks: { start: string; week: number }[] };
  export function addDays(date: string, n: number): string;
  export function startOfWeek(date: string): string;          // lunes
  export function isoWeek(date: string): number;
  export function ganttRange(from: string, weeks?: number): GanttRange;   // desde el lunes de `from`
  export function rangeAround(today: string, weeks?: number): GanttRange; // la semana de hoy en el medio
  export function pointPosition(date: string, range: GanttRange): number | null;               // % del centro del día
  export function barPosition(startDate: string, endDate: string, range: GanttRange): { left: number; width: number } | null;
  export function rangeLabel(range: GanttRange): string;      // '28 sep → 1 nov 2026'
  ```

- [ ] **Step 1: Test que falla**

```ts
// tests/unit/gantt.test.ts
import { describe, expect, it } from 'vitest';
import {
  addDays, barPosition, ganttRange, isoWeek, pointPosition, rangeAround, rangeLabel, startOfWeek,
} from '@/features/calendar/gantt';

describe('fechas', () => {
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('startOfWeek da el lunes', () => {
    expect(startOfWeek('2026-10-15')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12');
  });
  it.each([
    ['2026-09-28', 40], ['2026-10-12', 42], ['2026-01-01', 1], ['2026-12-31', 53], ['2027-01-01', 53], ['2025-12-29', 1],
  ])('isoWeek(%s) = %i', (date, week) => {
    expect(isoWeek(date)).toBe(week);
  });
});

describe('ganttRange', () => {
  it('5 semanas desde el lunes', () => {
    const range = ganttRange('2026-09-30');
    expect(range).toMatchObject({ start: '2026-09-28', end: '2026-11-01', days: 35 });
    expect(range.weeks.map((w) => w.week)).toEqual([40, 41, 42, 43, 44]);
  });
  it('rangeAround deja la semana de hoy en el medio', () => {
    expect(rangeAround('2026-10-14').start).toBe('2026-09-28');
  });
  it('título', () => {
    expect(rangeLabel(ganttRange('2026-09-28'))).toBe('28 sept → 1 nov 2026');
  });
});

describe('posiciones', () => {
  const range = ganttRange('2026-09-28'); // 35 días

  it('un punto va en el centro de su día; fuera del rango es null', () => {
    expect(pointPosition('2026-09-28', range)).toBeCloseTo((0.5 / 35) * 100);
    expect(pointPosition('2026-11-01', range)).toBeCloseTo((34.5 / 35) * 100);
    expect(pointPosition('2026-11-02', range)).toBeNull();
    expect(pointPosition('2026-09-27', range)).toBeNull();
  });

  it('una barra dentro del rango ocupa sus días completos', () => {
    const bar = barPosition('2026-10-05', '2026-10-11', range)!;
    expect(bar.left).toBeCloseTo((7 / 35) * 100);
    expect(bar.width).toBeCloseTo((7 / 35) * 100);
  });

  it('se recorta si empieza antes o termina después', () => {
    expect(barPosition('2026-09-01', '2026-12-31', range)).toEqual({ left: 0, width: 100 });
  });

  it('fuera del rango es null', () => {
    expect(barPosition('2026-08-01', '2026-09-27', range)).toBeNull();
    expect(barPosition('2026-11-02', '2026-12-01', range)).toBeNull();
  });
});
```

> `rangeLabel` usa `Intl` en español: septiembre abreviado es "sept" en los navegadores actuales. Si el entorno de tests devuelve "sep", ajustar la expectativa a lo que devuelve `new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(new Date(2026, 8, 28))`.

- [ ] **Step 2: Correr y ver que falla** → FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/features/calendar/gantt.ts
import { toDateInputValue } from '@/utils/formatDate';

export type GanttRange = { start: string; end: string; days: number; weeks: { start: string; week: number }[] };

const DAY_MS = 24 * 60 * 60 * 1000;

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Días calendario entre dos fechas (sin problemas de horario de verano: se redondea). */
function diffDays(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS);
}

export function addDays(date: string, n: number): string {
  const d = parse(date);
  return toDateInputValue(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

export function startOfWeek(date: string): string {
  return addDays(date, -((parse(date).getDay() + 6) % 7));
}

/** Semana ISO 8601: la semana 1 es la que contiene el primer jueves del año. */
export function isoWeek(date: string): number {
  const thursday = addDays(startOfWeek(date), 3);
  const jan1 = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(diffDays(jan1, thursday) / 7) + 1;
}

export function ganttRange(from: string, weeks = 5): GanttRange {
  const start = startOfWeek(from);
  const days = weeks * 7;
  return {
    start,
    end: addDays(start, days - 1),
    days,
    weeks: Array.from({ length: weeks }, (_, i) => {
      const weekStart = addDays(start, i * 7);
      return { start: weekStart, week: isoWeek(weekStart) };
    }),
  };
}

/** Ventana con la semana de hoy en el medio. */
export function rangeAround(today: string, weeks = 5): GanttRange {
  return ganttRange(addDays(startOfWeek(today), -Math.floor(weeks / 2) * 7), weeks);
}

export function pointPosition(date: string, range: GanttRange): number | null {
  const index = diffDays(range.start, date);
  if (index < 0 || index >= range.days) return null;
  return ((index + 0.5) / range.days) * 100;
}

export function barPosition(startDate: string, endDate: string, range: GanttRange): { left: number; width: number } | null {
  const from = Math.max(0, diffDays(range.start, startDate));
  const to = Math.min(range.days, diffDays(range.start, endDate) + 1);
  if (to <= 0 || from >= range.days || to <= from) return null;
  return { left: (from / range.days) * 100, width: ((to - from) / range.days) * 100 };
}

const short = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

export function rangeLabel(range: GanttRange): string {
  return `${short.format(parse(range.start))} → ${short.format(parse(range.end))} ${range.end.slice(0, 4)}`;
}
```

- [ ] **Step 4: Verificar y commit**

```bash
git add src/features/calendar/gantt.ts tests/unit/gantt.test.ts
git commit -m "feat(v2): semanas y posiciones del gantt como funciones puras"
```

---

### Task 2: Vista Gantt

**Files:**
- Create: `src/components/calendar/GanttView.tsx` (+ `.module.css`)
- Test: `tests/components/GanttView.test.tsx`

**Interfaces:**
- Consumes: `GanttRange`, `barPosition`, `pointPosition` (T1); `projectProgress`; `dayLabel` (6A); `isOverdue`; `formatTaskNumber`; `readableTextColor`; `NameOf`.
- Produces:
  ```ts
  export function GanttView(p: {
    projects: Project[]; tasks: Task[]; range: GanttRange; today: string; nameOf: NameOf; onOpenTask: (task: Task) => void;
  }): JSX.Element;
  ```

- [ ] **Step 1: Test que falla**

```tsx
// tests/components/GanttView.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { GanttView } from '@/components/calendar/GanttView';
import { ganttRange } from '@/features/calendar/gantt';
import type { Project } from '@/types/project';
import type { Task, TaskStatus } from '@/types/task';

const TODAY = '2026-10-12';
const project = (id: string, name: string, startDate: string, endDate: string): Project => ({
  id, name, description: '', color: '#4D7C8A', ownerId: 'ana', startDate, endDate, archived: false, createdBy: 'a', createdAt: 1, rev: 1,
});
const task = (number: number, projectId: string, dueDate: string, status: TaskStatus = 'todo'): Task => ({
  id: String(number), createdBy: 'x', updatedBy: 'x', rev: 1, title: `Tarea ${number}`, description: '', status, assigneeId: null,
  completedBy: null, completedAt: null, projectId, number, subtasks: [], priority: 'media', dueDate, createdAt: 1,
});

function setup(onOpenTask = vi.fn()) {
  render(
    <MemoryRouter>
      <GanttView
        projects={[project('p1', 'Portal', '2026-10-01', '2026-11-30'), project('p2', 'Viejo', '2026-01-01', '2026-02-01')]}
        tasks={[task(1, 'p1', '2026-10-05', 'done'), task(2, 'p1', '2026-10-08'), task(3, 'p1', '2026-10-20'), task(4, 'p1', '2026-12-20')]}
        range={ganttRange('2026-09-28')} today={TODAY} nameOf={(uid) => (uid === 'ana' ? 'Ana' : null)} onOpenTask={onOpenTask}
      />
    </MemoryRouter>,
  );
  return onOpenTask;
}

describe('GanttView', () => {
  it('muestra las semanas', () => {
    setup();
    expect(screen.getByText('Sem 40')).toBeInTheDocument();
    expect(screen.getByText('Sem 44')).toBeInTheDocument();
  });

  it('una fila por proyecto que se cruza con la ventana, con su barra como enlace', () => {
    setup();
    expect(screen.getByText('Portal')).toBeInTheDocument();
    expect(screen.queryByText('Viejo')).not.toBeInTheDocument();
    const bar = screen.getByRole('link', { name: /Portal, 1 de octubre a 30 de noviembre, 25% hecho/ });
    expect(bar).toHaveAttribute('href', '/projects/p1');
    expect(screen.getByText('A cargo: Ana')).toBeInTheDocument();
  });

  it('las tareas dentro de la ventana son ◆ con su estado, y abren el panel', async () => {
    const onOpenTask = setup();
    expect(screen.getByRole('button', { name: /MC-1 Tarea 1, vence 5 de octubre, Hecha/ })).toHaveClass('done');
    expect(screen.getByRole('button', { name: /MC-2 Tarea 2, vence 8 de octubre, Pendiente/ })).toHaveClass('overdue');
    expect(screen.queryByRole('button', { name: /MC-4/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /MC-3/ }));
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ number: 3 }));
  });

  it('marca hoy', () => {
    setup();
    expect(screen.getByText('Hoy · 12 de octubre')).toBeInTheDocument();
  });

  it('sin proyectos en la ventana lo dice', () => {
    render(
      <MemoryRouter>
        <GanttView projects={[]} tasks={[]} range={ganttRange('2026-09-28')} today={TODAY} nameOf={() => null} onOpenTask={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('No hay proyectos en estas semanas.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr y ver que falla** → FAIL.

- [ ] **Step 3: Implementar**

```tsx
// src/components/calendar/GanttView.tsx
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { type GanttRange, barPosition, pointPosition } from '@/features/calendar/gantt';
import { dayLabel } from '@/features/calendar/month';
import { projectProgress } from '@/features/projects/projectProgress';
import { formatTaskNumber } from '@/features/tasks/taskNumber';
import { isOverdue } from '@/features/tasks/taskStats';
import type { NameOf } from '@/features/team/members';
import type { Project } from '@/types/project';
import { STATUS_LABEL, type Task } from '@/types/task';
import { readableTextColor } from '@/utils/color';
import styles from './GanttView.module.css';

type Props = {
  projects: Project[];
  tasks: Task[];
  range: GanttRange;
  today: string;
  nameOf: NameOf;
  onOpenTask: (task: Task) => void;
};

/** Una fila por proyecto: barra de inicio a fin con su progreso real y las tareas como ◆ en su vencimiento. */
export function GanttView({ projects, tasks, range, today, nameOf, onOpenTask }: Props) {
  const rows = projects
    .map((project) => ({ project, bar: barPosition(project.startDate, project.endDate, range) }))
    .filter((row) => row.bar !== null);
  const todayAt = pointPosition(today, range);
  const thisWeek = range.weeks.findIndex((w) => w.start <= today && today < (range.weeks[range.weeks.indexOf(w) + 1]?.start ?? '9999'));

  return (
    <div className={styles.scroll}>
      <div className={styles.gantt}>
        <div className={`${styles.row} ${styles.header}`}>
          <div className={styles.label}><span className={styles.caption}>Proyecto</span></div>
          <div className={styles.weeks}>
            {range.weeks.map((w, i) => (
              <div key={w.start} className={i === thisWeek ? styles.now : undefined}>
                <b>Sem {w.week}</b>
                <span>{dayLabel(w.start)}</span>
              </div>
            ))}
          </div>
        </div>

        {rows.length === 0 && <p className={styles.empty}>No hay proyectos en estas semanas.</p>}

        {rows.map(({ project, bar }) => {
          const own = tasks.filter((t) => t.projectId === project.id);
          const progress = projectProgress(own, project.endDate, today);
          const owner = nameOf(project.ownerId);
          const points = own.filter((t) => t.dueDate && pointPosition(t.dueDate, range) !== null);
          const barStyle: CSSProperties = {
            left: `${bar!.left}%`, width: `${bar!.width}%`, backgroundColor: project.color, color: readableTextColor(project.color),
          };
          return (
            <div key={project.id} className={styles.row}>
              <div className={styles.label}>
                <span className={styles.name}>{project.name}</span>
                <span className={styles.meta}>
                  {owner && `A cargo: ${owner}`}
                  {progress.late && <span className={styles.late}> · Atrasado</span>}
                </span>
              </div>
              <div className={styles.track}>
                <Link
                  to={`/projects/${project.id}`} className={styles.bar} style={barStyle}
                  aria-label={`${project.name}, ${dayLabel(project.startDate)} a ${dayLabel(project.endDate)}, ${progress.percent}% hecho${progress.late ? ', atrasado' : ''}`}
                >
                  <span className={styles.barText}>{project.name}</span>
                  <span className={styles.percent}>{progress.percent}%</span>
                </Link>
                {points.map((t) => {
                  const state = t.status === 'done' ? styles.done : isOverdue(t, today) ? styles.overdue : '';
                  return (
                    <button
                      key={t.id} type="button" className={`${styles.point} ${state}`}
                      style={{ left: `${pointPosition(t.dueDate!, range)}%` }}
                      aria-label={`${formatTaskNumber(t.number)} ${t.title}, vence ${dayLabel(t.dueDate!)}, ${STATUS_LABEL[t.status]}`}
                      title={`${formatTaskNumber(t.number)} ${t.title}`}
                      onClick={() => onOpenTask(t)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {todayAt !== null && (
          <div className={styles.todayLine} style={{ left: `calc(var(--gantt-label) + (100% - var(--gantt-label)) * ${todayAt / 100})` }}>
            <span className={styles.todayText}>Hoy · {dayLabel(today)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

> Simplificar `thisWeek` a `range.weeks.findIndex((w) => w.start <= today && today <= addDays(w.start, 6))` importando `addDays` de `gantt.ts` (más legible). Usar esa versión.

```css
/* src/components/calendar/GanttView.module.css */
.scroll { overflow-x: auto; border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); background: var(--color-surface-default); }
.gantt { --gantt-label: 180px; position: relative; min-width: 720px; }
.row { display: grid; grid-template-columns: var(--gantt-label) 1fr; min-height: 52px; border-top: 1px solid var(--color-border-subtle); }
.header { min-height: 40px; border-top: 0; background: var(--color-surface-subtle); }
.label {
  position: sticky; left: 0; z-index: 2; display: flex; flex-direction: column; justify-content: center; gap: 2px;
  padding: var(--space-2) var(--space-3); background: inherit; background-color: var(--color-surface-default); border-right: 1px solid var(--color-border-subtle);
}
.header .label { background-color: var(--color-surface-subtle); }
.caption { font-size: var(--text-xs); font-weight: var(--weight-semibold); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
.name { font-weight: var(--weight-semibold); color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { font-size: var(--text-sm); color: var(--color-text-secondary); }
.late { font-weight: var(--weight-semibold); color: var(--color-status-danger); }
.weeks { display: grid; grid-template-columns: repeat(5, 1fr); }
.weeks > div { display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: var(--text-xs); color: var(--color-text-secondary); border-left: 1px solid var(--color-border-subtle); }
.weeks b { font-size: var(--text-sm); color: var(--color-text-primary); }
.now { background: var(--color-status-info-surface); }
.track { position: relative; }
.bar {
  position: absolute; top: 10px; height: 26px; display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
  padding: 0 var(--space-2); border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--weight-semibold);
  text-decoration: none; overflow: hidden; white-space: nowrap;
}
.bar:hover { filter: brightness(0.95); }
.barText { overflow: hidden; text-overflow: ellipsis; }
.percent { flex: none; }
.point {
  position: absolute; top: 34px; width: 12px; height: 12px; margin-left: -6px; padding: 0; transform: rotate(45deg);
  border: 2px solid var(--color-text-primary); background: var(--color-surface-default); cursor: pointer;
}
.done { background: var(--color-status-success); }
.overdue { background: var(--color-status-danger); }
.todayLine { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--color-action-primary); pointer-events: none; z-index: 1; }
.todayText {
  position: absolute; top: 2px; left: 4px; padding: 0 var(--space-2); border-radius: var(--radius-pill);
  background: var(--color-action-primary); color: var(--color-text-inverse); font-size: var(--text-xs); white-space: nowrap;
}
.empty { padding: var(--space-4); color: var(--color-text-secondary); }
```

- [ ] **Step 4: Verificar y commit**

```bash
git add src/components/calendar/GanttView.* tests/components/GanttView.test.tsx
git commit -m "feat(v2): vista gantt con barras de proyectos y tareas"
```

---

### Task 3: Pestañas Mes / Gantt en la página

**Files:**
- Modify: `src/pages/CalendarPage.tsx` (+ `.module.css`)
- Test: `tests/components/CalendarPage.test.tsx`

**Interfaces:**
- Consumes: `GanttView` (T2), `rangeAround`, `ganttRange`, `addDays`, `rangeLabel` (T1).

- [ ] **Step 1: Test que falla**

En `tests/components/CalendarPage.test.tsx`:
- `state` suma `projects: [] as Project[]` y el mock de `useProjects` devuelve `state.projects` (import `type { Project }`).
- En `beforeEach`: `state.projects = [{ id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', startDate: '2026-10-01', endDate: '2026-11-30', archived: false, createdBy: 'ana', createdAt: 1, rev: 1 }];`
- Agregar:

```tsx
  it('cambia a Gantt, lo recuerda y navega por semanas', async () => {
    const { unmount } = renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'Gantt' }));
    expect(screen.getByRole('heading', { level: 2, name: '28 sept → 1 nov 2026' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Portal, 1 de octubre a 30 de noviembre/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Semanas siguientes' }));
    expect(screen.getByRole('heading', { level: 2, name: /2 nov → 6 dic 2026/ })).toBeInTheDocument();
    unmount();
    renderPage();
    expect(screen.getByRole('radio', { name: 'Gantt' })).toBeChecked();
  });

  it('incluir archivados muestra proyectos archivados en el Gantt', async () => {
    state.projects = [{ ...state.projects[0], name: 'Archivado', archived: true }];
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: 'Gantt' }));
    expect(screen.queryByRole('link', { name: /Archivado/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Incluir archivados' }));
    expect(screen.getByRole('link', { name: /Archivado/ })).toBeInTheDocument();
  });
```

> Ajustar el título esperado a lo que devuelva `rangeLabel` en el entorno (ver nota de la tarea 1).

- [ ] **Step 2: Correr y ver que fallan** → FAIL.

- [ ] **Step 3: Implementar**

En `CalendarPage.tsx`:
- Imports: `GanttView`; `addDays, ganttRange, rangeAround, rangeLabel, type GanttRange` de `gantt`.
- Estado:

```tsx
  const [view, setView] = usePreference<'month' | 'gantt'>('matecode.calendar.view', 'month', ['month', 'gantt']);
  const [range, setRange] = useState<GanttRange>(() => rangeAround(today));
  const [withArchived, setWithArchived] = useState(false);
```

- Proyectos del Gantt: `const ganttProjects = projects.filter((p) => (withArchived || !p.archived) && (projectFilter === 'all' || p.id === projectFilter) && projectFilter !== 'none');`
- `PageHeader` con `actions={<SegmentedControl label="Vista del calendario" name="calendar-view" value={view} onChange={setView} options={[{ value: 'month', label: 'Mes' }, { value: 'gantt', label: 'Gantt' }]} />}`.
- La navegación depende de la vista:

```tsx
          <div className={styles.month}>
            {view === 'month' ? (
              <>
                {/* (los botones de mes que ya existen) */}
              </>
            ) : (
              <>
                <Button size="sm" variant="secondary" aria-label="Semanas anteriores" onClick={() => setRange(ganttRange(addDays(range.start, -35)))}>
                  <ChevronLeft size={16} aria-hidden="true" />
                </Button>
                <h2 className={styles.monthTitle} aria-live="polite">{rangeLabel(range)}</h2>
                <Button size="sm" variant="secondary" aria-label="Semanas siguientes" onClick={() => setRange(ganttRange(addDays(range.start, 35)))}>
                  <ChevronRight size={16} aria-hidden="true" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRange(rangeAround(today))}>Hoy</Button>
              </>
            )}
          </div>
```

- En los filtros, solo en Gantt: `{view === 'gantt' && <label className={styles.check}><input type="checkbox" checked={withArchived} onChange={(e) => setWithArchived(e.target.checked)} />Incluir archivados</label>}`.
- Contenido: `view === 'month' ? (<>MonthView + AgendaView</>) : <GanttView projects={ganttProjects} tasks={visible} range={range} today={today} nameOf={nameOf} onOpenTask={(t) => openTask(t.id)} />`.
- `CalendarPage.module.css`: `.monthTitle` pasa a `min-width: 11em`.

- [ ] **Step 4: Verificar y commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add src/pages/CalendarPage.* tests/components/CalendarPage.test.tsx
git commit -m "feat(v2): pestañas mes y gantt en el calendario"
```

---

### Task 4: Preview y documentación

- [ ] Preview (`vercel --yes` + alias), producción 200, push.
- [ ] Prueba de la usuaria: pestaña Gantt (se recuerda); barras con color, % y "Atrasado"; ◆ verdes/rojos y clic al panel; clic en la barra va al proyecto; ‹ › y "Hoy"; filtros e "Incluir archivados"; celular con desplazamiento lateral y nombres fijos.
- [ ] **README**: etapa 6 (Mes y Gantt) lista; qué datos usa y qué se descartó del mockup; cantidad de tests.
- [ ] **AI_LOG**: entrada "v2 — Etapa 6" ("Qué aprendí" pendiente para la usuaria).
- [ ] Commit `docs(v2): calendario mes y gantt en README y AI_LOG` y push.

---

## Autorrevisión del plan

- **Cobertura del spec (6B):** fila por proyecto con barra, color, % y atrasado (T2); ◆ por tarea con estado y clic al panel (T2); línea "Hoy" (T2); 5 semanas con ‹ › y "Hoy" (T1, T3); activos por defecto + "Incluir archivados" (T3); sin tareas sin proyecto (T2 filtra por `projectId`); pestañas recordadas (T3); celular con desplazamiento y columna fija (T2 CSS); funciones con casos borde de semana ISO (T1).
- **Ajustes:** la línea de "Hoy" lleva su texto visible; las barras son enlaces con etiqueta completa (sin lista duplicada, como se acordó).
- **Consistencia de nombres:** `GanttRange`, `addDays`, `startOfWeek`, `isoWeek`, `ganttRange`, `rangeAround`, `pointPosition`, `barPosition`, `rangeLabel`, `GanttView`.
