# v2 Etapa 5A — Proyectos y contraste: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proyectos con color, fechas, persona a cargo, progreso real, archivar y eliminar (solo admin), tareas asignables a un proyecto, y textos atenuados con contraste ≥ 4.5:1.

**Architecture:** Colección `projects` con reglas y auditoría (mismo patrón que `tasks`); `tasks.projectId` validado contra proyectos no archivados. La pantalla de tareas se extrae a `TaskWorkspace`, que Mis tareas y la página de cada proyecto reutilizan. Progreso y color de letra son funciones puras.

**Tech Stack:** React 19, React Router 8, Firebase 12, Vitest + RTL, emulador de Firestore.

**Spec:** `docs/specs/2026-10-12-v2-etapa5-proyectos-y-tabla-design.md` (parte 5A; la 5B tiene su propio plan)

## Global Constraints

- Contraste mínimo de texto: 4.5:1 sobre `#FFFFFF` y sobre el fondo verdoso `#F8FBF0` (`color-mix(brand-5 14%, white)`).
- `--color-text-muted` = `#636A65`. Placeholders usan `--color-text-muted`.
- Proyecto: nombre 1–80, descripción ≤ 500, color `#RRGGBB`, fechas `YYYY-MM-DD` con fin ≥ inicio, persona a cargo admin o miembro activo.
- Ver proyectos: activos. Crear, editar, archivar: admin y miembro. Eliminar: solo admin. Toda acción de archivar o eliminar pide confirmación.
- Eliminar un proyecto deja sus tareas con `projectId: null` (cada una auditada). Lotes de hasta 240 tareas.
- No se agregan tareas a proyectos archivados.
- Textos: "Proyectos", "+ Nuevo proyecto", "Activos", "Archivados", "Atrasado", "Sin proyecto", "N de M hechas", "A cargo".
- Producción no se toca; reglas y migración solo en `matecode-tasks-dev`.
- Cada tarea termina con `npm test`, `npm run build`, `npm run lint` (y `npm run test:rules` si toca reglas) en verde.
- Commits Conventional en español con trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/utils/color.ts` | Crear | `contrastRatio`, `readableTextColor` |
| `src/styles/tokens.css`, `src/styles/global.css` | Modificar | Texto atenuado y placeholders |
| `src/types/project.ts` | Crear | `Project`, `ProjectInput`, `ProjectPatch` |
| `src/types/task.ts`, `src/types/audit.ts` | Modificar | `projectId`; `EntityType` con `'project'` |
| `firestore.rules` | Modificar | `projects`, `projectId` en tareas, auditoría |
| `src/services/audited/projects.ts` | Crear | Escrituras auditadas de proyectos |
| `src/services/audited/tasks.ts` | Modificar | `projectId` al crear |
| `src/features/tasks/migrateTask.ts` | Modificar | Agrega `projectId: null` |
| `src/features/projects/projectProgress.ts` | Crear | Progreso y atraso |
| `src/services/projects.service.ts`, `src/hooks/useProjects.ts` | Crear | Proyectos en tiempo real + acciones |
| `src/components/projects/ProjectTag.tsx` | Crear | Etiqueta con el color del proyecto |
| `src/components/tasks/TodoForm.tsx`, `TodoItem.tsx`, `TaskBoard.tsx`, `TaskDetailPanel.tsx` | Modificar | Campo y etiqueta de proyecto |
| `src/components/tasks/TaskWorkspace.tsx` | Crear | Lo que hoy arma `TasksPage` |
| `src/pages/TasksPage.tsx` | Modificar | Encabezado + `TaskWorkspace` |
| `src/components/projects/ProjectCard.tsx`, `ProjectDialog.tsx`, `ColorPicker.tsx` | Crear | Tarjeta, ventana y selector |
| `src/pages/ProjectsPage.tsx`, `src/pages/ProjectPage.tsx` | Crear | Lista y página de proyecto |
| `src/features/navigation/navItems.ts`, `src/routes/AppRouter.tsx` | Modificar | Proyectos encendido y rutas |

---

### Task 1: Contraste accesible

**Files:**
- Create: `src/utils/color.ts`
- Modify: `src/styles/tokens.css`, `src/styles/global.css`
- Test: `tests/unit/color.test.ts`, `tests/unit/tokens.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function contrastRatio(a: string, b: string): number;       // hex '#RRGGBB'
  export function readableTextColor(background: string): '#FFFFFF' | '#1B2F4F';
  ```

- [ ] **Step 1: Tests que fallan**

```ts
// tests/unit/color.test.ts
import { describe, expect, it } from 'vitest';
import { contrastRatio, readableTextColor } from '@/utils/color';

describe('contrastRatio', () => {
  it('negro sobre blanco es 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });
  it('es simétrico', () => {
    expect(contrastRatio('#1B4079', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#1B4079'), 5);
  });
});

describe('readableTextColor', () => {
  it.each([
    ['#1B4079', '#FFFFFF'],
    ['#4D7C8A', '#FFFFFF'],
    ['#CBDF90', '#1B2F4F'],
    ['#8FAD88', '#1B2F4F'],
  ])('%s → %s', (bg, text) => {
    expect(readableTextColor(bg)).toBe(text);
  });
  it('siempre da al menos 4.5:1', () => {
    for (const bg of ['#FF0000', '#00FF00', '#0000FF', '#777777', '#FFD700', '#C2410C']) {
      expect(contrastRatio(readableTextColor(bg), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
```

Agregar a `tests/unit/tokens.test.ts` (import `contrastRatio` de `@/utils/color`):

```ts
describe('contraste de los textos', () => {
  const hex = (name: string) => tokens.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6});`))?.[1] ?? '';
  const BACKGROUNDS = ['#FFFFFF', '#F8FBF0']; // blanco y fondo verdoso (brand-5 al 14%)

  it('el texto atenuado usa un gris legible', () => {
    expect(tokens).toMatch(/--color-text-muted:\s*var\(--color-gray-550\);/);
  });

  it.each(['color-gray-550', 'color-gray-600', 'color-gray-900'])('%s tiene contraste ≥ 4.5:1', (name) => {
    for (const bg of BACKGROUNDS) expect(contrastRatio(hex(name), bg)).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run tests/unit/color.test.ts tests/unit/tokens.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/utils/color.ts
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(n.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG entre dos colores '#RRGGBB' (1 a 21). AA pide 4.5 para texto normal. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const LIGHT_TEXT = '#FFFFFF';
const DARK_TEXT = '#1B2F4F';

/** Letra blanca u oscura, la que mejor se lea sobre `background` (p. ej. el color de un proyecto). */
export function readableTextColor(background: string): '#FFFFFF' | '#1B2F4F' {
  return contrastRatio(LIGHT_TEXT, background) >= contrastRatio(DARK_TEXT, background) ? LIGHT_TEXT : DARK_TEXT;
}
```

En `tokens.css`, capa 1 después de `--color-gray-500`: `--color-gray-550: #636A65;` y en capa 2 `--color-text-muted: var(--color-gray-550);`.

En `global.css` agregar:

```css
::placeholder { color: var(--color-text-muted); opacity: 1; }
```

- [ ] **Step 4: Verificar y commit**

Run: `npx vitest run tests/unit/color.test.ts tests/unit/tokens.test.ts && npm test && npm run build && npm run lint`

```bash
git add src/utils/color.ts src/styles tests/unit/color.test.ts tests/unit/tokens.test.ts
git commit -m "fix(v2): contraste accesible en textos atenuados y placeholders"
```

---

### Task 2: Proyectos en Firestore (tipos, reglas, escrituras y migración)

**Files:**
- Create: `src/types/project.ts`, `src/services/audited/projects.ts`
- Modify: `src/types/task.ts`, `src/types/audit.ts`, `firestore.rules`, `src/services/audited/tasks.ts`, `src/services/tasks.service.ts`, `src/features/tasks/migrateTask.ts`, `src/components/tasks/TodoForm.tsx`, `src/pages/TasksPage.tsx`
- Test: `tests/rules/projects.rules.test.ts`, `tests/unit/migrateTask.test.ts`, fixtures de `Task`/`TaskInput` en tests

**Interfaces:**
- Produces:
  ```ts
  // src/types/project.ts
  export interface Project { id: string; name: string; description: string; color: string; ownerId: string;
    startDate: string; endDate: string; archived: boolean; createdBy: string; createdAt: number; rev: number; }
  export type ProjectInput = Pick<Project, 'name' | 'description' | 'color' | 'ownerId' | 'startDate' | 'endDate'>;
  export type ProjectPatch = Partial<ProjectInput & Pick<Project, 'archived'>>;
  // Task: projectId: string | null ; TaskInput suma 'projectId'
  // src/services/audited/projects.ts
  export function createProject(db: Firestore, actorId: string, input: ProjectInput): Promise<string>;
  export function updateProject(db: Firestore, actorId: string, id: string, patch: ProjectPatch): Promise<void>;
  export function deleteProject(db: Firestore, actorId: string, id: string): Promise<void>;
  ```

- [ ] **Step 1: Tests de reglas que fallan**

```ts
// tests/rules/projects.rules.test.ts
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createProject, deleteProject, updateProject } from '@/services/audited/projects';
import { createTask, updateTask } from '@/services/audited/tasks';
import { createEnv, dbAs, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const project = {
  name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', startDate: '2026-10-01', endDate: '2026-11-30',
};
const task = { title: 'T', description: '', priority: 'media' as const, dueDate: null, assigneeId: null, projectId: null };

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
});

describe('proyectos', () => {
  it('todos los activos los leen', async () => {
    await createProject(as('ana'), 'ana', project);
    await assertSucceeds(getDocs(collection(as('vera'), 'projects')));
  });

  it('miembro crea, edita y archiva; lector no', async () => {
    const id = await createProject(as('ana'), 'ana', project);
    await assertSucceeds(updateProject(as('ana'), 'ana', id, { name: 'Portal v2' }));
    await assertSucceeds(updateProject(as('ana'), 'ana', id, { archived: true }));
    await assertFails(createProject(as('vera'), 'vera', project));
    await assertFails(updateProject(as('vera'), 'vera', id, { name: 'X' }));
  });

  it('valida color, fechas y persona a cargo', async () => {
    await assertFails(createProject(as('ana'), 'ana', { ...project, color: 'azul' }));
    await assertFails(createProject(as('ana'), 'ana', { ...project, endDate: '2026-09-01' }));
    await assertFails(createProject(as('ana'), 'ana', { ...project, ownerId: 'vera' }));
  });

  it('solo el admin elimina, y las tareas quedan sin proyecto', async () => {
    const id = await createProject(as('ana'), 'ana', project);
    const taskId = await createTask(as('ana'), 'ana', { ...task, projectId: id });
    await assertFails(deleteProject(as('ana'), 'ana', id));
    await assertSucceeds(deleteProject(as('admin'), 'admin', id));
    expect((await getDoc(doc(as('ana'), 'tasks', taskId))).data()?.projectId).toBeNull();
    expect((await getDoc(doc(as('ana'), 'projects', id))).exists()).toBe(false);
  });

  it('no se agregan tareas a un proyecto archivado ni inexistente', async () => {
    const id = await createProject(as('ana'), 'ana', project);
    await updateProject(as('ana'), 'ana', id, { archived: true });
    await assertFails(createTask(as('ana'), 'ana', { ...task, projectId: id }));
    await assertFails(createTask(as('ana'), 'ana', { ...task, projectId: 'nada' }));
    const t = await createTask(as('ana'), 'ana', task);
    await assertFails(updateTask(as('ana'), 'ana', t, { projectId: id }));
  });

  it('los cambios de proyectos quedan auditados y se pueden leer', async () => {
    const id = await createProject(as('ana'), 'ana', project);
    await assertSucceeds(
      getDocs(query(collection(as('vera'), 'auditLog'), where('entityType', '==', 'project'), where('entityId', '==', id))),
    );
  });
});
```

Fixtures (en todos los tests):
- `tests/rules/tasks.rules.test.ts` y `tests/rules/audit.rules.test.ts`: el `input` suma `projectId: null`.
- En los objetos `Task` de `tests/components/*` y `tests/unit/*` (archivos que contienen `completedAt`): agregar `projectId: null,` justo después de la propiedad `completedAt: …,` (regex: `(completedAt: [^,]+,)` → `$1 projectId: null,`).
- `tests/components/TodoForm.test.tsx`: en cada `toHaveBeenCalledWith({…})` e `initialValues` agregar `projectId: null`.
- `tests/unit/useTasks.test.tsx`: el `create(...)` y su expectativa suman `projectId: null`.

- [ ] **Step 2: Correr y ver que fallan** — `npm run test:rules` → FAIL (no existe `projects`).

- [ ] **Step 3: Tipos**

```ts
// src/types/project.ts
export interface Project {
  id: string;
  name: string;
  description: string;
  /** '#RRGGBB' elegido con el selector */
  color: string;
  /** Persona a cargo (admin o miembro) */
  ownerId: string;
  /** Fechas locales 'YYYY-MM-DD' */
  startDate: string;
  endDate: string;
  archived: boolean;
  createdBy: string;
  createdAt: number;
  rev: number;
}

export type ProjectInput = Pick<Project, 'name' | 'description' | 'color' | 'ownerId' | 'startDate' | 'endDate'>;

export type ProjectPatch = Partial<ProjectInput & Pick<Project, 'archived'>>;
```

`src/types/task.ts`: en `Task` agregar `/** Proyecto, o null = "Sin proyecto" */ projectId: string | null;` y `TaskInput` pasa a `Pick<Task, 'title' | 'description' | 'priority' | 'dueDate' | 'assigneeId' | 'projectId'>`.
`src/types/audit.ts`: `export type EntityType = 'task' | 'invitation' | 'user' | 'project';`

- [ ] **Step 4: Reglas**

En `firestore.rules`:
- `entityPath`: agregar `: type == 'project' ? /databases/$(database)/documents/projects/$(id)` antes del caso final de `users`.
- `validAudit`: `d.entityType in ['task', 'invitation', 'user', 'project']`.
- `auditLog` read: `isAdmin() || (isActive() && resource.data.entityType in ['task', 'project'])`.
- `validTask`: agregar `'projectId'` a `hasOnly` y `&& (d.projectId == null || d.projectId is string)`.
- Antes de `match /tasks`:

```
    function projectPath(id) { return /databases/$(database)/documents/projects/$(id); }

    // Proyecto de una tarea: debe existir y no estar archivado (solo se revisa cuando cambia).
    function validProjectRef(id) {
      return id == null || (exists(projectPath(id)) && get(projectPath(id)).data.archived == false);
    }
```

- `tasks` create: `&& validProjectRef(request.resource.data.projectId)`; update: `&& (!changed().hasAny(['projectId']) || validProjectRef(request.resource.data.projectId))`.
- Nuevo bloque (después de `tasks`):

```
    // ─── Proyectos ────────────────────────────────────────────────
    function validProject(d) {
      return d.keys().hasOnly(['name', 'description', 'color', 'ownerId', 'startDate', 'endDate', 'archived',
                               'createdBy', 'createdAt', 'updatedAt', 'updatedBy', 'rev'])
        && d.name is string && d.name.size() > 0 && d.name.size() <= 80
        && d.description is string && d.description.size() <= 500
        && d.color is string && d.color.matches('^#[0-9A-Fa-f]{6}$')
        && d.ownerId is string
        && d.startDate is string && d.startDate.size() == 10
        && d.endDate is string && d.endDate.size() == 10
        && d.endDate >= d.startDate
        && d.archived is bool
        && d.rev is int
        && d.updatedBy == request.auth.uid
        && d.updatedAt == request.time;
    }

    match /projects/{projectId} {
      allow read: if isActive();
      allow create: if canEdit()
        && validProject(request.resource.data)
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.createdAt == request.time
        && request.resource.data.rev == 1
        && request.resource.data.archived == false
        && validAssignee(request.resource.data.ownerId)
        && audited('project', projectId, 1);
      allow update: if canEdit()
        && validProject(request.resource.data)
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.createdAt == resource.data.createdAt
        && (!changed().hasAny(['ownerId']) || validAssignee(request.resource.data.ownerId))
        && nextRev()
        && audited('project', projectId, request.resource.data.rev);
      allow delete: if isAdmin() && audited('project', projectId, resource.data.rev + 1);
    }
```

- [ ] **Step 5: Escrituras**

`src/services/audited/tasks.ts`, en `createTask`: `projectId: input.projectId,` después de `assigneeId`.
`src/services/tasks.service.ts`, en `toTask`: `projectId: data.projectId ?? null,`.

```ts
// src/services/audited/projects.ts
import {
  collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch,
  type Firestore, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { ProjectInput, ProjectPatch } from '@/types/project';
import { auditEntry, auditRef } from './audit';

/** Cada tarea desvinculada son 2 escrituras (tarea + auditoría); Firestore acepta 500 por lote. */
const UNLINK_CHUNK = 240;

function clean<T extends ProjectPatch>(patch: T): T {
  return {
    ...patch,
    ...(patch.name !== undefined && { name: patch.name.trim() }),
    ...(patch.description !== undefined && { description: patch.description.trim() }),
  };
}

export async function createProject(db: Firestore, actorId: string, input: ProjectInput): Promise<string> {
  const ref = doc(collection(db, 'projects'));
  const data = {
    ...clean(input),
    archived: false,
    createdBy: actorId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: actorId,
    rev: 1,
  };
  const batch = writeBatch(db);
  batch.set(ref, data);
  batch.set(
    auditRef(db, 'project', ref.id, 1),
    auditEntry({ type: 'project', id: ref.id, rev: 1, action: 'create', actorId, before: null, after: data }),
  );
  await batch.commit();
  return ref.id;
}

export async function updateProject(db: Firestore, actorId: string, id: string, patch: ProjectPatch): Promise<void> {
  const ref = doc(db, 'projects', id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('El proyecto ya no existe.');
    const before = snap.data();
    const rev = before.rev + 1;
    const after = { ...before, ...clean(patch), rev, updatedBy: actorId, updatedAt: serverTimestamp() };
    tx.set(ref, after);
    tx.set(auditRef(db, 'project', id, rev), auditEntry({ type: 'project', id, rev, action: 'update', actorId, before, after }));
  });
}

/** Borra el proyecto (solo admin) y deja sus tareas "Sin proyecto", cada una con su auditoría. */
export async function deleteProject(db: Firestore, actorId: string, id: string): Promise<void> {
  const projectRef = doc(db, 'projects', id);
  const linked = (await getDocs(query(collection(db, 'tasks'), where('projectId', '==', id)))).docs;
  const chunks: QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < linked.length; i += UNLINK_CHUNK) chunks.push(linked.slice(i, i + UNLINK_CHUNK));
  if (chunks.length === 0) chunks.push([]);

  for (const [index, chunk] of chunks.entries()) {
    const batch = writeBatch(db);
    for (const snap of chunk) {
      const before = snap.data();
      const rev = before.rev + 1;
      const after = { ...before, projectId: null, rev, updatedBy: actorId, updatedAt: serverTimestamp() };
      batch.set(snap.ref, after);
      batch.set(auditRef(db, 'task', snap.id, rev), auditEntry({ type: 'task', id: snap.id, rev, action: 'update', actorId, before, after }));
    }
    if (index === chunks.length - 1) {
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const before = projectSnap.data();
        const rev = before.rev + 1;
        batch.delete(projectRef);
        batch.set(auditRef(db, 'project', id, rev), auditEntry({ type: 'project', id, rev, action: 'delete', actorId, before, after: null }));
      }
    }
    await batch.commit();
  }
}
```

`TodoForm.tsx`: `EMPTY` suma `projectId: null`. `TasksPage.tsx`: `initialValues` de crear suma `projectId: null`; los de editar suman `projectId: editing.projectId`.

- [ ] **Step 6: Migración**

`migrateTask.ts`: `CURRENT_FIELDS` suma `'projectId'`; en `data` agregar `projectId: rest.projectId ?? null,`.
`tests/unit/migrateTask.test.ts`: los `toEqual` esperados suman `projectId: null` y la tarea "ya migrada" suma `projectId: null`. Agregar:

```ts
  it('una tarea de la etapa 3 sin proyecto recibe projectId: null', () => {
    const result = migrateTask({
      ...base, createdBy: 'ana', updatedBy: 'ana', rev: 2, status: 'todo', assigneeId: null, completedBy: null, completedAt: null,
    });
    expect(result?.data).toMatchObject({ projectId: null, rev: 3 });
  });
```

- [ ] **Step 7: Verificar, publicar y migrar**

Run: `npm run test:rules && npm test && npm run build && npm run lint`.
Publicar `firestore.rules` en `matecode-tasks-dev` (script temporal de siempre) y correr `npm run migrate-tasks` (dos veces: la segunda debe decir 0 migradas).

- [ ] **Step 8: Commit**

```bash
git add firestore.rules src tests
git commit -m "feat(v2): proyectos con reglas y auditoría; tareas con proyecto"
```

---

### Task 3: Progreso de un proyecto

**Files:**
- Create: `src/features/projects/projectProgress.ts`
- Test: `tests/unit/projectProgress.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ProjectProgress = { total: number; todo: number; doing: number; done: number; percent: number; late: boolean };
  export function projectProgress(tasks: readonly Task[], endDate: string, today: string): ProjectProgress;
  ```

- [ ] **Step 1: Test que falla**

```ts
// tests/unit/projectProgress.test.ts
import { describe, expect, it } from 'vitest';
import { projectProgress } from '@/features/projects/projectProgress';
import type { Task, TaskStatus } from '@/types/task';

const t = (status: TaskStatus): Task => ({
  id: Math.random().toString(), createdBy: 'x', updatedBy: 'x', rev: 1, title: 't', description: '', status, assigneeId: null,
  completedBy: null, completedAt: null, projectId: 'p', priority: 'media', dueDate: null, createdAt: 1,
});
const tasks = [t('done'), t('done'), t('done'), t('done'), t('doing'), t('doing'), t('doing'), t('todo'), t('todo'), t('todo')];

describe('projectProgress', () => {
  it('porcentaje por tareas hechas y detalle por estado', () => {
    expect(projectProgress(tasks, '2026-12-01', '2026-10-12')).toEqual({ total: 10, todo: 3, doing: 3, done: 4, percent: 40, late: false });
  });
  it('atrasado si pasó la fecha de fin sin terminar', () => {
    expect(projectProgress(tasks, '2026-10-11', '2026-10-12').late).toBe(true);
  });
  it('no está atrasado si llegó al 100%', () => {
    expect(projectProgress([t('done')], '2026-10-01', '2026-10-12')).toMatchObject({ percent: 100, late: false });
  });
  it('sin tareas: 0% y no atrasado aunque la fecha haya pasado', () => {
    expect(projectProgress([], '2026-10-01', '2026-10-12')).toEqual({ total: 0, todo: 0, doing: 0, done: 0, percent: 0, late: true });
  });
});
```

> El último caso: un proyecto sin tareas cuyo fin ya pasó **sí** está atrasado (no llegó al 100%).

- [ ] **Step 2: Correr y ver que falla** — `npx vitest run tests/unit/projectProgress.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/features/projects/projectProgress.ts
import type { Task } from '@/types/task';

export type ProjectProgress = { total: number; todo: number; doing: number; done: number; percent: number; late: boolean };

/** Progreso real: tareas hechas sobre el total. Atrasado = pasó la fecha de fin y no llegó al 100%. */
export function projectProgress(tasks: readonly Task[], endDate: string, today: string): ProjectProgress {
  const count = (status: Task['status']) => tasks.filter((t) => t.status === status).length;
  const done = count('done');
  const percent = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  return { total: tasks.length, todo: count('todo'), doing: count('doing'), done, percent, late: endDate < today && percent < 100 };
}
```

- [ ] **Step 4: Verificar y commit**

```bash
git add src/features/projects tests/unit/projectProgress.test.ts
git commit -m "feat(v2): progreso real y atraso de un proyecto"
```

---

### Task 4: Proyectos en la app (datos, etiqueta y campo en el formulario)

**Files:**
- Create: `src/services/projects.service.ts`, `src/hooks/useProjects.ts`, `src/components/projects/ProjectTag.tsx` (+ `.module.css`)
- Modify: `src/components/tasks/TodoForm.tsx`, `TodoItem.tsx`, `TodoList.tsx`, `TaskBoard.tsx`, `TaskDetailPanel.tsx`, `src/pages/TasksPage.tsx`
- Test: `tests/components/ProjectTag.test.tsx`, `tests/components/TodoForm.test.tsx`, `tests/components/TodoList.test.tsx`

**Interfaces:**
- Consumes: `Project` (T2), `readableTextColor` (T1).
- Produces:
  ```ts
  export function subscribeToProjects(onData: (projects: Project[]) => void, onError: (e: Error) => void): () => void;
  export const createProject: (actorId: string, input: ProjectInput) => Promise<string>;
  export const updateProject: (actorId: string, id: string, patch: ProjectPatch) => Promise<void>;
  export const deleteProject: (actorId: string, id: string) => Promise<void>;
  export function useProjects(): { projects: Project[]; loading: boolean; error: string | null };
  export type ProjectOf = (id: string | null) => Project | null;
  export function makeProjectOf(projects: readonly Project[]): ProjectOf;   // en src/features/projects/projectOf.ts
  export function ProjectTag(p: { project: Project }): JSX.Element;
  // TodoForm: projects?: Project[] (activos + el actual) → campo "Proyecto" con "Sin proyecto"
  // TodoList, TodoItem, TaskBoard, TaskDetailPanel: prop projectOf: ProjectOf
  ```

- [ ] **Step 1: Tests que fallan**

```tsx
// tests/components/ProjectTag.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectTag } from '@/components/projects/ProjectTag';
import type { Project } from '@/types/project';

const project = (color: string): Project => ({
  id: 'p', name: 'Portal', description: '', color, ownerId: 'a', startDate: '2026-10-01', endDate: '2026-11-30',
  archived: false, createdBy: 'a', createdAt: 1, rev: 1,
});

describe('ProjectTag', () => {
  it('muestra el nombre con el color del proyecto y letra legible', () => {
    render(<ProjectTag project={project('#CBDF90')} />);
    const tag = screen.getByText('Portal');
    expect(tag).toHaveStyle({ backgroundColor: '#CBDF90', color: '#1B2F4F' });
  });
  it('en color oscuro usa letra blanca', () => {
    render(<ProjectTag project={project('#1B4079')} />);
    expect(screen.getByText('Portal')).toHaveStyle({ color: '#FFFFFF' });
  });
});
```

En `tests/components/TodoForm.test.tsx` agregar:

```tsx
  it('permite elegir proyecto', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const portal = {
      id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'a', startDate: '2026-10-01',
      endDate: '2026-11-30', archived: false, createdBy: 'a', createdAt: 1, rev: 1,
    };
    render(<TodoForm onSubmit={onSubmit} projects={[portal]} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Llamar');
    expect(screen.getByLabelText('Proyecto')).toHaveValue('');
    await userEvent.selectOptions(screen.getByLabelText('Proyecto'), 'p1');
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p1' }));
  });
```

En `tests/components/TodoList.test.tsx`: `setup` pasa `projectOf={projectOf}` con

```ts
const portal = { id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'a', startDate: '2026-10-01', endDate: '2026-11-30', archived: false, createdBy: 'a', createdAt: 1, rev: 1 };
const projectOf = (id: string | null) => (id === 'p1' ? portal : null);
```

y agregar:

```tsx
  it('muestra la etiqueta del proyecto', () => {
    setup([{ ...tasks[0], projectId: 'p1' }]);
    expect(screen.getByText('Portal')).toBeInTheDocument();
  });
```

En `tests/components/TaskBoard.test.tsx` y `tests/components/TaskDetailPanel.test.tsx`: pasar `projectOf={() => null}`.

- [ ] **Step 2: Correr y ver que fallan** — `npx vitest run tests/components/ProjectTag.test.tsx tests/components/TodoForm.test.tsx tests/components/TodoList.test.tsx` → FAIL.

- [ ] **Step 3: Datos**

```ts
// src/services/projects.service.ts
import { collection, onSnapshot, type QueryDocumentSnapshot, type Timestamp } from 'firebase/firestore';
import * as audited from '@/services/audited/projects';
import type { Project, ProjectInput, ProjectPatch } from '@/types/project';
import { db } from './firebase';

function toProject(snap: QueryDocumentSnapshot): Project {
  const d = snap.data({ serverTimestamps: 'estimate' });
  return {
    id: snap.id,
    name: d.name,
    description: d.description ?? '',
    color: d.color,
    ownerId: d.ownerId,
    startDate: d.startDate,
    endDate: d.endDate,
    archived: Boolean(d.archived),
    createdBy: d.createdBy,
    createdAt: (d.createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
    rev: d.rev,
  };
}

/** Todos los proyectos en tiempo real, ordenados por fecha de fin. */
export function subscribeToProjects(onData: (projects: Project[]) => void, onError: (error: Error) => void): () => void {
  return onSnapshot(
    collection(db, 'projects'),
    (snap) => onData(snap.docs.map(toProject).sort((a, b) => a.endDate.localeCompare(b.endDate) || a.name.localeCompare(b.name))),
    onError,
  );
}

// Cada escritura deja su entrada de auditoría (ver services/audited/projects.ts).
export const createProject = (actorId: string, input: ProjectInput) => audited.createProject(db, actorId, input);
export const updateProject = (actorId: string, id: string, patch: ProjectPatch) => audited.updateProject(db, actorId, id, patch);
export const deleteProject = (actorId: string, id: string) => audited.deleteProject(db, actorId, id);
```

```ts
// src/hooks/useProjects.ts
import { useEffect, useState } from 'react';
import { subscribeToProjects } from '@/services/projects.service';
import type { Project } from '@/types/project';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeToProjects(
        (next) => {
          setProjects(next);
          setLoading(false);
        },
        (err) => {
          console.error('Error al leer proyectos:', err);
          setError('No pudimos cargar los proyectos.');
          setLoading(false);
        },
      ),
    [],
  );

  return { projects, loading, error };
}
```

```ts
// src/features/projects/projectOf.ts
import type { Project } from '@/types/project';

export type ProjectOf = (id: string | null) => Project | null;

export function makeProjectOf(projects: readonly Project[]): ProjectOf {
  const byId = new Map(projects.map((p) => [p.id, p]));
  return (id) => (id ? byId.get(id) ?? null : null);
}
```

- [ ] **Step 4: Etiqueta y formulario**

```tsx
// src/components/projects/ProjectTag.tsx
import type { Project } from '@/types/project';
import { readableTextColor } from '@/utils/color';
import styles from './ProjectTag.module.css';

/** Nombre del proyecto con su color (la letra se elige para que siempre se lea). */
export function ProjectTag({ project }: { project: Project }) {
  return (
    <span className={styles.tag} style={{ backgroundColor: project.color, color: readableTextColor(project.color) }}>
      {project.name}
    </span>
  );
}
```

```css
/* src/components/projects/ProjectTag.module.css */
.tag {
  display: inline-block; max-width: 100%; padding: 1px var(--space-2); border-radius: var(--radius-pill);
  font-size: var(--text-xs); font-weight: var(--weight-semibold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
```

`TodoForm.tsx`:
- Import `type { Project }`; prop `/** Proyectos elegibles (activos + el actual) */ projects?: Project[];` (default `[]`).
- Antes de "Responsable":

```tsx
      <Field id="task-project" label="Proyecto">
        <select
          id="task-project" className={fieldInputClass}
          value={values.projectId ?? ''} onChange={(e) => setValues((v) => ({ ...v, projectId: e.target.value || null }))}
        >
          <option value="">Sin proyecto</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archived ? ' (archivado)' : ''}</option>)}
        </select>
      </Field>
```

`TodoItem.tsx`, `TodoList.tsx`, `TaskBoard.tsx`, `TaskDetailPanel.tsx`: prop `projectOf: ProjectOf`. Donde están los badges de prioridad (`.meta`), agregar `{project && <ProjectTag project={project} />}` con `const project = projectOf(task.projectId);`. En `TaskDetailPanel`, nueva fila `<dt>Proyecto</dt><dd>{project ? <ProjectTag project={project} /> : 'Sin proyecto'}</dd>` después de Responsable.

`TasksPage.tsx`: `const { projects } = useProjects(); const projectOf = makeProjectOf(projects);` pasar `projectOf` a lista, tablero y panel; en crear y editar pasar `projects={projects.filter((p) => !p.archived || p.id === <valor actual>)}` (crear: `!p.archived`; editar: `!p.archived || p.id === editing.projectId`).

- [ ] **Step 5: Verificar y commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add src tests
git commit -m "feat(v2): proyecto en el formulario y etiqueta de color en las tareas"
```

---

### Task 5: `TaskWorkspace` reutilizable

**Files:**
- Create: `src/components/tasks/TaskWorkspace.tsx` (+ `.module.css` = contenido de `TasksPage.module.css`)
- Modify: `src/pages/TasksPage.tsx`; borrar `src/pages/TasksPage.module.css`
- Test: `tests/components/TaskWorkspace.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  type TaskWorkspaceProps = {
    profile: UserProfile;
    /** Si se pasa, solo se ven las tareas de ese proyecto y las nuevas se crean dentro de él */
    projectId?: string;
    /** Recibe el botón "+ Nueva tarea" (o null si no puede crear) y devuelve el encabezado */
    renderHeader: (newTaskButton: ReactNode) => ReactNode;
  };
  export function TaskWorkspace(props: TaskWorkspaceProps): JSX.Element;
  ```

- [ ] **Step 1: Test que falla**

```tsx
// tests/components/TaskWorkspace.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';
import type { Task } from '@/types/task';

const state = vi.hoisted(() => ({ tasks: [] as Task[], create: vi.fn() }));
vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: state.tasks, loading: false, error: null, retry: vi.fn(), create: state.create, update: vi.fn(), remove: vi.fn(), setStatus: vi.fn() }),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loading: false, error: null }) }));
vi.mock('@/components/tasks/TaskHistory', () => ({ TaskHistory: () => null }));

import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';

const me: UserProfile = { uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'member', active: true, invitedBy: null, rev: 1 };
const task = (id: string, projectId: string | null): Task => ({
  id, createdBy: 'ana', updatedBy: 'ana', rev: 1, title: `Tarea ${id}`, description: '', status: 'todo', assigneeId: 'ana',
  completedBy: null, completedAt: null, projectId, priority: 'media', dueDate: null, createdAt: 1,
});

describe('TaskWorkspace', () => {
  it('sin proyecto muestra todas las tareas', () => {
    state.tasks = [task('1', 'p1'), task('2', null)];
    render(<TaskWorkspace profile={me} renderHeader={(button) => <header>{button}</header>} />);
    expect(screen.getByText('Tarea 1')).toBeInTheDocument();
    expect(screen.getByText('Tarea 2')).toBeInTheDocument();
  });

  it('con proyecto muestra solo sus tareas y crea dentro de él', async () => {
    state.tasks = [task('1', 'p1'), task('2', null)];
    state.create.mockResolvedValue('nueva');
    render(<TaskWorkspace profile={me} projectId="p1" renderHeader={(button) => <header>{button}</header>} />);
    expect(screen.getByText('Tarea 1')).toBeInTheDocument();
    expect(screen.queryByText('Tarea 2')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Nueva tarea' }));
    await userEvent.type(screen.getByLabelText('Título'), 'Nueva');
    await userEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nueva', projectId: 'p1' }));
  });
});
```

- [ ] **Step 2: Correr y ver que falla** — FAIL (no existe `TaskWorkspace`).

- [ ] **Step 3: Extraer**

- Mover todo `TasksView` de `TasksPage.tsx` a `TaskWorkspace.tsx` como `TaskWorkspace({ profile, projectId, renderHeader })`, con `styles` desde `./TaskWorkspace.module.css` (contenido idéntico al actual `TasksPage.module.css`).
- Cambios dentro:
  - `const inProject = projectId ? tasks.filter((t) => t.projectId === projectId) : tasks;` y usar `inProject` donde hoy se usa `tasks` para `scopeTasks` (el panel sigue buscando en `tasks`).
  - Alcance: `usePreference<TaskScope>(projectId ? 'matecode.scope.project' : 'matecode.scope', canEdit && !projectId ? 'mine' : 'team', SCOPES)` (en un proyecto se empieza viendo a todo el equipo).
  - Reemplazar el `<PageHeader …/>` por `{renderHeader(canCreate ? <Button size="sm" onClick={() => setCreating(true)}>+ Nueva tarea</Button> : null)}`.
  - En crear: `initialValues={{ …, projectId: projectId ?? null }}`.
  - Quitar `SendSummaryButton` de acá (queda en `TasksPage`).
- `TasksPage.tsx` queda:

```tsx
import { PageHeader } from '@/components/layout/PageHeader';
import { SendSummaryButton } from '@/components/tasks/SendSummaryButton';
import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/types/auth';
import { useCallback, useState } from 'react';
import { Toast, type ToastMessage } from '@/components/ui/Toast';

export function TasksPage() {
  const { profile } = useAuth();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  // RequireAccess garantiza que acá siempre hay un perfil activo.
  return (
    <>
      <TaskWorkspace
        profile={profile as UserProfile}
        renderHeader={(newTaskButton) => (
          <PageHeader title="Mis tareas" actions={<><SendSummaryButton onResult={setToast} />{newTaskButton}</>} />
        )}
      />
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </>
  );
}
```

  (ordenar imports como en el resto del proyecto: React primero.)

- [ ] **Step 4: Verificar y commit**

Run: `npm test && npm run build && npm run lint`. Mis tareas debe funcionar igual que antes.

```bash
git add -A src tests
git commit -m "refactor(v2): pantalla de tareas reutilizable para proyectos"
```

---

### Task 6: Lista de proyectos

**Files:**
- Create: `src/components/projects/ColorPicker.tsx` (+ `.module.css`), `ProjectCard.tsx` (+ `.module.css`), `ProjectDialog.tsx` (+ `.module.css`), `src/pages/ProjectsPage.tsx` (+ `.module.css`)
- Modify: `src/features/navigation/navItems.ts`, `src/routes/AppRouter.tsx`
- Test: `tests/components/ColorPicker.test.tsx`, `ProjectCard.test.tsx`, `ProjectDialog.test.tsx`, `ProjectsPage.test.tsx`, `tests/unit/navItems.test.ts`, `tests/components/AppShell.test.tsx`

**Interfaces:**
- Consumes: `projectProgress` (T3), `useProjects`, `createProject`/`updateProject` (T4), `assigneeOptions`, `makePersonOf`, `Avatar`, `readableTextColor`.
- Produces:
  ```ts
  export const PALETTE: readonly string[]; // los 5 --brand
  export function ColorPicker(p: { value: string; onChange: (hex: string) => void }): JSX.Element;
  export function ProjectCard(p: { project: Project; progress: ProjectProgress; owner: Person | null }): JSX.Element; // link a /projects/:id
  export function ProjectDialog(p: { actorId: string; project?: Project; members: UserProfile[]; onClose: () => void }): JSX.Element;
  export function ProjectsPage(): JSX.Element;
  ```

- [ ] **Step 1: Tests que fallan**

```tsx
// tests/components/ColorPicker.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ColorPicker } from '@/components/projects/ColorPicker';

describe('ColorPicker', () => {
  it('elige un color de la paleta', async () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#1B4079" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: '#1B4079' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: '#CBDF90' }));
    expect(onChange).toHaveBeenCalledWith('#CBDF90');
  });

  it('elige cualquier otro color con el selector', () => {
    const onChange = vi.fn();
    render(<ColorPicker value="#1B4079" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Otro color'), { target: { value: '#c2410c' } });
    expect(onChange).toHaveBeenCalledWith('#C2410C');
  });
});
```

```tsx
// tests/components/ProjectCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ProjectCard } from '@/components/projects/ProjectCard';
import type { Project } from '@/types/project';

const project: Project = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', startDate: '2026-10-01', endDate: '2026-11-30',
  archived: false, createdBy: 'ana', createdAt: 1, rev: 1,
};

describe('ProjectCard', () => {
  it('muestra progreso real, detalle y a cargo, y lleva a la página del proyecto', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={project} progress={{ total: 10, todo: 3, doing: 3, done: 4, percent: 40, late: false }} owner={{ name: 'Ana', photo: null, active: true }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Portal/ })).toHaveAttribute('href', '/projects/p1');
    expect(screen.getByRole('progressbar', { name: 'Progreso de Portal' })).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('40% · 4 de 10 hechas')).toBeInTheDocument();
    expect(screen.getByText('3 en curso · 3 pendientes')).toBeInTheDocument();
    expect(screen.getByText('A cargo: Ana')).toBeInTheDocument();
  });

  it('marca "Atrasado"', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={project} progress={{ total: 1, todo: 1, doing: 0, done: 0, percent: 0, late: true }} owner={null} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Atrasado/)).toBeInTheDocument();
  });
});
```

```tsx
// tests/components/ProjectDialog.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';

const svc = vi.hoisted(() => ({ createProject: vi.fn(), updateProject: vi.fn() }));
vi.mock('@/services/projects.service', () => svc);

import { ProjectDialog } from '@/components/projects/ProjectDialog';

const members: UserProfile[] = [
  { uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'member', active: true, invitedBy: null, rev: 1 },
];

describe('ProjectDialog', () => {
  beforeEach(() => {
    svc.createProject.mockReset();
    svc.createProject.mockResolvedValue('p1');
  });

  it('crea un proyecto con nombre, fechas, persona a cargo y color', async () => {
    const onClose = vi.fn();
    render(<ProjectDialog actorId="ana" members={members} onClose={onClose} />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Portal');
    await userEvent.type(screen.getByLabelText('Inicio'), '2026-10-01');
    await userEvent.type(screen.getByLabelText('Fin'), '2026-11-30');
    await userEvent.click(screen.getByRole('radio', { name: '#4D7C8A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    expect(svc.createProject).toHaveBeenCalledWith('ana', {
      name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', startDate: '2026-10-01', endDate: '2026-11-30',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('no deja una fecha de fin anterior al inicio', async () => {
    render(<ProjectDialog actorId="ana" members={members} onClose={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Nombre'), 'Portal');
    await userEvent.type(screen.getByLabelText('Inicio'), '2026-10-10');
    await userEvent.type(screen.getByLabelText('Fin'), '2026-10-01');
    await userEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    expect(screen.getByText('La fecha de fin no puede ser anterior al inicio.')).toBeInTheDocument();
    expect(svc.createProject).not.toHaveBeenCalled();
  });
});
```

```tsx
// tests/components/ProjectsPage.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';

const state = vi.hoisted(() => ({ me: null as UserProfile | null, projects: [] as Project[] }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: state.me }) }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: state.projects, loading: false, error: null }) }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: [] }) }));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/services/projects.service', () => ({ createProject: vi.fn(), updateProject: vi.fn() }));

import { ProjectsPage } from '@/pages/ProjectsPage';

const as = (role: Role) => {
  state.me = { uid: 'u', email: 'u@x.com', displayName: 'U', role, active: true, invitedBy: null, rev: 1 };
};
const project = (id: string, name: string, archived = false): Project => ({
  id, name, description: '', color: '#4D7C8A', ownerId: 'u', startDate: '2026-10-01', endDate: '2026-11-30',
  archived, createdBy: 'u', createdAt: 1, rev: 1,
});

describe('ProjectsPage', () => {
  beforeEach(() => {
    state.projects = [project('1', 'Portal'), project('2', 'Viejo', true)];
  });

  it('muestra los activos y cambia a archivados', async () => {
    as('member');
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.getByText('1 activo · 1 archivado')).toBeInTheDocument();
    expect(screen.getByText('Portal')).toBeInTheDocument();
    expect(screen.queryByText('Viejo')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Archivados' }));
    expect(screen.getByText('Viejo')).toBeInTheDocument();
  });

  it('miembro crea proyectos; lector no', () => {
    as('member');
    const { unmount } = render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: '+ Nuevo proyecto' })).toBeInTheDocument();
    unmount();
    as('viewer');
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: '+ Nuevo proyecto' })).not.toBeInTheDocument();
  });
});
```

Ajustes: `navItems.test.ts` → Proyectos pasa a `'/projects'` para todos (`it.each(['admin','member','viewer'])('Proyectos está disponible para %s', …)` y el test de "Próximamente" deja solo `calendar` y `settings`). `AppShell.test.tsx` → "Próximamente" pasa de 3 a 2.

- [ ] **Step 2: Correr y ver que fallan** → FAIL.

- [ ] **Step 3: ColorPicker**

```tsx
// src/components/projects/ColorPicker.tsx
import styles from './ColorPicker.module.css';

// eslint-disable-next-line react/only-export-components -- constante ligada al selector
export const PALETTE: readonly string[] = ['#1B4079', '#4D7C8A', '#7F9C96', '#8FAD88', '#CBDF90'];

/** Atajos con la paleta + selector libre. Siempre devuelve '#RRGGBB' en mayúsculas. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const current = value.toUpperCase();
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Color</legend>
      <div className={styles.row}>
        {PALETTE.map((color) => (
          <label key={color} className={styles.swatch} style={{ backgroundColor: color }} title={color}>
            <input
              type="radio" name="project-color" className="visually-hidden" value={color} aria-label={color}
              checked={current === color} onChange={() => onChange(color)}
            />
          </label>
        ))}
        <label className={styles.custom}>
          <input type="color" value={value} aria-label="Otro color" onChange={(e) => onChange(e.target.value.toUpperCase())} />
          <span>Otro color</span>
        </label>
      </div>
    </fieldset>
  );
}
```

```css
/* src/components/projects/ColorPicker.module.css */
.group { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.legend { padding: 0; font-size: var(--text-md); font-weight: var(--weight-medium); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.swatch { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 2px solid var(--color-surface-default); box-shadow: 0 0 0 1px var(--color-border-strong); }
.swatch:has(input:checked) { box-shadow: 0 0 0 2px var(--color-action-primary); }
.swatch:has(input:focus-visible) { outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: 3px; }
.custom { display: inline-flex; align-items: center; gap: var(--space-1); font-size: var(--text-md); cursor: pointer; }
.custom input { width: 32px; height: 28px; padding: 0; border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); background: none; }
```

- [ ] **Step 4: ProjectCard**

```tsx
// src/components/projects/ProjectCard.tsx
import { Link } from 'react-router';
import { Avatar } from '@/components/layout/Avatar';
import type { ProjectProgress } from '@/features/projects/projectProgress';
import type { Person } from '@/features/team/members';
import type { Project } from '@/types/project';
import { formatDateLabel } from '@/utils/formatDate';
import styles from './ProjectCard.module.css';

type Props = { project: Project; progress: ProjectProgress; owner: Person | null };

export function ProjectCard({ project, progress, owner }: Props) {
  return (
    <li className={styles.card} style={{ borderTopColor: project.color }}>
      <Link to={`/projects/${project.id}`} className={styles.title}>{project.name}</Link>
      {progress.late ? (
        <p className={styles.late}>Atrasado · terminó el {formatDateLabel(project.endDate)}</p>
      ) : (
        <p className={styles.dates}>{formatDateLabel(project.startDate)} → {formatDateLabel(project.endDate)}</p>
      )}
      <div
        className={styles.bar} role="progressbar" aria-label={`Progreso de ${project.name}`}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}
      >
        <span style={{ width: `${progress.percent}%`, backgroundColor: project.color }} />
      </div>
      <p className={styles.summary}>{progress.percent}% · {progress.done} de {progress.total} hechas</p>
      <p className={styles.detail}>{progress.doing} en curso · {progress.todo} pendientes</p>
      {owner && (
        <p className={styles.owner}>
          <Avatar name={owner.name} photo={owner.photo} inactive={!owner.active} />
          <span>A cargo: {owner.name}</span>
        </p>
      )}
    </li>
  );
}
```

```css
/* src/components/projects/ProjectCard.module.css */
.card {
  display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-4);
  background: var(--color-surface-default); border: 1px solid var(--color-border-default);
  border-top: 4px solid; border-radius: var(--radius-lg);
}
.title { font-size: var(--text-xl); font-weight: var(--weight-semibold); color: var(--color-text-heading); text-decoration: none; }
.title:hover { text-decoration: underline; }
.title::after { content: ''; } /* el enlace lleva el nombre; la tarjeta no es toda clicable para no anidar controles */
.dates, .detail { font-size: var(--text-md); color: var(--color-text-secondary); }
.late { font-size: var(--text-md); font-weight: var(--weight-semibold); color: var(--color-status-danger); }
.bar { height: 8px; border-radius: var(--radius-pill); background: var(--color-surface-sunken); overflow: hidden; }
.bar span { display: block; height: 100%; }
.summary { font-weight: var(--weight-medium); color: var(--color-text-primary); }
.owner { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-md); color: var(--color-text-primary); }
```

- [ ] **Step 5: ProjectDialog**

```tsx
// src/components/projects/ProjectDialog.tsx
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { assigneeOptions } from '@/features/team/members';
import { createProject, updateProject } from '@/services/projects.service';
import type { UserProfile } from '@/types/auth';
import type { Project, ProjectInput } from '@/types/project';
import { ColorPicker, PALETTE } from './ColorPicker';
import styles from './ProjectDialog.module.css';

type Props = { actorId: string; project?: Project; members: UserProfile[]; onClose: () => void };

/** Crear o editar un proyecto. */
export function ProjectDialog({ actorId, project, members, onClose }: Props) {
  const [values, setValues] = useState<ProjectInput>(
    project
      ? { name: project.name, description: project.description, color: project.color, ownerId: project.ownerId, startDate: project.startDate, endDate: project.endDate }
      : { name: '', description: '', color: PALETTE[0], ownerId: actorId, startDate: '', endDate: '' },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<ProjectInput>) => setValues((v) => ({ ...v, ...patch }));

  function validate(): string | null {
    if (!values.name.trim()) return 'Ingresa el nombre del proyecto.';
    if (!values.startDate || !values.endDate) return 'Elige las fechas de inicio y fin.';
    if (values.endDate < values.startDate) return 'La fecha de fin no puede ser anterior al inicio.';
    return null;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      if (project) await updateProject(actorId, project.id, values);
      else await createProject(actorId, values);
      onClose();
    } catch (err) {
      console.error('Error al guardar el proyecto:', err);
      setError('No pudimos guardar el proyecto. Inténtalo de nuevo.');
      setSaving(false);
    }
  }

  return (
    <Modal title={project ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={onClose}>
      <form className={styles.form} onSubmit={save} noValidate>
        {error && <Alert kind="error">{error}</Alert>}
        <Field id="project-name" label="Nombre">
          <input id="project-name" className={fieldInputClass} maxLength={80} value={values.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field id="project-description" label="Descripción">
          <textarea id="project-description" className={fieldInputClass} maxLength={500} value={values.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <div className={styles.row}>
          <Field id="project-start" label="Inicio">
            <input id="project-start" type="date" className={fieldInputClass} value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </Field>
          <Field id="project-end" label="Fin">
            <input id="project-end" type="date" className={fieldInputClass} value={values.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </Field>
        </div>
        <Field id="project-owner" label="A cargo">
          <select id="project-owner" className={fieldInputClass} value={values.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
            {assigneeOptions(members, values.ownerId).map((m) => <option key={m.uid} value={m.uid}>{m.label}</option>)}
          </select>
        </Field>
        <ColorPicker value={values.color} onChange={(color) => set({ color })} />
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{project ? 'Guardar cambios' : 'Crear proyecto'}</Button>
        </div>
      </form>
    </Modal>
  );
}
```

```css
/* src/components/projects/ProjectDialog.module.css */
.form { display: flex; flex-direction: column; gap: var(--space-4); }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
```

> Si `members` todavía no cargó, `assigneeOptions` devuelve `[]` y el select queda vacío: `ProjectsPage` pasa `useTeamMembers()`, que se actualiza en vivo.

- [ ] **Step 6: ProjectsPage, navegación y rutas**

```tsx
// src/pages/ProjectsPage.tsx
import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { can } from '@/features/auth/permissions';
import { projectProgress } from '@/features/projects/projectProgress';
import { makePersonOf } from '@/features/team/members';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { UserProfile } from '@/types/auth';
import { toDateInputValue } from '@/utils/formatDate';
import styles from './ProjectsPage.module.css';

type Filter = 'active' | 'archived';

export function ProjectsPage() {
  const { profile } = useAuth();
  const me = profile as UserProfile; // RequireAccess garantiza un perfil activo
  const { projects, loading, error } = useProjects();
  const { tasks } = useTasks(me.uid);
  const members = useTeamMembers();
  const [filter, setFilter] = useState<Filter>('active');
  const [creating, setCreating] = useState(false);
  const [today] = useState(() => toDateInputValue(new Date()));

  const personOf = makePersonOf(members);
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const shown = filter === 'active' ? active : archived;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <>
      <PageHeader
        title="Proyectos"
        subtitle={`${plural(active.length, 'activo', 'activos')} · ${plural(archived.length, 'archivado', 'archivados')}`}
        actions={can(me, 'task:create') && <Button size="sm" onClick={() => setCreating(true)}>+ Nuevo proyecto</Button>}
      />
      <main className={styles.page}>
        <SegmentedControl
          label="Mostrar" name="project-filter" value={filter} onChange={setFilter}
          options={[{ value: 'active', label: 'Activos' }, { value: 'archived', label: 'Archivados' }]}
        />
        {loading && <Spinner label="Cargando proyectos…" />}
        {error && <Alert kind="error">{error}</Alert>}
        {!loading && !error && shown.length === 0 && (
          <p className={styles.empty}>{filter === 'active' ? 'Todavía no hay proyectos activos.' : 'No hay proyectos archivados.'}</p>
        )}
        <ul className={styles.grid}>
          {shown.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              progress={projectProgress(tasks.filter((t) => t.projectId === project.id), project.endDate, today)}
              owner={personOf(project.ownerId)}
            />
          ))}
        </ul>
      </main>
      {creating && <ProjectDialog actorId={me.uid} members={members} onClose={() => setCreating(false)} />}
    </>
  );
}
```

```css
/* src/pages/ProjectsPage.module.css */
.page { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-5) var(--space-4) var(--space-12); }
.grid { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
.empty { color: var(--color-text-secondary); }

@media (min-width: 640px) {
  .page { max-width: 1080px; margin: 0 auto; padding: var(--space-8); }
}
```

- `navItems.ts`: Proyectos `to: '/projects'`.
- `AppRouter.tsx`: `<Route path="/projects" element={<ProjectsPage />} />` dentro de la ruta del marco.

- [ ] **Step 7: Verificar y commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add -A src tests
git commit -m "feat(v2): lista de proyectos con progreso y selector de color"
```

---

### Task 7: Página de un proyecto

**Files:**
- Create: `src/pages/ProjectPage.tsx` (+ `.module.css`)
- Modify: `src/routes/AppRouter.tsx`
- Test: `tests/components/ProjectPage.test.tsx`, `tests/components/routes.test.tsx`

**Interfaces:**
- Consumes: `TaskWorkspace` (T5), `ProjectDialog`, `ProjectTag` no; `updateProject`, `deleteProject` (T4); `projectProgress` (T3).
- Produces: `ProjectPage(): JSX.Element` en `/projects/:id`.

- [ ] **Step 1: Test que falla**

```tsx
// tests/components/ProjectPage.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';

const state = vi.hoisted(() => ({
  me: null as UserProfile | null,
  projects: [] as Project[],
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: state.me }) }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: state.projects, loading: false, error: null }) }));
vi.mock('@/hooks/useTasks', () => ({ useTasks: () => ({ tasks: [] }) }));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/services/projects.service', () => ({ updateProject: state.updateProject, deleteProject: state.deleteProject, createProject: vi.fn() }));
vi.mock('@/components/tasks/TaskWorkspace', () => ({
  TaskWorkspace: ({ projectId, renderHeader }: { projectId: string; renderHeader: (b: null) => React.ReactNode }) => (
    <>{renderHeader(null)}<p>Tareas de {projectId}</p></>
  ),
}));

import { ProjectPage } from '@/pages/ProjectPage';

const as = (role: Role) => {
  state.me = { uid: 'u', email: 'u@x.com', displayName: 'U', role, active: true, invitedBy: null, rev: 1 };
};
const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/projects" element={<h1>Lista de proyectos</h1>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProjectPage', () => {
  beforeEach(() => {
    state.projects = [{
      id: 'p1', name: 'Portal', description: 'Clientes', color: '#4D7C8A', ownerId: 'u', startDate: '2026-10-01',
      endDate: '2026-11-30', archived: false, createdBy: 'u', createdAt: 1, rev: 1,
    }];
    state.updateProject.mockReset();
    state.updateProject.mockResolvedValue(undefined);
    state.deleteProject.mockReset();
    state.deleteProject.mockResolvedValue(undefined);
  });

  it('muestra el proyecto y sus tareas', () => {
    as('member');
    renderAt('/projects/p1');
    expect(screen.getByRole('heading', { level: 1, name: 'Portal' })).toBeInTheDocument();
    expect(screen.getByText('Tareas de p1')).toBeInTheDocument();
  });

  it('archivar pide confirmación', async () => {
    as('member');
    renderAt('/projects/p1');
    await userEvent.click(screen.getByRole('button', { name: 'Archivar' }));
    expect(state.updateProject).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, archivar' }));
    expect(state.updateProject).toHaveBeenCalledWith('u', 'p1', { archived: true });
  });

  it('solo el admin ve Eliminar, con confirmación, y vuelve a la lista', async () => {
    as('member');
    const { unmount } = renderAt('/projects/p1');
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
    unmount();
    as('admin');
    renderAt('/projects/p1');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText(/sus tareas quedarán "Sin proyecto"/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }));
    expect(state.deleteProject).toHaveBeenCalledWith('u', 'p1');
    expect(await screen.findByRole('heading', { name: 'Lista de proyectos' })).toBeInTheDocument();
  });

  it('un lector no ve acciones', () => {
    as('viewer');
    renderAt('/projects/p1');
    expect(screen.queryByRole('button', { name: /Editar|Archivar|Eliminar/ })).not.toBeInTheDocument();
  });

  it('avisa si el proyecto no existe', () => {
    as('member');
    renderAt('/projects/nada');
    expect(screen.getByText('Este proyecto no existe o fue eliminado.')).toBeInTheDocument();
  });
});
```

En `tests/components/routes.test.tsx` mockear `@/pages/ProjectsPage` y `@/pages/ProjectPage` con un `<h1>` y agregar un caso `/projects/p1` → `<h1>Proyecto</h1>` dentro del marco.

- [ ] **Step 2: Correr y ver que falla** → FAIL.

- [ ] **Step 3: Implementar**

```tsx
// src/pages/ProjectPage.tsx
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { can } from '@/features/auth/permissions';
import { projectProgress } from '@/features/projects/projectProgress';
import { makeNameOf } from '@/features/team/members';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { deleteProject, updateProject } from '@/services/projects.service';
import type { UserProfile } from '@/types/auth';
import { formatDateLabel, toDateInputValue } from '@/utils/formatDate';
import styles from './ProjectPage.module.css';

type Confirm = 'archive' | 'delete' | null;

export function ProjectPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const me = profile as UserProfile; // RequireAccess garantiza un perfil activo
  const { projects, loading } = useProjects();
  const { tasks } = useTasks(me.uid);
  const members = useTeamMembers();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const [today] = useState(() => toDateInputValue(new Date()));

  const project = projects.find((p) => p.id === id);
  if (loading) return <Spinner label="Cargando proyecto…" />;
  if (!project) {
    return (
      <main className={styles.missing}>
        <p>Este proyecto no existe o fue eliminado.</p>
        <Link to="/projects">Volver a Proyectos</Link>
      </main>
    );
  }

  const canEdit = can(me, 'task:edit');
  const isAdmin = can(me, 'team:manage');
  const progress = projectProgress(tasks.filter((t) => t.projectId === project.id), project.endDate, today);
  const owner = makeNameOf(members)(project.ownerId);

  async function run(action: () => Promise<void>, onDone?: () => void) {
    setError(null);
    try {
      await action();
      setConfirm(null);
      onDone?.();
    } catch (err) {
      console.error('Error en el proyecto:', err);
      setError('No pudimos guardar el cambio. Inténtalo de nuevo.');
    }
  }

  const header = (newTaskButton: React.ReactNode) => (
    <header className={styles.header} style={{ borderTopColor: project.color }}>
      <Link to="/projects" className={styles.back}>← Proyectos</Link>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>{project.name}</h1>
          {project.description && <p className={styles.description}>{project.description}</p>}
          <p className={styles.meta}>
            {formatDateLabel(project.startDate)} → {formatDateLabel(project.endDate)}
            {owner && ` · A cargo: ${owner}`} · {progress.percent}% ({progress.done} de {progress.total})
            {project.archived && ' · Archivado'}
          </p>
          {progress.late && <p className={styles.late}>Atrasado</p>}
        </div>
        <div className={styles.actions}>
          {canEdit && <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Editar</Button>}
          {canEdit && (project.archived ? (
            <Button size="sm" variant="secondary" onClick={() => void run(() => updateProject(me.uid, project.id, { archived: false }))}>Reactivar</Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setConfirm('archive')}>Archivar</Button>
          ))}
          {isAdmin && <Button size="sm" variant="ghost" onClick={() => setConfirm('delete')}>Eliminar</Button>}
          {!project.archived && newTaskButton}
        </div>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {confirm && (
        <div className={styles.confirm}>
          <p>
            {confirm === 'archive'
              ? `¿Archivar "${project.name}"? Ya no se podrán agregar tareas; puedes reactivarlo cuando quieras.`
              : `¿Eliminar "${project.name}"? No se puede deshacer; sus tareas quedarán "Sin proyecto".`}
          </p>
          <div className={styles.actions}>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            {confirm === 'archive' ? (
              <Button size="sm" variant="danger" onClick={() => void run(() => updateProject(me.uid, project.id, { archived: true }))}>Sí, archivar</Button>
            ) : (
              <Button size="sm" variant="danger" onClick={() => void run(() => deleteProject(me.uid, project.id), () => navigate('/projects'))}>Sí, eliminar</Button>
            )}
          </div>
        </div>
      )}
    </header>
  );

  return (
    <>
      <TaskWorkspace profile={me} projectId={project.id} renderHeader={header} />
      {editing && <ProjectDialog actorId={me.uid} project={project} members={members} onClose={() => setEditing(false)} />}
    </>
  );
}
```

> Usar `type ReactNode` importado de `react` en vez de `React.ReactNode` si el lint lo pide.

```css
/* src/pages/ProjectPage.module.css */
.header {
  display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-5) var(--space-4);
  background: var(--color-surface-default); border-bottom: 1px solid var(--color-border-default); border-top: 4px solid;
}
.back { font-size: var(--text-md); color: var(--color-text-link); }
.top { display: flex; flex-direction: column; gap: var(--space-3); }
.title { font-size: var(--text-4xl); font-weight: var(--weight-semibold); line-height: var(--leading-tight); color: var(--color-text-heading); }
.description { margin-top: var(--space-1); color: var(--color-text-secondary); }
.meta { margin-top: var(--space-1); font-size: var(--text-md); color: var(--color-text-secondary); }
.late { font-weight: var(--weight-semibold); color: var(--color-status-danger); }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.confirm { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-status-warning-surface); }
.missing { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-8); }

@media (min-width: 768px) {
  .header { padding: var(--space-6) var(--space-8); }
  .top { flex-direction: row; justify-content: space-between; align-items: flex-end; }
}
```

`AppRouter.tsx`: `<Route path="/projects/:id" element={<ProjectPage />} />` dentro del marco.

- [ ] **Step 4: Verificar y commit**

Run: `npm test && npm run build && npm run lint`

```bash
git add -A src tests
git commit -m "feat(v2): página de cada proyecto con sus tareas"
```

---

### Task 8: Preview 5A

- [ ] Preview (`vercel --yes` + alias `matecode-tasks-dev.vercel.app`), producción 200, `npm run test:rules` en verde, push.
- [ ] Prueba de la usuaria: crear proyecto con color de la paleta y con "Otro color"; tarjeta con progreso y "Atrasado"; asignar tareas a un proyecto (etiqueta de color); página del proyecto (crear tarea adentro, tablero, panel); archivar con confirmación (no deja agregar tareas; Reactivar); eliminar como admin (las tareas quedan "Sin proyecto"); como miembro no ve Eliminar; como lector solo mira; textos atenuados y placeholders más legibles.

---

## Autorrevisión del plan

- **Cobertura del spec (5A):** decisiones de permisos, eliminación y confirmaciones (T2, T7); progreso y "Atrasado" (T3, T6); página del proyecto y persona a cargo (T6, T7); color con selector y letra legible (T1, T4, T6); datos y reglas de `projects` y `projectId` (T2); auditoría con tipo `project` (T2); accesibilidad y test de contraste (T1); `TaskWorkspace` (T5). La 5B (número, subtareas, tabla, panel editable, búsqueda, filtros de prioridad y proyecto) queda para su plan.
- **Ajustes respecto al spec:** la etiqueta de proyecto en las tareas y el campo "Proyecto" del formulario se adelantan a la 5A (sin ellos no se pueden poner tareas en proyectos). El alcance dentro de un proyecto empieza en "Todo el equipo" y se recuerda aparte.
- **Consistencia de nombres:** `contrastRatio`, `readableTextColor`, `PALETTE`, `Project`, `ProjectInput`, `ProjectPatch`, `createProject`, `updateProject`, `deleteProject`, `subscribeToProjects`, `useProjects`, `ProjectOf`, `makeProjectOf`, `ProjectTag`, `projectProgress`, `ProjectProgress`, `TaskWorkspace({ profile, projectId, renderHeader })`, `ColorPicker`, `ProjectCard`, `ProjectDialog`, `ProjectsPage`, `ProjectPage`.
