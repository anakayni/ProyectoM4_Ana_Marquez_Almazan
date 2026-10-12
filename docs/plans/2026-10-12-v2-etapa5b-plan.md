# v2 Etapa 5B — Tareas en tabla, número, subtareas y panel editable: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Número de tarea `MC-n`, subtareas, búsqueda y filtros de prioridad y proyecto, vista Tabla (además de Lista y Tablero) y un panel de detalle editable que guarda todo de una vez.

**Architecture:** El modelo suma `number` (con un contador `counters/tasks` que la creación incrementa en la misma transacción) y `subtasks` (lista dentro de la tarea), ambos validados por las reglas; una sola migración los agrega. Búsqueda, filtros y frases del historial son funciones puras. `TaskDetailPanel` pasa a ser un formulario con borrador local que genera un único `TaskPatch`.

**Tech Stack:** React 19, Firebase 12, firebase-admin 13 (migración), Vitest + RTL, emulador de Firestore.

**Spec:** `docs/specs/2026-10-12-v2-etapa5-proyectos-y-tabla-design.md` (parte 5B)

## Global Constraints

- Número: `MC-{n}`, `n` entero ≥ 1, asignado al crear desde `counters/tasks.next`; nunca cambia ni se repite.
- Subtareas: hasta 20 por tarea; cada una `{ id, title (1–120), done }`.
- Búsqueda por título, descripción o número (`mc-108`, `108`), sin distinguir mayúsculas ni tildes.
- Vistas: Lista, Tabla, Tablero (íconos `List`, `Table2`, `LayoutGrid`). En celular la tabla se ve como tarjetas.
- Panel: "Guardar cambios" (una escritura, una entrada de historial), "¿Descartar los cambios?" al cerrar con cambios, "Eliminar" con confirmación.
- Texto con contraste ≥ 4.5:1 (usar tokens existentes).
- Reglas y migración solo en `matecode-tasks-dev`.
- Cada tarea termina con `npm test`, `npm run build`, `npm run lint` (y `npm run test:rules` si toca reglas) en verde.
- Commits Conventional en español con trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/types/task.ts` | Modificar | `Subtask`, `number`, `subtasks`, `TaskPatch` ampliado, `TaskView` |
| `firestore.rules` | Modificar | Contador, `number`, `subtasks` |
| `src/services/audited/tasks.ts`, `src/services/tasks.service.ts` | Modificar | Crear con número (transacción); leer campos nuevos |
| `src/features/tasks/migrateTask.ts`, `scripts/migrate-tasks.mjs` | Modificar | Número, subtareas y contador |
| `src/features/tasks/taskNumber.ts` | Crear | `formatTaskNumber` |
| `src/features/tasks/subtasks.ts` | Crear | `subtaskProgress`, `newSubtask` |
| `src/features/tasks/searchTasks.ts` | Crear | `searchTasks`, `filterByPriority`, `filterByProject` |
| `src/features/audit/describeChange.ts` | Modificar | Frases de proyecto y subtareas |
| `src/components/tasks/TaskTable.tsx` | Crear | Vista Tabla |
| `src/components/tasks/TaskWorkspace.tsx` | Modificar | Buscador, filtros, 3 vistas, panel editable |
| `src/components/tasks/TaskDetailPanel.tsx` | Modificar | Formulario editable con subtareas |
| `src/components/ui/Modal.tsx` | Modificar | Escape delega en `onClose` |
| `src/components/tasks/TodoItem.tsx`, `TaskBoard.tsx`, `TaskHistory.tsx` | Modificar | Número, subtareas, nombre de proyecto en el historial |

---

### Task 1: Número de tarea y subtareas en los datos

**Files:**
- Modify: `src/types/task.ts`, `firestore.rules`, `src/services/audited/tasks.ts`, `src/services/tasks.service.ts`, `src/features/tasks/migrateTask.ts`, `scripts/migrate-tasks.mjs`, `tests/rules/helpers.ts`
- Create: `src/features/tasks/taskNumber.ts`
- Test: `tests/rules/tasks.rules.test.ts`, `tests/unit/migrateTask.test.ts`, `tests/unit/taskNumber.test.ts`, fixtures de `Task`

**Interfaces:**
- Produces:
  ```ts
  export interface Subtask { id: string; title: string; done: boolean }
  // Task: number: number; subtasks: Subtask[]
  // TaskPatch = Partial<TaskInput & Pick<Task, 'status' | 'subtasks'>>
  export function formatTaskNumber(n: number): string;          // 'MC-108'
  export function migrateTask(doc: RawTask, nextNumber: number): Migration;  // asigna number si falta
  export async function seedCounter(env, next = 1): Promise<void>; // tests/rules/helpers
  ```

- [ ] **Step 1: Tests que fallan**

`tests/rules/helpers.ts`, agregar:

```ts
/** El contador de números de tarea (en producción lo crea la migración). */
export async function seedCounter(env: RulesTestEnvironment, next = 1): Promise<void> {
  await seed(env, (db) => setDoc(doc(db, 'counters', 'tasks'), { next }));
}
```

En `tests/rules/tasks.rules.test.ts`, `audit.rules.test.ts` y `projects.rules.test.ts`: importar `seedCounter` y llamar `await seedCounter(env);` al final de cada `beforeEach`.

En `tests/rules/tasks.rules.test.ts`:
- En el test "no se puede crear una tarea sin su entrada de auditoría", agregar `number: 1, subtasks: [],` al objeto.
- Agregar al final del `describe('tareas')`:

```ts
  describe('número y subtareas', () => {
    const data = async (id: string) => (await getDoc(doc(as('admin'), 'tasks', id))).data()!;

    it('cada tarea nueva recibe el siguiente número', async () => {
      const a = await createTask(as('ana'), 'ana', input);
      const b = await createTask(as('luis'), 'luis', input);
      expect([(await data(a)).number, (await data(b)).number]).toEqual([1, 2]);
      expect((await getDoc(doc(as('ana'), 'counters', 'tasks'))).data()?.next).toBe(3);
    });

    it('no se puede crear con un número distinto al del contador', async () => {
      const db = as('ana');
      const ref = doc(collection(db, 'tasks'));
      const after = {
        createdBy: 'ana', title: 'x', description: '', status: 'todo', assigneeId: null, completedBy: null, completedAt: null,
        projectId: null, number: 99, subtasks: [], priority: 'media', dueDate: null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: 'ana', rev: 1,
      };
      const batch = writeBatch(db);
      batch.set(ref, after);
      batch.update(doc(db, 'counters', 'tasks'), { next: 100 });
      batch.set(doc(db, 'auditLog', `task_${ref.id}_1`), {
        entityType: 'task', entityId: ref.id, rev: 1, action: 'create', actorId: 'ana', at: serverTimestamp(), before: null, after,
      });
      await assertFails(batch.commit());
    });

    it('el contador solo sube de a 1 y el número no cambia', async () => {
      await assertFails(updateDoc(doc(as('ana'), 'counters', 'tasks'), { next: 50 }));
      const id = await createTask(as('ana'), 'ana', input);
      await assertFails(updateTask(as('ana'), 'ana', id, { number: 7 } as never));
    });

    it('acepta hasta 20 subtareas', async () => {
      const id = await createTask(as('ana'), 'ana', input);
      const many = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, title: `Paso ${i}`, done: false }));
      await assertSucceeds(updateTask(as('ana'), 'ana', id, { subtasks: many(20) }));
      await assertFails(updateTask(as('ana'), 'ana', id, { subtasks: many(21) }));
    });
  });
```

(Importar `collection`, `updateDoc` si faltan.)

```ts
// tests/unit/taskNumber.test.ts
import { describe, expect, it } from 'vitest';
import { formatTaskNumber } from '@/features/tasks/taskNumber';

describe('formatTaskNumber', () => {
  it('antepone el prefijo', () => {
    expect(formatTaskNumber(108)).toBe('MC-108');
  });
});
```

`tests/unit/migrateTask.test.ts`: cada llamada pasa un segundo argumento `1`; los `toEqual` esperados suman `number: 1, subtasks: []`; la tarea "ya migrada" suma `number: 4, subtasks: []`. Agregar:

```ts
  it('conserva el número que ya tenía y agrega subtareas vacías', () => {
    const result = migrateTask({
      ...base, createdBy: 'ana', updatedBy: 'ana', rev: 2, status: 'todo', assigneeId: null, completedBy: null,
      completedAt: null, projectId: null, number: 7,
    }, 50);
    expect(result?.data).toMatchObject({ number: 7, subtasks: [] });
  });
```

Fixtures de `Task` en `tests/components/*` y `tests/unit/*` (no en `tests/rules`, ni en los `TaskInput` de `TodoForm.test` y del `create` de `useTasks.test`): después de `projectId: null` agregar `number: 1, subtasks: []` (reemplazar exactamente `projectId: null,` → `projectId: null, number: 1, subtasks: [],` y `projectId: null }` → `projectId: null, number: 1, subtasks: [] }`; en archivos con `projectId: 'p'`/`projectId,` agregar a mano). Revisar con `npm run build` que no quede ninguno.

- [ ] **Step 2: Correr y ver que fallan** — `npm run test:rules` y `npx vitest run tests/unit/migrateTask.test.ts tests/unit/taskNumber.test.ts` → FAIL.

- [ ] **Step 3: Tipos y número**

`src/types/task.ts`:

```ts
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}
```

En `Task` agregar `/** Número correlativo del espacio (se muestra como MC-n) */ number: number;` y `/** Pasos dentro de la tarea (máximo 20) */ subtasks: Subtask[];`. `TaskPatch` pasa a `Partial<TaskInput & Pick<Task, 'status' | 'subtasks'>>`.

```ts
// src/features/tasks/taskNumber.ts
/** Prefijo de los números de tarea (en la etapa 8 se podrá cambiar desde Ajustes). */
export const TASK_PREFIX = 'MC';

export function formatTaskNumber(n: number): string {
  return `${TASK_PREFIX}-${n}`;
}
```

- [ ] **Step 4: Reglas**

En `validTask`: agregar `'number', 'subtasks'` a `hasOnly` y

```
        && d.number is int && d.number >= 1
        && d.subtasks is list && d.subtasks.size() <= 20
```

Antes de `match /tasks`:

```
    function counterPath() { return /databases/$(database)/documents/counters/tasks; }
```

`tasks` create agrega:

```
        && request.resource.data.number == get(counterPath()).data.next
        && getAfter(counterPath()).data.next == request.resource.data.number + 1
```

`tasks` update agrega `&& request.resource.data.number == resource.data.number`.

Nuevo bloque:

```
    // ─── Contador de números de tarea (lo crea la migración) ──────
    match /counters/tasks {
      allow read: if isActive();
      allow update: if canEdit()
        && request.resource.data.keys().hasOnly(['next'])
        && request.resource.data.next == resource.data.next + 1;
    }
```

- [ ] **Step 5: Escrituras y lectura**

`src/services/audited/tasks.ts`, `createTask` pasa a transacción:

```ts
export async function createTask(db: Firestore, actorId: string, input: TaskInput): Promise<string> {
  const ref = doc(collection(db, 'tasks'));
  const counter = doc(db, 'counters', 'tasks');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counter);
    if (!snap.exists()) throw new Error('Falta el contador de tareas: corre "npm run migrate-tasks".');
    const number: number = snap.data().next;
    const data = {
      createdBy: actorId,
      title: input.title.trim(),
      description: input.description.trim(),
      status: 'todo',
      assigneeId: input.assigneeId,
      projectId: input.projectId,
      completedBy: null,
      completedAt: null,
      number,
      subtasks: [],
      priority: input.priority,
      dueDate: input.dueDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: actorId,
      rev: 1,
    };
    // Si dos personas crean a la vez, Firestore reintenta la transacción y el número no se repite.
    tx.update(counter, { next: number + 1 });
    tx.set(ref, data);
    tx.set(auditRef(db, 'task', ref.id, 1), auditEntry({ type: 'task', id: ref.id, rev: 1, action: 'create', actorId, before: null, after: data }));
  });
  return ref.id;
}
```

(Quitar `writeBatch` del import si queda sin uso.) En `cleanPatch`, recortar también los títulos de subtareas: `if (cleaned.subtasks !== undefined) cleaned.subtasks = cleaned.subtasks.map((s) => ({ ...s, title: s.title.trim() }));`.

`src/services/tasks.service.ts`, `toTask`: `number: data.number ?? 0,` y `subtasks: data.subtasks ?? [],`.

- [ ] **Step 6: Migración**

`migrateTask.ts`: firma `migrateTask(doc: RawTask, nextNumber: number): Migration`; `CURRENT_FIELDS` suma `'number', 'subtasks'`; en `data`: `number: typeof rest.number === 'number' ? rest.number : nextNumber,` y `subtasks: rest.subtasks ?? [],`. Actualizar el comentario: "Convierte una tarea de formatos anteriores al actual."

`scripts/migrate-tasks.mjs`, reemplazar el bucle por:

```js
// Orden de creación: así los números siguen el orden en que se crearon las tareas.
const docs = (await db.collection('tasks').get()).docs.sort(
  (a, b) => (a.data().createdAt?.toMillis?.() ?? 0) - (b.data().createdAt?.toMillis?.() ?? 0),
);
const counterRef = db.doc('counters/tasks');
const counterSnap = await counterRef.get();
const highest = Math.max(0, ...docs.map((d) => (typeof d.data().number === 'number' ? d.data().number : 0)));
let next = Math.max(counterSnap.exists ? counterSnap.data().next : 1, highest + 1);

for (const snap of docs) {
  const before = snap.data();
  const result = migrateTask(before, next);
  if (!result) {
    skipped++;
    continue;
  }
  if (result.data.number === next) next++;
  // (resto igual: batch con la tarea y su auditoría)
}

await counterRef.set({ next });
```

y el mensaje final suma `` · próximo número: ${next} ``.

- [ ] **Step 7: Verificar, publicar y migrar**

Run: `npm run test:rules && npm test && npm run build && npm run lint`. Publicar reglas en `matecode-tasks-dev` (script temporal) y correr `npm run migrate-tasks` dos veces (la segunda: 0 migradas, mismo "próximo número").

- [ ] **Step 8: Commit**

```bash
git add firestore.rules scripts src tests
git commit -m "feat(v2): número de tarea con contador y subtareas en los datos"
```

---

### Task 2: Subtareas y proyecto en el historial

**Files:**
- Create: `src/features/tasks/subtasks.ts`
- Modify: `src/features/audit/describeChange.ts`, `src/components/tasks/TaskHistory.tsx`
- Test: `tests/unit/subtasks.test.ts`, `tests/unit/describeChange.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const MAX_SUBTASKS = 20;
  export function subtaskProgress(subtasks: readonly Subtask[]): { done: number; total: number; percent: number };
  export function newSubtask(title: string): Subtask;   // id con crypto.randomUUID()
  export type ProjectNameOf = (id: string | null) => string | null;
  export function describeChange(entry: AuditEntry, nameOf: NameOf, projectNameOf?: ProjectNameOf): string[];
  // TaskHistory: prop opcional projectNameOf
  ```

- [ ] **Step 1: Tests que fallan**

```ts
// tests/unit/subtasks.test.ts
import { describe, expect, it } from 'vitest';
import { newSubtask, subtaskProgress } from '@/features/tasks/subtasks';

describe('subtaskProgress', () => {
  it('cuenta las hechas', () => {
    expect(subtaskProgress([
      { id: 'a', title: 'A', done: true }, { id: 'b', title: 'B', done: true }, { id: 'c', title: 'C', done: false },
    ])).toEqual({ done: 2, total: 3, percent: 67 });
  });
  it('sin subtareas: 0 de 0', () => {
    expect(subtaskProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe('newSubtask', () => {
  it('crea una subtarea sin hacer, con id único y título recortado', () => {
    const a = newSubtask('  Revisar  ');
    const b = newSubtask('Otra');
    expect(a).toMatchObject({ title: 'Revisar', done: false });
    expect(a.id).not.toBe(b.id);
  });
});
```

Agregar a `tests/unit/describeChange.test.ts`:

```ts
  describe('proyecto y subtareas', () => {
    const projectNameOf = (id: string | null) => (id === 'p1' ? 'Portal' : null);
    const sub = (id: string, title: string, done = false) => ({ id, title, done });

    it('mover a un proyecto y quitarlo', () => {
      expect(describeChange(entry({ before: { ...base, projectId: null }, after: { ...base, projectId: 'p1' } }), nameOf, projectNameOf))
        .toEqual(['Ana movió la tarea a «Portal»']);
      expect(describeChange(entry({ before: { ...base, projectId: 'p1' }, after: { ...base, projectId: null } }), nameOf, projectNameOf))
        .toEqual(['Ana quitó la tarea del proyecto']);
    });

    it('agregar, completar, reabrir y quitar subtareas', () => {
      const before = { ...base, subtasks: [sub('a', 'Revisar'), sub('b', 'Probar', true), sub('c', 'Viejo')] };
      const after = { ...base, subtasks: [sub('a', 'Revisar', true), sub('b', 'Probar'), sub('d', 'Nuevo')] };
      expect(describeChange(entry({ before, after }), nameOf)).toEqual([
        'Ana completó la subtarea «Revisar»',
        'Ana reabrió la subtarea «Probar»',
        'Ana quitó la subtarea «Viejo»',
        'Ana agregó la subtarea «Nuevo»',
      ]);
    });
  });
```

- [ ] **Step 2: Correr y ver que fallan** → FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/features/tasks/subtasks.ts
import type { Subtask } from '@/types/task';

export const MAX_SUBTASKS = 20;
export const SUBTASK_TITLE_MAX = 120;

export function subtaskProgress(subtasks: readonly Subtask[]): { done: number; total: number; percent: number } {
  const done = subtasks.filter((s) => s.done).length;
  return { done, total: subtasks.length, percent: subtasks.length === 0 ? 0 : Math.round((done / subtasks.length) * 100) };
}

export function newSubtask(title: string): Subtask {
  return { id: crypto.randomUUID(), title: title.trim(), done: false };
}
```

`describeChange.ts`:
- Import `type { Subtask }` de `@/types/task`.
- `export type ProjectNameOf = (id: string | null) => string | null;`
- `describeChange(entry, nameOf, projectNameOf: ProjectNameOf = () => null)`; pasar `projectNameOf` a `sentence`, que pasa a devolver `string[]` (por las subtareas) y se usa con `flatMap`.
- Casos nuevos en `sentence`:

```ts
    case 'projectId':
      return [to ? `${who} movió la tarea a «${projectNameOf(String(to)) ?? 'otro proyecto'}»` : `${who} quitó la tarea del proyecto`];
    case 'subtasks':
      return subtaskSentences(who, (from ?? []) as Subtask[], (to ?? []) as Subtask[]);
```

  (los demás casos devuelven `[frase]` y `default` devuelve `[]`).
- Agregar:

```ts
/** Una frase por subtarea que cambió: completada, reabierta, quitada o agregada (en ese orden). */
function subtaskSentences(who: string, before: Subtask[], after: Subtask[]): string[] {
  const old = new Map(before.map((s) => [s.id, s]));
  const now = new Map(after.map((s) => [s.id, s]));
  const toggled = after.flatMap((s) => {
    const prev = old.get(s.id);
    if (!prev || prev.done === s.done) return [];
    return [`${who} ${s.done ? 'completó' : 'reabrió'} la subtarea «${s.title}»`];
  });
  const removed = before.filter((s) => !now.has(s.id)).map((s) => `${who} quitó la subtarea «${s.title}»`);
  const added = after.filter((s) => !old.has(s.id)).map((s) => `${who} agregó la subtarea «${s.title}»`);
  return [...toggled, ...removed, ...added];
}
```

`TaskHistory.tsx`: prop opcional `projectNameOf?: ProjectNameOf` pasada a `describeChange`.

- [ ] **Step 4: Verificar y commit**

```bash
git add src/features tests/unit src/components/tasks/TaskHistory.tsx
git commit -m "feat(v2): subtareas y proyecto en las frases del historial"
```

---

### Task 3: Búsqueda y filtros

**Files:**
- Create: `src/features/tasks/searchTasks.ts`
- Modify: `src/components/tasks/TaskWorkspace.tsx` (+ `.module.css`)
- Test: `tests/unit/searchTasks.test.ts`, `tests/components/TaskWorkspace.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type PriorityFilter = Priority | 'all';
  export type ProjectFilter = string | 'all' | 'none';
  export function searchTasks(tasks: readonly Task[], query: string): Task[];
  export function filterByPriority(tasks: readonly Task[], priority: PriorityFilter): Task[];
  export function filterByProject(tasks: readonly Task[], project: ProjectFilter): Task[];
  ```

- [ ] **Step 1: Tests que fallan**

```ts
// tests/unit/searchTasks.test.ts
import { describe, expect, it } from 'vitest';
import { filterByPriority, filterByProject, searchTasks } from '@/features/tasks/searchTasks';
import type { Task } from '@/types/task';

const task = (number: number, title: string, extra: Partial<Task> = {}): Task => ({
  id: String(number), createdBy: 'x', updatedBy: 'x', rev: 1, title, description: '', status: 'todo', assigneeId: null,
  completedBy: null, completedAt: null, projectId: null, number, subtasks: [], priority: 'media', dueDate: null, createdAt: 1,
  ...extra,
});
const tasks = [
  task(108, 'Revisión de seguridad', { description: 'Cabeceras del login', priority: 'alta', projectId: 'p1' }),
  task(109, 'Plantilla de bienvenida', { priority: 'baja' }),
];
const ids = (list: Task[]) => list.map((t) => t.number);

describe('searchTasks', () => {
  it('sin texto devuelve todas', () => {
    expect(ids(searchTasks(tasks, '  '))).toEqual([108, 109]);
  });
  it('por título sin mayúsculas ni tildes', () => {
    expect(ids(searchTasks(tasks, 'REVISION'))).toEqual([108]);
  });
  it('por descripción', () => {
    expect(ids(searchTasks(tasks, 'login'))).toEqual([108]);
  });
  it('por número con o sin prefijo', () => {
    expect(ids(searchTasks(tasks, 'mc-109'))).toEqual([109]);
    expect(ids(searchTasks(tasks, '108'))).toEqual([108]);
  });
});

describe('filtros', () => {
  it('por prioridad', () => {
    expect(ids(filterByPriority(tasks, 'alta'))).toEqual([108]);
    expect(ids(filterByPriority(tasks, 'all'))).toEqual([108, 109]);
  });
  it('por proyecto, incluido "sin proyecto"', () => {
    expect(ids(filterByProject(tasks, 'p1'))).toEqual([108]);
    expect(ids(filterByProject(tasks, 'none'))).toEqual([109]);
    expect(ids(filterByProject(tasks, 'all'))).toEqual([108, 109]);
  });
});
```

Agregar a `tests/components/TaskWorkspace.test.tsx` (los `task(...)` del archivo deben tener `number` distinto: usar `number: Number(id)`):

```tsx
  it('busca por texto y filtra por prioridad', async () => {
    state.tasks = [{ ...task('1', null), title: 'Llamar proveedor', priority: 'alta' }, { ...task('2', null), title: 'Pagar luz', priority: 'baja' }];
    render(<TaskWorkspace profile={me} renderHeader={() => null} />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar tareas' }), 'pagar');
    expect(screen.queryByText('Llamar proveedor')).not.toBeInTheDocument();
    expect(screen.getByText('Pagar luz')).toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar tareas' }));
    await userEvent.selectOptions(screen.getByLabelText('Prioridad'), 'alta');
    expect(screen.getByText('Llamar proveedor')).toBeInTheDocument();
    expect(screen.queryByText('Pagar luz')).not.toBeInTheDocument();
  });

  it('dentro de un proyecto no muestra el filtro de proyecto', () => {
    state.tasks = [task('1', 'p1')];
    render(<TaskWorkspace profile={me} projectId="p1" renderHeader={() => null} />);
    expect(screen.queryByLabelText('Proyecto')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Correr y ver que fallan** → FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/features/tasks/searchTasks.ts
import type { Priority, Task } from '@/types/task';
import { formatTaskNumber } from './taskNumber';

export type PriorityFilter = Priority | 'all';
/** Un id de proyecto, 'all' (todos) o 'none' (sin proyecto). */
export type ProjectFilter = string;

/** Minúsculas y sin tildes: "Revisión" y "revision" coinciden. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function searchTasks(tasks: readonly Task[], query: string): Task[] {
  const q = normalize(query);
  if (!q) return [...tasks];
  return tasks.filter((t) =>
    normalize(t.title).includes(q)
    || normalize(t.description).includes(q)
    || normalize(formatTaskNumber(t.number)) === q
    || String(t.number) === q,
  );
}

export function filterByPriority(tasks: readonly Task[], priority: PriorityFilter): Task[] {
  return priority === 'all' ? [...tasks] : tasks.filter((t) => t.priority === priority);
}

export function filterByProject(tasks: readonly Task[], project: ProjectFilter): Task[] {
  if (project === 'all') return [...tasks];
  if (project === 'none') return tasks.filter((t) => t.projectId === null);
  return tasks.filter((t) => t.projectId === project);
}
```

`TaskWorkspace.tsx`:
- Estado: `const [query, setQuery] = useState('');`, `const [priority, setPriority] = useState<PriorityFilter>('all');`, `const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');`.
- Cálculo: `const filtered = filterByProject(filterByPriority(searchTasks(scoped, query), priority), projectId ? 'all' : projectFilter);` y usar `filtered` para `countTasks` y `filterByCard` (las tarjetas cuentan lo que está a la vista).
- Arriba de la barra actual agregar:

```tsx
              <div className={styles.filters}>
                <label className="visually-hidden" htmlFor="task-search">Buscar tareas</label>
                <input
                  id="task-search" type="search" className={styles.search} value={query}
                  placeholder="Buscar por título, descripción o MC-…" onChange={(e) => setQuery(e.target.value)}
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
```

- `TaskWorkspace.module.css`: `.filters { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }` y `.search { flex: 1 1 260px; min-height: 36px; padding: 0 var(--space-3); border: 1px solid var(--color-border-strong); border-radius: var(--radius-md); background: var(--color-surface-default); }`.
- Mensaje de lista vacía: si `query` no está vacío → `{ emptyTitle: 'No encontramos tareas', emptyHint: 'Prueba con otras palabras o con el número (MC-…).' }` (antes que los demás casos).

- [ ] **Step 4: Verificar y commit**

```bash
git add src/features/tasks/searchTasks.ts src/components/tasks/TaskWorkspace.* tests
git commit -m "feat(v2): buscador y filtros de prioridad y proyecto"
```

---

### Task 4: Vista Tabla y número visible

**Files:**
- Create: `src/components/tasks/TaskTable.tsx` (+ `.module.css`)
- Modify: `src/types/task.ts` (`TaskView`), `src/components/tasks/TaskBoard.tsx` (quitar `TaskView`), `TodoItem.tsx`, `TaskWorkspace.tsx`
- Test: `tests/components/TaskTable.test.tsx`, `tests/components/TodoList.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type TaskView = 'list' | 'table' | 'board';   // ahora en src/types/task.ts
  export function TaskTable(p: {
    tasks: Task[]; nameOf: NameOf; personOf: PersonOf; projectOf: ProjectOf; canEdit: boolean;
    onStatusChange: (id: string, s: TaskStatus) => void; onOpen: (task: Task) => void;
  }): JSX.Element;
  ```

- [ ] **Step 1: Tests que fallan**

```tsx
// tests/components/TaskTable.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskTable } from '@/components/tasks/TaskTable';
import type { Task } from '@/types/task';

const portal = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'a', startDate: '2026-10-01', endDate: '2026-11-30',
  archived: false, createdBy: 'a', createdAt: 1, rev: 1,
};
const task: Task = {
  id: 't', createdBy: 'a', updatedBy: 'a', rev: 1, title: 'Revisar login', description: 'Cabeceras', status: 'doing',
  assigneeId: 'ana', completedBy: null, completedAt: null, projectId: 'p1', number: 108,
  subtasks: [{ id: 's1', title: 'A', done: true }, { id: 's2', title: 'B', done: false }], priority: 'alta', dueDate: null, createdAt: 1,
};

function setup() {
  const handlers = { onStatusChange: vi.fn(), onOpen: vi.fn() };
  render(
    <TaskTable
      tasks={[task]} nameOf={(uid) => (uid === 'ana' ? 'Ana' : null)} personOf={() => null}
      projectOf={(id) => (id === 'p1' ? portal : null)} canEdit {...handlers}
    />,
  );
  return handlers;
}

describe('TaskTable', () => {
  it('muestra las columnas con datos reales', () => {
    setup();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['#', 'Tarea', 'Prioridad y proyecto', 'Vence', 'Asignado', 'Estado']);
    const row = screen.getByRole('row', { name: /Revisar login/ });
    expect(within(row).getByText('MC-108')).toBeInTheDocument();
    expect(within(row).getByText('Cabeceras')).toBeInTheDocument();
    expect(within(row).getByText('☑ 1 de 2')).toBeInTheDocument();
    expect(within(row).getByText('Alta')).toBeInTheDocument();
    expect(within(row).getByText('Portal')).toBeInTheDocument();
    expect(within(row).getByText('Sin fecha')).toBeInTheDocument();
    expect(within(row).getByText('Ana')).toBeInTheDocument();
  });

  it('abre el panel y cambia el estado', async () => {
    const { onOpen, onStatusChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Revisar login' }));
    expect(onOpen).toHaveBeenCalledWith(task);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Estado de "Revisar login"' }), 'done');
    expect(onStatusChange).toHaveBeenCalledWith('t', 'done');
  });
});
```

En `tests/components/TodoList.test.tsx` agregar:

```tsx
  it('muestra el número y el avance de subtareas', () => {
    setup([{ ...tasks[0], number: 42, subtasks: [{ id: 'a', title: 'A', done: true }, { id: 'b', title: 'B', done: false }] }]);
    expect(screen.getByText('MC-42')).toBeInTheDocument();
    expect(screen.getByText('☑ 1 de 2')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Correr y ver que fallan** → FAIL.

- [ ] **Step 3: Implementar**

`src/types/task.ts`: `export type TaskView = 'list' | 'table' | 'board';` (y en `TaskBoard.tsx` quitar su `TaskView`; `TaskWorkspace` lo importa de `@/types/task`).

```tsx
// src/components/tasks/TaskTable.tsx
import { Avatar } from '@/components/layout/Avatar';
import { ProjectTag } from '@/components/projects/ProjectTag';
import type { ProjectOf } from '@/features/projects/projectOf';
import { subtaskProgress } from '@/features/tasks/subtasks';
import { formatTaskNumber } from '@/features/tasks/taskNumber';
import type { NameOf, PersonOf } from '@/features/team/members';
import { PRIORITY_LABEL, type Task, type TaskStatus } from '@/types/task';
import { dueStatus, formatDueDate } from '@/utils/formatDate';
import { StatusSelect } from './StatusSelect';
import styles from './TaskTable.module.css';

type Props = {
  tasks: Task[];
  nameOf: NameOf;
  personOf: PersonOf;
  projectOf: ProjectOf;
  canEdit: boolean;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onOpen: (task: Task) => void;
};

/** Vista Tabla. En pantallas angostas cada fila se muestra como tarjeta (ver CSS). */
export function TaskTable({ tasks, nameOf, personOf, projectOf, canEdit, onStatusChange, onOpen }: Props) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">Tareas</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Tarea</th>
            <th scope="col">Prioridad y proyecto</th>
            <th scope="col">Vence</th>
            <th scope="col">Asignado</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const done = task.status === 'done';
            const project = projectOf(task.projectId);
            const person = personOf(task.assigneeId);
            const assignee = nameOf(task.assigneeId);
            const sub = subtaskProgress(task.subtasks);
            return (
              <tr key={task.id} className={done ? styles.done : undefined}>
                <td data-label="#" className={styles.number}>{formatTaskNumber(task.number)}</td>
                <td data-label="Tarea">
                  <button type="button" className={styles.title} onClick={() => onOpen(task)}>{task.title}</button>
                  {task.description && <p className={styles.description}>{task.description}</p>}
                  {sub.total > 0 && <p className={styles.sub}>☑ {sub.done} de {sub.total}</p>}
                </td>
                <td data-label="Prioridad y proyecto">
                  <span className={`${styles.badge} ${styles[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
                  {project && <div className={styles.project}><ProjectTag project={project} /></div>}
                </td>
                <td data-label="Vence">
                  {task.dueDate && !done ? (
                    <span className={`${styles.due} ${styles[dueStatus(task.dueDate)]}`}>{formatDueDate(task.dueDate)}</span>
                  ) : (
                    <span className={styles.muted}>{done ? 'Hecha' : 'Sin fecha'}</span>
                  )}
                </td>
                <td data-label="Asignado">
                  <span className={styles.person}>
                    <Avatar name={assignee ?? ''} photo={person?.photo} inactive={person ? !person.active : false} />
                    <span>{assignee ?? 'Sin asignar'}</span>
                  </span>
                </td>
                <td data-label="Estado">
                  <StatusSelect status={task.status} taskTitle={task.title} canEdit={canEdit} onChange={(s) => onStatusChange(task.id, s)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

```css
/* src/components/tasks/TaskTable.module.css */
.wrap { background: var(--color-surface-default); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); overflow: hidden; }
.table { width: 100%; border-collapse: collapse; font-size: var(--text-lg); }
.table th {
  padding: var(--space-2) var(--space-3); text-align: left; background: var(--color-surface-subtle);
  font-size: var(--text-xs); font-weight: var(--weight-semibold); letter-spacing: 0.05em; text-transform: uppercase; color: var(--color-text-muted);
}
.table td { padding: var(--space-3); border-top: 1px solid var(--color-border-subtle); vertical-align: top; }
.number { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-muted); white-space: nowrap; }
.title { padding: 0; border: 0; background: none; font: inherit; font-weight: var(--weight-semibold); color: var(--color-text-primary); text-align: left; cursor: pointer; }
.title:hover { text-decoration: underline; }
.done .title { text-decoration: line-through; color: var(--color-text-muted); }
.description, .sub { margin-top: var(--space-1); font-size: var(--text-md); color: var(--color-text-secondary); }
.badge { padding: 2px var(--space-2); border: 1px solid; border-radius: var(--radius-pill); font-size: var(--text-xs); font-weight: var(--weight-medium); }
.alta { color: var(--color-status-danger); background: var(--color-status-danger-surface); border-color: var(--color-status-danger-border); }
.media { color: var(--color-status-warning); background: var(--color-status-warning-surface); border-color: var(--color-status-warning-border); }
.baja { color: var(--color-status-neutral); background: var(--color-status-neutral-surface); border-color: var(--color-status-neutral-border); }
.project { margin-top: var(--space-1); }
.due { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-secondary); white-space: nowrap; }
.overdue { color: var(--color-status-danger); }
.today { color: var(--color-status-warning); font-weight: var(--weight-medium); }
.muted { font-size: var(--text-md); color: var(--color-text-muted); }
.person { display: inline-flex; align-items: center; gap: var(--space-2); }

/* Celular: cada fila es una tarjeta con la etiqueta de cada dato */
@media (max-width: 767px) {
  .table thead { display: none; }
  .table, .table tbody, .table tr, .table td { display: block; width: 100%; }
  .table tr { padding: var(--space-3); border-top: 1px solid var(--color-border-default); }
  .table td { padding: var(--space-1) 0; border: 0; }
  .table td::before {
    content: attr(data-label); display: block; font-size: var(--text-xs); font-weight: var(--weight-semibold);
    text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted);
  }
}
```

`TodoItem.tsx`: en `.meta`, antes de la prioridad, `<span className={styles.number}>{formatTaskNumber(task.number)}</span>`, y si `task.subtasks.length > 0` agregar `<span className={styles.sub}>☑ {sub.done} de {sub.total}</span>` (con `const sub = subtaskProgress(task.subtasks);`). CSS: `.number { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-muted); }` y `.sub { font-size: var(--text-sm); color: var(--color-text-secondary); }`. `TaskBoard.tsx`: mismo número arriba del título de cada tarjeta.

`TaskWorkspace.tsx`:
- `usePreference<TaskView>('matecode.view', 'list', ['list', 'table', 'board'])`.
- Opciones de vista: `[{ value: 'list', label: 'Lista', icon: List }, { value: 'table', label: 'Tabla', icon: Table2 }, { value: 'board', label: 'Tablero', icon: LayoutGrid }]` (import `Table2`).
- Render: `view === 'board' ? <TaskBoard…/> : view === 'table' ? (visibleTasks.length ? <TaskTable tasks={visibleTasks} nameOf={nameOf} personOf={personOf} projectOf={projectOf} canEdit={canEdit} onStatusChange={…} onOpen={(task) => setOpenId(task.id)} /> : <TodoList tasks={[]} …mismos mensajes vacíos…/>) : <TodoList…/>`.

- [ ] **Step 4: Verificar y commit**

```bash
git add src tests
git commit -m "feat(v2): vista tabla y número de tarea visible"
```

---

### Task 5: Panel de detalle editable

**Files:**
- Modify: `src/components/tasks/TaskDetailPanel.tsx` (+ `.module.css`), `src/components/ui/Modal.tsx`, `src/components/tasks/TaskWorkspace.tsx`
- Test: `tests/components/TaskDetailPanel.test.tsx` (reescrito)

**Interfaces:**
- Consumes: `newSubtask`, `subtaskProgress`, `MAX_SUBTASKS`, `SUBTASK_TITLE_MAX` (T2); `formatTaskNumber` (T1); `validateTask` (utils); `AssigneeOption`, `Project`.
- Produces:
  ```ts
  type Props = {
    task: Task; nameOf: NameOf; projectOf: ProjectOf;
    assignees: AssigneeOption[]; projects: Project[];
    canEdit: boolean; canDelete: boolean;
    onClose: () => void;
    onSave: (patch: TaskPatch) => Promise<void>;
    onDelete: (id: string) => void;
  };
  export function changedFields(task: Task, draft: Draft): TaskPatch; // exportada para tests
  ```

- [ ] **Step 1: Test que falla** (reemplaza el archivo)

```tsx
// tests/components/TaskDetailPanel.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/tasks/TaskHistory', () => ({ TaskHistory: () => <ol><li>Ana creó la tarea</li></ol> }));

import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import type { Task } from '@/types/task';

const task: Task = {
  id: 't', createdBy: 'luis', updatedBy: 'ana', rev: 3, title: 'Revisar factura', description: 'Del proveedor',
  status: 'doing', assigneeId: 'ana', completedBy: null, completedAt: null, projectId: null, number: 108,
  subtasks: [{ id: 's1', title: 'Validar', done: true }, { id: 's2', title: 'Probar', done: false }],
  priority: 'alta', dueDate: '2026-10-20', createdAt: new Date(2026, 9, 3).getTime(),
};
const names: Record<string, string> = { ana: 'Ana', luis: 'Luis' };
const nameOf = (uid: string | null) => (uid ? names[uid] ?? null : null);

function setup(perms = { canEdit: true, canDelete: true }) {
  const handlers = { onClose: vi.fn(), onSave: vi.fn().mockResolvedValue(undefined), onDelete: vi.fn() };
  render(
    <TaskDetailPanel
      task={task} nameOf={nameOf} projectOf={() => null}
      assignees={[{ uid: 'ana', label: 'Ana' }, { uid: 'luis', label: 'Luis' }]} projects={[]}
      {...perms} {...handlers}
    />,
  );
  return handlers;
}

describe('TaskDetailPanel', () => {
  it('muestra número, datos, subtareas con su avance e historial', () => {
    setup();
    expect(screen.getByText('MC-108')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Revisar factura');
    expect(screen.getByLabelText('Estado')).toHaveValue('doing');
    expect(screen.getByText('Subtareas (1 de 2)')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Validar' })).toBeChecked();
    expect(screen.getByText('Ana creó la tarea')).toBeInTheDocument();
  });

  it('guarda solo lo que cambió, en una sola escritura', async () => {
    const { onSave } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'done');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Probar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith({
      status: 'done',
      subtasks: [{ id: 's1', title: 'Validar', done: true }, { id: 's2', title: 'Probar', done: true }],
    });
  });

  it('agrega y quita subtareas', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText('Nueva subtarea'), 'Enviar informe{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Quitar la subtarea «Validar»' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    const saved = onSave.mock.calls[0][0].subtasks.map((s: { title: string }) => s.title);
    expect(saved).toEqual(['Probar', 'Enviar informe']);
  });

  it('pregunta antes de descartar cambios', async () => {
    const { onClose } = setup();
    await userEvent.clear(screen.getByLabelText('Título'));
    await userEvent.type(screen.getByLabelText('Título'), 'Otro título');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('¿Descartar los cambios?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('sin cambios cierra directo', async () => {
    const { onClose } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('no guarda un título vacío', async () => {
    const { onSave } = setup();
    await userEvent.clear(screen.getByLabelText('Título'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('eliminar pide confirmación', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Confirmar eliminación' })).getByRole('button', { name: 'Sí, eliminar' }));
    expect(onDelete).toHaveBeenCalledWith('t');
  });

  it('un lector ve todo deshabilitado y sin botones de guardar ni eliminar', () => {
    setup({ canEdit: false, canDelete: false });
    expect(screen.getByLabelText('Título')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Validar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr y ver que falla** → FAIL.

- [ ] **Step 3: Modal: Escape delega en `onClose`**

En `Modal.tsx`, sobre el `<dialog>` agregar:

```tsx
      onCancel={(event) => {
        // Escape: en vez de que el navegador cierre el diálogo, decide quien lo usa (p. ej. preguntar si hay cambios).
        event.preventDefault();
        onClose();
      }}
```

- [ ] **Step 4: Panel**

```tsx
// src/components/tasks/TaskDetailPanel.tsx
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { ProjectOf } from '@/features/projects/projectOf';
import { MAX_SUBTASKS, newSubtask, SUBTASK_TITLE_MAX, subtaskProgress } from '@/features/tasks/subtasks';
import { formatTaskNumber } from '@/features/tasks/taskNumber';
import type { AssigneeOption, NameOf } from '@/features/team/members';
import type { Project } from '@/types/project';
import {
  PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL,
  type Priority, type Subtask, type Task, type TaskPatch, type TaskStatus,
} from '@/types/task';
import { formatDay } from '@/utils/formatDate';
import { validateTask } from '@/utils/validators';
import styles from './TaskDetailPanel.module.css';
import { TaskHistory } from './TaskHistory';

type Draft = Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'assigneeId' | 'projectId' | 'subtasks'>;

const FIELDS: (keyof Draft)[] = ['title', 'description', 'status', 'priority', 'dueDate', 'assigneeId', 'projectId', 'subtasks'];

function toDraft(task: Task): Draft {
  return {
    title: task.title, description: task.description, status: task.status, priority: task.priority,
    dueDate: task.dueDate, assigneeId: task.assigneeId, projectId: task.projectId, subtasks: task.subtasks,
  };
}

/** Solo los campos que cambiaron respecto de la tarea guardada. */
// eslint-disable-next-line react/only-export-components -- helper puro del panel, probado por separado
export function changedFields(task: Task, draft: Draft): TaskPatch {
  const before = toDraft(task);
  const patch: Record<string, unknown> = {};
  for (const field of FIELDS) {
    if (JSON.stringify(before[field]) !== JSON.stringify(draft[field])) patch[field] = draft[field];
  }
  return patch as TaskPatch;
}

type Props = {
  task: Task;
  nameOf: NameOf;
  projectOf: ProjectOf;
  assignees: AssigneeOption[];
  projects: Project[];
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSave: (patch: TaskPatch) => Promise<void>;
  onDelete: (id: string) => void;
};

/** Todo sobre una tarea, editable en el lugar: se guarda junto con "Guardar cambios". */
export function TaskDetailPanel({ task, nameOf, projectOf, assignees, projects, canEdit, canDelete, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(task));
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | null>(null);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const patch = changedFields(task, draft);
  const dirty = Object.keys(patch).length > 0;
  const progress = subtaskProgress(draft.subtasks);
  const projectName = (id: string | null) => projectOf(id)?.name ?? null;

  function requestClose() {
    if (dirty) setConfirm('discard');
    else onClose();
  }

  function updateSubtask(id: string, change: Partial<Subtask>) {
    set({ subtasks: draft.subtasks.map((s) => (s.id === id ? { ...s, ...change } : s)) });
  }

  function addSubtask() {
    const title = newTitle.trim();
    if (!title || draft.subtasks.length >= MAX_SUBTASKS) return;
    set({ subtasks: [...draft.subtasks, newSubtask(title)] });
    setNewTitle('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const errors = validateTask({ title: draft.title, description: draft.description });
    const problem = errors.title ?? errors.description ?? null;
    setError(problem);
    if (problem || !dirty) return;
    setSaving(true);
    try {
      await onSave(patch);
    } catch (err) {
      console.error('Error al guardar la tarea:', err);
      setError('No pudimos guardar los cambios. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={task.title} onClose={requestClose} variant="panel">
      <form className={styles.body} onSubmit={save} noValidate>
        <p className={styles.meta}>
          <span className={styles.number}>{formatTaskNumber(task.number)}</span>
          Creada por {nameOf(task.createdBy) ?? 'alguien'} · {formatDay(task.createdAt)}
          {task.completedAt !== null && ` · Hecha por ${nameOf(task.completedBy) ?? 'alguien'} · ${formatDay(task.completedAt)}`}
        </p>
        {error && <Alert kind="error">{error}</Alert>}

        <fieldset className={styles.fields} disabled={!canEdit}>
          <legend className="visually-hidden">Datos de la tarea</legend>
          <Field id="panel-title" label="Título">
            <input id="panel-title" className={fieldInputClass} maxLength={80} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <div className={styles.grid}>
            <Field id="panel-status" label="Estado">
              <select id="panel-status" className={fieldInputClass} value={draft.status} onChange={(e) => set({ status: e.target.value as TaskStatus })}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field id="panel-priority" label="Prioridad">
              <select id="panel-priority" className={fieldInputClass} value={draft.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </Field>
            <Field id="panel-due" label="Vence">
              <input id="panel-due" type="date" className={fieldInputClass} value={draft.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value || null })} />
            </Field>
            <Field id="panel-project" label="Proyecto">
              <select id="panel-project" className={fieldInputClass} value={draft.projectId ?? ''} onChange={(e) => set({ projectId: e.target.value || null })}>
                <option value="">Sin proyecto</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archived ? ' (archivado)' : ''}</option>)}
              </select>
            </Field>
          </div>
          <Field id="panel-assignee" label="Responsable">
            <select id="panel-assignee" className={fieldInputClass} value={draft.assigneeId ?? ''} onChange={(e) => set({ assigneeId: e.target.value || null })}>
              <option value="">Sin asignar</option>
              {assignees.map((a) => <option key={a.uid} value={a.uid}>{a.label}</option>)}
            </select>
          </Field>
          <Field id="panel-description" label="Descripción">
            <textarea id="panel-description" className={fieldInputClass} maxLength={500} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>

          <section aria-labelledby="subtasks-title" className={styles.subtasks}>
            <h3 id="subtasks-title" className={styles.sectionTitle}>
              Subtareas ({progress.done} de {progress.total})
              {progress.total > 0 && <span className={styles.percent}>{progress.percent}%</span>}
            </h3>
            <ul className={styles.subList}>
              {draft.subtasks.map((s) => (
                <li key={s.id} className={styles.subItem}>
                  <label className={styles.subLabel}>
                    <input type="checkbox" checked={s.done} onChange={(e) => updateSubtask(s.id, { done: e.target.checked })} />
                    <span className={s.done ? styles.subDone : undefined}>{s.title}</span>
                  </label>
                  {canEdit && (
                    <button
                      type="button" className={styles.subRemove} aria-label={`Quitar la subtarea «${s.title}»`}
                      onClick={() => set({ subtasks: draft.subtasks.filter((x) => x.id !== s.id) })}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (draft.subtasks.length < MAX_SUBTASKS ? (
              <div className={styles.subAdd}>
                <label className="visually-hidden" htmlFor="panel-new-subtask">Nueva subtarea</label>
                <input
                  id="panel-new-subtask" className={fieldInputClass} maxLength={SUBTASK_TITLE_MAX} placeholder="+ Agregar subtarea"
                  value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                />
                <Button size="sm" variant="secondary" onClick={addSubtask}>Agregar</Button>
              </div>
            ) : (
              <p className={styles.hint}>Llegaste al máximo de {MAX_SUBTASKS} subtareas.</p>
            ))}
          </section>
        </fieldset>

        {confirm === 'discard' && (
          <div className={styles.confirm} role="group" aria-label="Confirmar descarte">
            <p>¿Descartar los cambios?</p>
            <div className={styles.actions}>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Seguir editando</Button>
              <Button size="sm" variant="danger" onClick={onClose}>Descartar</Button>
            </div>
          </div>
        )}
        {confirm === 'delete' && (
          <div className={styles.confirm} role="group" aria-label="Confirmar eliminación">
            <p>¿Eliminar esta tarea? No se puede deshacer.</p>
            <div className={styles.actions}>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(task.id)}>Sí, eliminar</Button>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          {canDelete && <Button size="sm" variant="ghost" className={styles.delete} onClick={() => setConfirm('delete')}>Eliminar</Button>}
          <div className={styles.actions}>
            <Button size="sm" variant="ghost" onClick={requestClose}>Cerrar</Button>
            {canEdit && <Button size="sm" type="submit" loading={saving} disabled={!dirty}>Guardar cambios</Button>}
          </div>
        </div>

        <section aria-labelledby="history-title" className={styles.history}>
          <h3 id="history-title" className={styles.sectionTitle}>Historial</h3>
          <TaskHistory key={task.id} taskId={task.id} nameOf={nameOf} projectNameOf={projectName} />
        </section>
      </form>
    </Modal>
  );
}
```

> El botón "×" del `Modal` también llama `requestClose`, porque el panel le pasa ese `onClose`. Hay dos controles "Cerrar" (la × con `aria-label="Cerrar"` y el botón del pie): en el test se usa el primero con `getAllByRole('button', { name: 'Cerrar' })[0]` si `getByRole` encuentra dos; ajustar el test a `getAllByRole(...)[0]`.

```css
/* src/components/tasks/TaskDetailPanel.module.css */
.body { display: flex; flex-direction: column; gap: var(--space-4); }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); font-size: var(--text-md); color: var(--color-text-secondary); }
.number { padding: 1px var(--space-2); border-radius: var(--radius-sm); background: var(--color-status-info-surface); color: var(--color-status-info); font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--weight-semibold); }
.fields { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-surface-subtle); }
.subtasks { display: flex; flex-direction: column; gap: var(--space-2); }
.sectionTitle { display: flex; justify-content: space-between; font-size: var(--text-sm); font-weight: var(--weight-semibold); letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-muted); }
.percent { color: var(--color-status-info); }
.subList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.subItem { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); border-radius: var(--radius-sm); background: var(--color-surface-subtle); }
.subLabel { flex: 1; display: flex; align-items: center; gap: var(--space-2); cursor: pointer; }
.subDone { text-decoration: line-through; color: var(--color-text-muted); }
.subRemove { border: 0; background: none; font-size: var(--text-3xl); line-height: 1; color: var(--color-text-secondary); cursor: pointer; }
.subAdd { display: flex; gap: var(--space-2); }
.hint { font-size: var(--text-md); color: var(--color-text-secondary); }
.confirm { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-status-warning-surface); }
.footer { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); padding-top: var(--space-3); border-top: 1px solid var(--color-border-default); }
.actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-2); margin-left: auto; }
.delete { color: var(--color-status-danger); }
.history { border-top: 1px solid var(--color-border-default); padding-top: var(--space-4); }
```

- [ ] **Step 5: Conectar en TaskWorkspace**

- Quitar el estado `editing`, `handleEdit` y el `Modal` de "Editar tarea".
- El panel pasa a:

```tsx
      {openTask && (
        <TaskDetailPanel
          key={openTask.id}
          task={openTask}
          nameOf={nameOf}
          projectOf={projectOf}
          assignees={assigneeOptions(members, openTask.assigneeId)}
          projects={projects.filter((p) => !p.archived || p.id === openTask.projectId)}
          canEdit={canEdit}
          canDelete={can(profile, 'task:delete', { createdBy: openTask.createdBy })}
          onClose={() => setOpenId(null)}
          onSave={async (patch) => {
            await update(openTask.id, patch);
            setToast({ kind: 'success', message: 'Cambios guardados.' });
          }}
          onDelete={(id) => {
            setOpenId(null);
            void safely(() => remove(id), 'Tarea eliminada.');
          }}
        />
      )}
```

- `useTasks.update` acepta `TaskPatch` (ya lo hace).

- [ ] **Step 6: Verificar y commit**

Run: `npm test && npm run build && npm run lint`. Probar: editar varios campos y guardar (una sola frase por campo en el historial), agregar/quitar/completar subtareas, Escape con cambios pregunta, lector solo lee.

```bash
git add src tests
git commit -m "feat(v2): panel de detalle editable con subtareas"
```

---

### Task 6: Preview y documentación

- [ ] Preview (`vercel --yes` + alias), producción 200, `npm run test:rules` en verde, push.
- [ ] Prueba de la usuaria: números MC- en lista, tabla, tablero y panel; buscar por "MC-…", por texto con y sin tildes; filtros de prioridad y proyecto; vista Tabla en computadora y celular; panel editable (guardar, descartar, subtareas, eliminar); lector.
- [ ] **README** (sección v2): etapa 5 lista (proyectos, tabla, número, subtareas, panel editable, búsqueda, contraste); contador y migración; cantidad de tests.
- [ ] **AI_LOG**: entrada "v2 — Etapa 5" (incluye el mockup de la usuaria y qué se descartó por no tener datos reales; el hallazgo del contraste con la letra negra; "Qué aprendí" pendiente para la usuaria).
- [ ] Commit `docs(v2): proyectos y tareas en tabla en README y AI_LOG` y push.

---

## Autorrevisión del plan

- **Cobertura del spec (5B):** número con contador y reglas (T1), subtareas con límite (T1) y en el historial junto con el proyecto (T2), búsqueda y filtros de prioridad y proyecto (T3), vista Tabla con tarjetas en celular y número visible (T4), panel editable con guardar/descartar/eliminar (T5), migración con números (T1), README y AI_LOG (T6).
- **Ajustes respecto al spec:** las tarjetas de números cuentan lo que queda tras buscar y filtrar (así coinciden con la lista). En el panel, el estado se edita como los demás campos y se guarda con "Guardar cambios" (en lista, tabla y tablero el selector sigue guardando al instante).
- **Consistencia de nombres:** `Subtask`, `number`, `subtasks`, `formatTaskNumber`, `TASK_PREFIX`, `seedCounter`, `migrateTask(doc, nextNumber)`, `MAX_SUBTASKS`, `SUBTASK_TITLE_MAX`, `subtaskProgress`, `newSubtask`, `ProjectNameOf`, `describeChange(entry, nameOf, projectNameOf)`, `searchTasks`, `filterByPriority`, `filterByProject`, `PriorityFilter`, `ProjectFilter`, `TaskView`, `TaskTable`, `changedFields`, `TaskDetailPanel({ …, onSave })`.
