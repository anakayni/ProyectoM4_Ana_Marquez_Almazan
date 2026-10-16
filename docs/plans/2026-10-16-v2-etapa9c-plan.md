# Etapa 9C v2 — Invitado y Lector no ven tareas hechas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Invitado y Lector nunca puedan leer tareas hechas (garantizado por las reglas) y que la app les muestre todo coherente: sin hechas en vistas, calendario y email, y "N tareas abiertas" en lugar del avance.

**Architecture:** Las reglas limitan la lectura de `tasks` y del historial de tareas a `status in ['todo', 'doing']` para `viewer` y `guest`. La app pide para esos roles solo tareas abiertas (`where('status', 'in', …)`). `seesDoneTasks(role)` decide en cada pantalla. El avance sin hechas sale de `projectOpenSummary`. El email recibe `showDone`.

**Tech Stack:** React 19 + TS, Firebase 12 (reglas + emulador), firebase-admin 13, Vitest + RTL.

**Spec:** `docs/specs/2026-10-13-v2-etapa9-invitados-design.md`, sección 9 (anexo).

## Global Constraints

- Solo `guest` y `viewer`; admin y miembro sin cambios.
- Estados abiertos: `['todo', 'doing']` (el orden importa en las consultas y en las reglas).
- Textos: "N tareas abiertas" ("1 tarea abierta", "Sin tareas abiertas"); "Atrasado" si pasó `endDate` con tareas abiertas; confirmación del Invitado: "¿Marcar como hecha? Dejarás de verla: las tareas terminadas solo las ven el admin y los miembros." con "Cancelar" / "Sí, marcar".
- Reglas publicadas en dev con el script temporal; tests de reglas en verde.
- `npm test`, `npm run build`, `npm run lint` (y `npm run test:rules` en la tarea 1) antes de cada commit; un commit por tarea con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Reglas y consultas

**Files:**
- Modify: `firestore.rules`, `src/features/auth/permissions.ts`, `src/services/tasks.service.ts`
- Test: `tests/rules/done.rules.test.ts` (nuevo), `tests/rules/guest.rules.test.ts` (consultas con estado), `tests/unit/permissions.test.ts`

**Interfaces:**
- Produces: `OPEN_STATUSES = ['todo', 'doing'] as const` (en `src/types/task.ts`), `seesDoneTasks(role: Role): boolean`; reglas `seesDone()`, `openTask(id)`.

- [ ] **Step 1: Tests que fallan**

```ts
// tests/rules/done.rules.test.ts
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { createTask, updateTask } from '@/services/audited/tasks';
import { createEnv, dbAs, seedCounter, seedProject, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const input = { title: 'T', description: '', priority: 'media' as const, dueDate: null, assigneeId: null, projectId: 'p1' };
const OPEN = ['todo', 'doing'];
let openId = '';
let doneId = '';

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seedUser(env, 'admin', 'admin');
  await seedUser(env, 'ana', 'member');
  await seedUser(env, 'vera', 'viewer');
  await seedUser(env, 'gus', 'guest');
  await seedCounter(env);
  await seedProject(env, 'p1', { ownerId: 'ana', memberIds: ['gus'] });
  openId = await createTask(as('ana'), 'ana', input);
  doneId = await createTask(as('ana'), 'ana', input);
  await updateTask(as('ana'), 'ana', doneId, { status: 'done' });
});

const history = (uid: string, id: string) =>
  getDocs(query(collection(as(uid), 'auditLog'), where('entityType', '==', 'task'), where('entityId', '==', id)));

describe('Lector', () => {
  it('lee solo tareas abiertas', async () => {
    const db = as('vera');
    await assertSucceeds(getDocs(query(collection(db, 'tasks'), where('status', 'in', OPEN))));
    await assertSucceeds(getDoc(doc(db, 'tasks', openId)));
    await assertFails(getDoc(doc(db, 'tasks', doneId)));
    await assertFails(getDocs(collection(db, 'tasks')));
  });

  it('no lee el historial de una tarea hecha', async () => {
    await assertSucceeds(history('vera', openId));
    await assertFails(history('vera', doneId));
  });
});

describe('Invitado', () => {
  it('lee solo tareas abiertas de su proyecto', async () => {
    const db = as('gus');
    await assertSucceeds(getDocs(query(collection(db, 'tasks'), where('projectId', '==', 'p1'), where('status', 'in', OPEN))));
    await assertFails(getDocs(query(collection(db, 'tasks'), where('projectId', '==', 'p1'))));
    await assertFails(getDoc(doc(db, 'tasks', doneId)));
    await assertFails(history('gus', doneId));
  });

  it('puede marcar una tarea como hecha y después ya no la lee', async () => {
    await assertSucceeds(updateTask(as('gus'), 'gus', openId, { status: 'done' }));
    await assertFails(getDoc(doc(as('gus'), 'tasks', openId)));
  });
});

describe('Admin y miembro', () => {
  it('siguen leyendo todo, incluidas las hechas y su historial', async () => {
    await assertSucceeds(getDocs(collection(as('ana'), 'tasks')));
    await assertSucceeds(getDoc(doc(as('ana'), 'tasks', doneId)));
    await assertSucceeds(history('ana', doneId));
    await assertSucceeds(history('admin', doneId));
  });
});
```

En `tests/rules/guest.rules.test.ts`, las consultas de tareas del Invitado agregan el estado: `where('projectId', '==', 'p1'), where('status', 'in', ['todo', 'doing'])` (y lo mismo para `p2` en el caso que debe fallar).

En `tests/unit/permissions.test.ts`:

```ts
describe('seesDoneTasks', () => {
  it('solo admin y miembro ven las tareas hechas', () => {
    expect(seesDoneTasks('admin')).toBe(true);
    expect(seesDoneTasks('member')).toBe(true);
    expect(seesDoneTasks('viewer')).toBe(false);
    expect(seesDoneTasks('guest')).toBe(false);
  });
});
```

- [ ] **Step 2: Ver que fallan** — `npm run test:rules` (FAIL: el Lector y el Invitado leen hechas) y `npx vitest run tests/unit/permissions.test.ts` (FAIL: no existe `seesDoneTasks`).

- [ ] **Step 3: Implementación**

`src/types/task.ts`: `export const OPEN_STATUSES = ['todo', 'doing'] as const;`

`permissions.ts`:

```ts
/** Invitado y Lector nunca ven tareas hechas (las reglas tampoco se las dejan leer). */
export function seesDoneTasks(role: Role): boolean {
  return role === 'admin' || role === 'member';
}
```

Reglas — en el bloque de identidad: `function seesDone() { return hasRole(['admin', 'member']); }`; junto a `taskPath`:

```
    // Tarea que existe y no está hecha (lo único que Lector e Invitado pueden ver).
    function openTask(id) { return exists(taskPath(id)) && get(taskPath(id)).data.status in ['todo', 'doing']; }
```

`match /tasks/{taskId}` → lectura:

```
      allow read: if seesDone()
        || (hasRole(['viewer']) && resource.data.status in ['todo', 'doing'])
        || (isGuest() && resource.data.status in ['todo', 'doing'] && guestIn(resource.data.projectId));
```

`match /auditLog/{logId}` → lectura:

```
      allow read: if isAdmin()
        || (hasRole(['member']) && resource.data.entityType in ['task', 'project'])
        || (hasRole(['viewer']) && resource.data.entityType == 'project')
        || (hasRole(['viewer']) && resource.data.entityType == 'task' && openTask(resource.data.entityId))
        || (isGuest() && resource.data.entityType == 'task'
            && openTask(resource.data.entityId) && guestIn(get(taskPath(resource.data.entityId)).data.projectId))
        || (isGuest() && resource.data.entityType == 'project' && guestIn(resource.data.entityId));
```

`tasks.service.ts` — `subscribeToTasks`:

```ts
const open = () => where('status', 'in', [...OPEN_STATUSES]);

  // Admin y miembro: todas. Lector: solo abiertas. Invitado: abiertas de cada proyecto suyo.
  if (seesDoneTasks(viewer.role)) {
    return onSnapshot(collection(db, 'tasks'), (snapshot) => onData(newestFirst(snapshot.docs.map(toTask))), onError);
  }
  if (viewer.role !== 'guest') {
    return onSnapshot(query(collection(db, 'tasks'), open()), (snapshot) => onData(newestFirst(snapshot.docs.map(toTask))), onError);
  }
  // …fan-out del Invitado con query(collection(db, 'tasks'), where('projectId', '==', projectId), open())
```

- [ ] **Step 4: Ver que pasan** — `npm run test:rules && npm test && npm run build && npm run lint`.

- [ ] **Step 5: Commit** — `feat(v2): Lector e Invitado no pueden leer tareas hechas`

---

### Task 2: Vistas de tareas y confirmación del Invitado

**Files:**
- Modify: `src/components/tasks/TaskStats.tsx`, `TaskBoard.tsx`, `TaskWorkspace.tsx`, `TaskDialogs.tsx`, `TaskDetailPanel.tsx`
- Modify: `src/features/tasks/sortTasks.ts` (pedido de la usuaria: para quien sí ve las hechas, van al final también en "Más recientes")
- Test: `tests/components/doneHidden.test.tsx` (nuevo), `tests/unit/sortTasks.test.ts`

**Interfaces:**
- `TaskStats` y `TaskBoard`: prop `showDone?: boolean` (por defecto `true`).
- `TaskDetailPanel`: prop `confirmDone?: boolean`.

- [ ] **Step 1: Tests que fallan**

```tsx
// tests/components/doneHidden.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { TaskStats } from '@/components/tasks/TaskStats';
import type { Task } from '@/types/task';

const setStatus = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [{
      id: 't1', createdBy: 'ana', updatedBy: 'ana', rev: 1, title: 'Diseñar logo', description: '', status: 'todo', assigneeId: 'g',
      completedBy: null, completedAt: null, projectId: 'p1', number: 1, subtasks: [], priority: 'media', dueDate: null, createdAt: 1,
    } satisfies Task],
    loading: false, error: null, retry: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setStatus,
  }),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({ projects: [{ id: 'p1', name: 'Portal', ownerId: 'ana', memberIds: ['g'], archived: false, color: '#4D7C8A' }], loading: false, error: null }),
}));

import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';

const stats = { todo: 1, doing: 0, done: 0, overdue: 0 };

describe('sin tareas hechas', () => {
  it('las tarjetas no muestran "Hechas"', () => {
    render(<TaskStats stats={stats} selected={null} onSelect={vi.fn()} showDone={false} />);
    expect(screen.queryByRole('button', { name: /Hechas/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pendientes/ })).toBeInTheDocument();
  });

  it('el tablero no tiene la columna "Hecha"', () => {
    render(<TaskBoard tasks={[]} nameOf={() => null} personOf={() => null} projectOf={() => null} canEdit onStatusChange={vi.fn()} onOpen={vi.fn()} showDone={false} />);
    expect(screen.queryByRole('region', { name: /Hecha/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(2);
  });

  it('el Invitado confirma antes de marcar una tarea como hecha', async () => {
    const guest = { uid: 'g', email: 'g@x.com', displayName: 'G', role: 'guest' as const, active: true, invitedBy: null, rev: 1 };
    render(<TaskWorkspace profile={guest} renderHeader={() => null} />);
    await userEvent.selectOptions(screen.getByLabelText('Estado de "Diseñar logo"'), 'Hecha');
    const dialog = screen.getByRole('dialog', { name: '¿Marcar como hecha?' });
    expect(dialog).toHaveTextContent('Dejarás de verla: las tareas terminadas solo las ven el admin y los miembros.');
    expect(setStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sí, marcar' }));
    expect(setStatus).toHaveBeenCalledWith('t1', 'done');
  });
});
```

En `tests/unit/sortTasks.test.ts` (adaptar al helper de tareas del archivo):

```ts
  it('"Más recientes" deja las hechas al final, cada grupo de la más nueva a la más vieja', () => {
    const list = [task({ id: 'a', createdAt: 3, status: 'done' }), task({ id: 'b', createdAt: 1 }), task({ id: 'c', createdAt: 2 }), task({ id: 'd', createdAt: 4, status: 'done' })];
    expect(sortTasks(list, 'recent').map((t) => t.id)).toEqual(['c', 'b', 'd', 'a']);
  });
```

- [ ] **Step 2: Ver que fallan** — `npx vitest run tests/components/doneHidden.test.tsx tests/unit/sortTasks.test.ts`.

- [ ] **Step 3: Implementación**
  - `sortTasks`: `if (mode === 'recent') return list.sort((a, b) => pendingFirst(a, b) || byRecent(a, b));` y actualizar el comentario ("recent: pendientes primero, la más nueva primero").
  - `TaskStats`: `showDone = true`; `CARDS.filter((c) => showDone || c.key !== 'done')`.
  - `TaskBoard`: `showDone = true`; `STATUSES.filter((s) => showDone || s !== 'done')`; en celular/computadora la grilla usa `repeat(${columns}, 1fr)` vía clase `.two` cuando son 2 columnas (`@media (min-width: 900px) { .two { grid-template-columns: repeat(2, 1fr); } }`).
  - `TaskWorkspace`: `const showDone = seesDoneTasks(profile.role);` pasar a `TaskStats` y `TaskBoard`; estado `const [confirmDoneId, setConfirmDoneId] = useState<string | null>(null);` y una función

    ```ts
    // El Invitado deja de ver la tarea al terminarla: se pide confirmación antes.
    const changeStatus = (id: string, status: TaskStatus) => {
      if (profile.role === 'guest' && status === 'done') setConfirmDoneId(id);
      else void safely(() => setStatus(id, status));
    };
    ```

    que reemplaza los `onStatusChange={(id, status) => void safely(() => setStatus(id, status))}` de las tres vistas. Al final del JSX:

    ```tsx
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
    ```

    (`.confirmActions { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4); }` en `TaskWorkspace.module.css`.)
  - `TaskDialogs`: `confirmDone={profile.role === 'guest'}` al panel.
  - `TaskDetailPanel`: `confirmDone = false`; el estado `confirm` suma `'done'`; en `save`, si `confirmDone && draft.status === 'done' && task.status !== 'done'` y todavía no se confirmó, `setConfirm('done')` y salir; el bloque de confirmación muestra el mismo texto con "Cancelar" (vuelve a editar) y "Sí, marcar" (guarda).

- [ ] **Step 4: Ver que pasan** — `npm test && npm run build && npm run lint`.

- [ ] **Step 5: Commit** — `feat(v2): sin tareas hechas en las vistas de Lector e Invitado`

---

### Task 3: Proyectos y calendario sin hechas

**Files:**
- Modify: `src/features/projects/projectProgress.ts`, `src/components/projects/ProjectCard.tsx`, `src/pages/ProjectsPage.tsx`, `src/pages/ProjectPage.tsx`, `src/components/calendar/GanttView.tsx`, `src/pages/CalendarPage.tsx`
- Test: `tests/unit/projectProgress.test.ts`, `tests/components/ProjectCard.test.tsx`, `tests/components/CalendarPage.test.tsx`

**Interfaces:**
- `openTasksLabel(n: number): string`
- `projectOpenSummary(tasks, endDate, today): { open: number; late: boolean }`
- `ProjectCard` y `GanttView`: prop `showDone?: boolean` (por defecto `true`).

- [ ] **Step 1: Tests que fallan**

```ts
// en tests/unit/projectProgress.test.ts
describe('sin tareas hechas', () => {
  it('cuenta lo que falta y avisa si está atrasado', () => {
    const t = (status: Task['status']) => ({ status }) as Task;
    expect(projectOpenSummary([t('todo'), t('doing')], '2026-10-01', '2026-10-16')).toEqual({ open: 2, late: true });
    expect(projectOpenSummary([], '2026-10-01', '2026-10-16')).toEqual({ open: 0, late: false });
    expect(openTasksLabel(0)).toBe('Sin tareas abiertas');
    expect(openTasksLabel(1)).toBe('1 tarea abierta');
    expect(openTasksLabel(6)).toBe('6 tareas abiertas');
  });
});
```

```tsx
// en tests/components/ProjectCard.test.tsx
  it('sin hechas muestra las tareas abiertas en lugar del avance', () => {
    renderCard({ showDone: false, tasks: 6 }); // adaptar al helper del archivo: progress con todo + doing = 6
    expect(screen.getByText('6 tareas abiertas')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/hechas/)).not.toBeInTheDocument();
  });
```

En `tests/components/CalendarPage.test.tsx`: con perfil `viewer`, no existe la casilla "Ocultar hechas".

- [ ] **Step 2: Ver que fallan.**

- [ ] **Step 3: Implementación**

```ts
// projectProgress.ts
export function openTasksLabel(n: number): string {
  if (n === 0) return 'Sin tareas abiertas';
  return n === 1 ? '1 tarea abierta' : `${n} tareas abiertas`;
}

/** Para quien no ve las hechas: cuánto falta y si pasó la fecha de fin con tareas abiertas. */
export function projectOpenSummary(tasks: readonly Task[], endDate: string, today: string): { open: number; late: boolean } {
  const open = tasks.filter((t) => t.status !== 'done').length;
  return { open, late: endDate < today && open > 0 };
}
```

- `ProjectCard`: `showDone = true`; si `!showDone`: "Atrasado · terminó el …" según `late` de `projectOpenSummary`, y en lugar de la barra y los dos párrafos, `<p className={styles.summary}>{openTasksLabel(open)}</p>`. Para eso recibe además `tasks` del proyecto, o `ProjectsPage` le pasa `open`/`late` ya calculados: usar props `open?: { open: number; late: boolean }` y decidir por `showDone`.
- `ProjectsPage`: `showDone = seesDoneTasks(me.role)`; pasa `showDone` y `open={projectOpenSummary(tasksDelProyecto, project.endDate, today)}`.
- `ProjectPage`: en la línea de meta, si `!seesDoneTasks(me.role)` mostrar `· {openTasksLabel(open)}` en lugar de `· {percent}% ({done} de {total})`, y "Atrasado" con `late` del resumen abierto.
- `GanttView`: `showDone = true`; si `!showDone`, en la barra `{open} abiertas` en lugar de `{percent}%`, y en el `aria-label` `${openTasksLabel(open)}` en lugar de `${percent}% hecho`; "Atrasado" con `late` del resumen abierto.
- `CalendarPage`: `const showDone = seesDoneTasks(me.role);` la casilla "Ocultar hechas" solo si `showDone`; pasar `showDone` a `GanttView`.

- [ ] **Step 4: Ver que pasan** — `npm test && npm run build && npm run lint`.

- [ ] **Step 5: Commit** — `feat(v2): avance como tareas abiertas para Lector e Invitado`

---

### Task 4: Email de resumen sin hechas

**Files:**
- Modify: `functions/visibleTasks.ts`, `functions/firebaseAdmin.ts`, `functions/sendSummary.ts`, `functions/summaryEmail.ts`
- Test: `tests/server/visibleTasks.test.ts`, `tests/server/sendSummary.test.ts`, `tests/server/summaryEmail.test.ts`

**Interfaces:**
- `visibleForRole` también quita las hechas para `viewer` y `guest`.
- `getTasksForUser(uid): Promise<{ tasks: SummaryTask[]; showDone: boolean }>`
- `renderSummaryEmail({ …, showDone?: boolean })` (por defecto `true`).

- [ ] **Step 1: Tests que fallan**
  - `visibleTasks.test.ts`: `visibleForRole('viewer', [{projectId:null,status:'done'},{projectId:null,status:'todo'}], [])` deja solo la abierta; el Invitado, solo abiertas de sus proyectos.
  - `summaryEmail.test.ts`: con `showDone: false`, ni el asunto, ni el HTML, ni el texto plano dicen "Hechas"/"hechas".
  - `sendSummary.test.ts`: los fakes de `getTasksForUser` devuelven `{ tasks, showDone }` y, con `showDone: false`, el email enviado no contiene "Hechas".

- [ ] **Step 2: Ver que fallan.**

- [ ] **Step 3: Implementación**
  - `visibleForRole<T extends { projectId: string | null; status: string }>`: si `role === 'viewer' || role === 'guest'`, primero `tasks.filter((t) => t.status !== 'done')`; el Invitado además por proyectos.
  - `firebaseAdmin.getTasksForUser`: devuelve `{ tasks: …, showDone: role === 'admin' || role === 'member' }` (las tareas ya filtradas).
  - `sendSummary.ts`: `const { tasks, showDone } = await deps.getTasksForUser(user.uid);` y `renderSummaryEmail({ …, showDone })`.
  - `summaryEmail.ts`: con `showDone === false`, el asunto es `Tu resumen de tareas: N pendientes, M en curso`, no se dibuja la celda "Hechas" ni la sección "Hechas", y el texto plano es `Pendientes: N · En curso: M`.

- [ ] **Step 4: Ver que pasan** — `npm test && npm run build && npm run lint`.

- [ ] **Step 5: Commit** — `feat(v2): el resumen de Lector e Invitado no incluye tareas hechas`

---

### Task 5: Reglas en dev, preview y prueba

- [ ] Publicar `firestore.rules` en `matecode-tasks-dev` (script temporal, se borra).
- [ ] Comprobar con un script de solo lectura (admin SDK) la consulta del Invitado `projectId == x` + `status in [...]`; si Firestore pide un índice, pasar a la usuaria el enlace que devuelve el error y agregarlo a `firestore.indexes.json`.
- [ ] Preview (`vercel --yes` + alias), producción 200.
- [ ] Prueba: con la cuenta demo (Lector) no aparecen tareas hechas en ninguna vista, el tablero tiene 2 columnas, los proyectos dicen "N tareas abiertas"; como Invitado (cuando la 9B permita agregarlo) marcar una tarea como hecha pide confirmación y la tarea desaparece; como admin todo igual.
- [ ] README/AI_LOG/CLAUDE.md se actualizan al cerrar la 9B (junto con el resto de la etapa 9).
