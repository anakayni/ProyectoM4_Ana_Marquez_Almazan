# Etapa 9D v2 — Compartir proyecto y acceso del Invitado — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Caras de las personas en tarjetas y página de proyecto, un diálogo "Compartir proyecto" (buscar, invitar, acceso por Invitado, hacer responsable) que se abre también al crear un proyecto, y acceso "Solo ver" / "Puede editar" por proyecto garantizado por las reglas.

**Architecture:** `projects/{id}.guestAccess` (mapa opcional, sin entrada = `'edit'`) lo cambia solo el admin; las reglas usan `guestEdits(pid)` para escribir. Lógica pura en `src/features/projects/projectAccess.ts` y `projectPeople.ts`. `AvatarGroup` dibuja las caras; `ShareProjectDialog` reemplaza la lista actual. Las vistas reciben `canEditTask(task)` para decidir tarea por tarea.

**Tech Stack:** React 19 + TS, Firebase 12 (reglas + emulador), Vitest + RTL.

**Spec:** `docs/specs/2026-10-13-v2-etapa9-invitados-design.md`, sección 10.

## Global Constraints

- Acceso: `'view'` → "Solo ver", `'edit'` → "Puede editar". Nuevo Invitado agregado: `'view'`. Sin entrada: `'edit'`.
- Solo el admin agrega, quita, cambia acceso y "Hace responsable" desde el diálogo; los demás ven la lista sin controles.
- Cada cambio se guarda al momento (auditado); el pie del diálogo dice "Listo" (o "Ahora no" recién creado).
- El enlace copiado es la URL del proyecto; no hace nada público.
- Textos: "Personas del proyecto", "Agregar persona al proyecto", "Compartir proyecto", "¡Proyecto creado!", "Enlace del proyecto", "Copiar", "Agregar personas", "Invitar a {email} como Invitado", "En este proyecto", "Tú", "Responsable", "Hacer responsable", "Quitar", "Listo", "Ahora no".
- Contraste ≥ 4.5:1, sin hex en componentes, todo con teclado.
- `npm test`, `npm run build`, `npm run lint` (y `npm run test:rules` en la tarea 1) antes de cada commit; un commit por tarea con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Acceso del Invitado por proyecto (datos y reglas)

**Files:** `firestore.rules`, `src/types/project.ts`, `src/services/projects.service.ts` (`toProject`), `src/services/audited/people.ts`, `src/features/projects/projectAccess.ts` (nuevo); tests `tests/rules/access.rules.test.ts` (nuevo), `tests/unit/projectAccess.test.ts` (nuevo).

**Interfaces (produce):**
- `type GuestAccess = 'view' | 'edit'`; `Project.guestAccess?: Record<string, GuestAccess>`
- `guestAccessOf(project, uid): GuestAccess | null` (null si no está en `memberIds`)
- `canEditInProject(role: Role, uid: string, project: Project | null): boolean`
- `setProjectMembers(db, actorId, projectId, memberIds, access?: Record<string, GuestAccess>)`: agrega a los Invitados nuevos en `'view'`, borra las entradas de quienes salen, y aplica `access` si viene.

- [ ] **Step 1: Tests que fallan**

```ts
// tests/unit/projectAccess.test.ts
import { describe, expect, it } from 'vitest';
import { canEditInProject, guestAccessOf } from '@/features/projects/projectAccess';
import type { Project } from '@/types/project';

const project = { id: 'p1', ownerId: 'ana', memberIds: ['gus', 'leo'], guestAccess: { gus: 'view' } } as unknown as Project;

describe('acceso del Invitado', () => {
  it('sin entrada puede editar; con "view" solo ve; fuera del proyecto, nada', () => {
    expect(guestAccessOf(project, 'gus')).toBe('view');
    expect(guestAccessOf(project, 'leo')).toBe('edit');
    expect(guestAccessOf(project, 'otro')).toBeNull();
  });

  it('el equipo edita en cualquier proyecto; el Invitado según su acceso', () => {
    expect(canEditInProject('member', 'ana', project)).toBe(true);
    expect(canEditInProject('viewer', 'vera', project)).toBe(false);
    expect(canEditInProject('guest', 'gus', project)).toBe(false);
    expect(canEditInProject('guest', 'leo', project)).toBe(true);
    expect(canEditInProject('guest', 'leo', null)).toBe(false);
  });
});
```

```ts
// tests/rules/access.rules.test.ts
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getDoc, doc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setProjectMembers } from '@/services/audited/people';
import { updateProject } from '@/services/audited/projects';
import { createTask, deleteTask, updateTask } from '@/services/audited/tasks';
import type { ProjectPatch } from '@/types/project';
import { createEnv, dbAs, seedCounter, seedProject, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const input = { title: 'T', description: '', priority: 'media' as const, dueDate: null, assigneeId: null, projectId: 'p1' };

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
  await seedUser(env, 'gus', 'guest');
  await seedUser(env, 'leo', 'guest');
  await seedCounter(env);
  await seedProject(env, 'p1', { ownerId: 'ana', memberIds: ['leo'] }); // leo: ya estaba, sin entrada = puede editar
});

describe('acceso del Invitado por proyecto', () => {
  it('quien se agrega empieza en "Solo ver" y no puede trabajar', async () => {
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo', 'gus']);
    const data = (await getDoc(doc(as('admin'), 'projects', 'p1'))).data();
    expect(data?.guestAccess).toEqual({ gus: 'view' });
    await assertFails(createTask(as('gus'), 'gus', input));
    const id = await createTask(as('ana'), 'ana', input);
    await assertFails(updateTask(as('gus'), 'gus', id, { title: 'x' }));
    await assertFails(updateTask(as('gus'), 'gus', id, { status: 'doing' }));
  });

  it('"Puede editar" (o sin entrada) trabaja como hoy', async () => {
    await assertSucceeds(createTask(as('leo'), 'leo', input));
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo', 'gus'], { gus: 'edit' });
    const own = await createTask(as('gus'), 'gus', input);
    await assertSucceeds(updateTask(as('gus'), 'gus', own, { title: 'Editada' }));
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo', 'gus'], { gus: 'view' });
    await assertFails(deleteTask(as('gus'), 'gus', own));
  });

  it('solo el admin cambia el acceso', async () => {
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo', 'gus']);
    await assertFails(updateProject(as('ana'), 'ana', 'p1', { guestAccess: { gus: 'edit' } } as unknown as ProjectPatch));
    await assertFails(setProjectMembers(as('ana'), 'ana', 'p1', ['leo', 'gus'], { gus: 'edit' }));
  });

  it('al salir del proyecto se borra su acceso', async () => {
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo', 'gus']);
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo']);
    expect((await getDoc(doc(as('admin'), 'projects', 'p1'))).data()?.guestAccess).toEqual({});
  });
});
```

- [ ] **Step 2: Ver que fallan** — `npx vitest run tests/unit/projectAccess.test.ts` y `npm run test:rules`.

- [ ] **Step 3: Implementación**

`src/types/project.ts`: `export type GuestAccess = 'view' | 'edit';` y en `Project`: `/** Acceso de cada Invitado en este proyecto; sin entrada = "Puede editar". */ guestAccess?: Record<string, GuestAccess>;`. `toProject`: `guestAccess: d.guestAccess ?? {},`.

```ts
// src/features/projects/projectAccess.ts
import { can } from '@/features/auth/permissions';
import type { Role } from '@/types/auth';
import type { GuestAccess, Project } from '@/types/project';

export const ACCESS_LABEL: Record<GuestAccess, string> = { view: 'Solo ver', edit: 'Puede editar' };

/** Acceso de un Invitado en el proyecto: sin entrada = "Puede editar" (los agregados antes no pierden permisos). */
export function guestAccessOf(project: Pick<Project, 'memberIds' | 'guestAccess'>, uid: string): GuestAccess | null {
  if (!(project.memberIds ?? []).includes(uid)) return null;
  return project.guestAccess?.[uid] ?? 'edit';
}

/** Si alguien puede crear, editar o cambiar el estado de tareas en ese proyecto. */
export function canEditInProject(role: Role, uid: string, project: Project | null): boolean {
  if (role !== 'guest') return can({ uid, role }, 'task:edit');
  return project !== null && guestAccessOf(project, uid) === 'edit';
}
```

`people.ts` — `setProjectMembers(db, actorId, projectId, memberIds, access?)`: dentro de la transacción, además de lo de hoy:

```ts
    const users = await Promise.all(added.map((uid) => tx.get(doc(db, 'users', uid))));
    const previousAccess: Record<string, string> = before.guestAccess ?? {};
    const guestAccess: Record<string, string> = {};
    for (const uid of next) {
      const isNewGuest = added.includes(uid) && users[added.indexOf(uid)]?.data()?.role === 'guest';
      const value = access?.[uid] ?? previousAccess[uid] ?? (isNewGuest ? 'view' : undefined);
      if (value) guestAccess[uid] = value;
    }
    const after = { ...before, memberIds: next, guestAccess, rev, updatedBy: actorId, updatedAt: serverTimestamp() };
```

Reglas:
- `validProject`: sumar `'guestAccess'` a `hasOnly` y `&& (!('guestAccess' in d) || (d.guestAccess is map && d.guestAccess.size() <= 50))`.
- `create`: `&& (!('guestAccess' in request.resource.data) || isAdmin())`; `update`: `!changed().hasAny(['memberIds'])` → `!changed().hasAny(['memberIds', 'guestAccess'])`.
- Nueva función y uso:

```
    // El Invitado puede trabajar en el proyecto: está en la lista y su acceso es "Puede editar" (sin entrada = editar).
    function guestEdits(pid) {
      return guestIn(pid) && get(projectPath(pid)).data.get('guestAccess', {}).get(request.auth.uid, 'edit') == 'edit';
    }
    function canWork(pid) { return canEdit() || (isGuest() && guestEdits(pid)); }
```

  En `update` de tareas, `(canEdit() || guestIn(resource.data.projectId))` → `(canEdit() || guestEdits(resource.data.projectId))`; en `delete`, `guestIn(resource.data.projectId)` → `guestEdits(resource.data.projectId)`.

- [ ] **Step 4: Ver que pasan** — `npm run test:rules && npm test && npm run build && npm run lint`.
- [ ] **Step 5: Commit** — `feat(v2): acceso "Solo ver" o "Puede editar" del Invitado en cada proyecto`

---

### Task 2: Caras de las personas

**Files:** `src/components/layout/AvatarGroup.tsx` (+ css, nuevo), `src/components/projects/ProjectCard.tsx`, `src/pages/ProjectsPage.tsx`, `src/components/projects/ProjectPeople.tsx`; tests `tests/components/AvatarGroup.test.tsx` (nuevo), `tests/components/ProjectCard.test.tsx`, `tests/components/ProjectPeople.test.tsx`.

**Interfaces:** `<AvatarGroup people={{ name, photo, active }[]} max={number} overlap={boolean} />`; `ProjectCard` prop `people?: PersonRow[]`; `ProjectPeople` muestra caras + "+" (admin) y abre el diálogo (Task 3).

- [ ] **Step 1: Tests que fallan**

```tsx
// tests/components/AvatarGroup.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvatarGroup } from '@/components/layout/AvatarGroup';

const people = ['Ana', 'Gus', 'Leo', 'Mar', 'Sol'].map((name) => ({ name, photo: null, active: true }));

describe('AvatarGroup', () => {
  it('muestra hasta el máximo y "+N" con el resto', () => {
    render(<AvatarGroup people={people} max={3} overlap />);
    const group = screen.getByRole('img', { name: 'Personas: Ana, Gus, Leo y 2 más' });
    expect(group).toHaveTextContent('2+');
  });

  it('sin resto no muestra "+N"', () => {
    render(<AvatarGroup people={people.slice(0, 2)} max={3} />);
    expect(screen.getByRole('img', { name: 'Personas: Ana y Gus' })).not.toHaveTextContent('+');
  });
});
```

En `ProjectCard.test.tsx`: con `people` de 4 personas, existe `getByRole('img', { name: /^Personas: / })` con "1+". En `ProjectPeople.test.tsx` (ajustar a la nueva UI): el admin ve el botón "Agregar persona al proyecto"; un no admin no lo ve; el botón de las caras se llama "Ver personas del proyecto".

- [ ] **Step 2: Ver que fallan.**
- [ ] **Step 3: Implementación**

```tsx
// src/components/layout/AvatarGroup.tsx
import { Avatar } from './Avatar';
import styles from './AvatarGroup.module.css';

type Person = { name: string; photo: string | null; active: boolean };
type Props = { people: Person[]; max: number; overlap?: boolean };

function listLabel(names: string[], rest: number): string {
  if (rest > 0) return `${names.join(', ')} y ${rest} más`;
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : (names[0] ?? 'nadie');
}

/** Caras de varias personas (superpuestas o separadas) con "+N" para el resto. */
export function AvatarGroup({ people, max, overlap = false }: Props) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={`${styles.group} ${overlap ? styles.overlap : ''}`} role="img" aria-label={`Personas: ${listLabel(shown.map((p) => p.name), rest)}`}>
      {shown.map((p) => <span key={p.name} className={styles.face}><Avatar name={p.name} photo={p.photo} inactive={!p.active} /></span>)}
      {rest > 0 && <span className={`${styles.face} ${styles.more}`}>{rest}+</span>}
    </span>
  );
}
```

```css
/* src/components/layout/AvatarGroup.module.css */
.group { display: inline-flex; align-items: center; gap: var(--space-2); }
.overlap { gap: 0; }
.overlap .face + .face { margin-left: calc(-1 * var(--space-2)); }
.face { display: inline-flex; border-radius: 50%; box-shadow: 0 0 0 2px var(--color-surface-default); }
.more {
  width: 32px; height: 32px; align-items: center; justify-content: center;
  background: var(--color-done-chip); color: var(--color-done-chip-text); font-size: var(--text-xs); font-weight: var(--weight-semibold);
}
```

- `ProjectCard`: prop `people?: PersonRow[]`; si hay personas, debajo del responsable: `<AvatarGroup people={people.map(({ name, photo, active }) => ({ name, photo, active }))} max={3} overlap />`.
- `ProjectsPage`: `people={peopleRows(project, members)}`.
- `ProjectPeople`: reemplazar el resumen por un título "Personas del proyecto" + un botón sin borde con nombre "Ver personas del proyecto" que contiene `<AvatarGroup … max={5} />` + (admin) un botón circular punteado `aria-label="Agregar persona al proyecto"` con un ícono `Plus` de lucide. Ambos abren el diálogo; el "+" con el foco en el buscador.
  CSS del "+": `.add { width: 32px; height: 32px; border-radius: 50%; border: 2px dashed var(--color-border-strong); background: none; color: var(--color-text-secondary); display: inline-grid; place-items: center; cursor: pointer; }`.

- [ ] **Step 4–5:** verde y commit `feat(v2): caras de las personas en tarjetas y página del proyecto`

---

### Task 3: Diálogo "Compartir proyecto"

**Files:** `src/components/projects/ShareProjectDialog.tsx` (+ css, nuevo; reemplaza el `PeopleDialog` de `ProjectPeople.tsx`), `src/features/projects/projectPeople.ts` (`searchPeople`, `isNewEmail`), `src/services/projects.service.ts` (`setProjectMembers` con `access`); tests `tests/unit/projectPeople.test.ts`, `tests/components/ShareProjectDialog.test.tsx` (nuevo; mover ahí los casos del diálogo de `ProjectPeople.test.tsx`).

**Interfaces:**
- `searchPeople(project, members, query): UserProfile[]` — `addableMembers` filtrados por nombre o email (sin tildes, sin mayúsculas).
- `isNewEmail(query, members, pendingEmails): boolean` — formato de email válido y que no sea de nadie del espacio ni una invitación pendiente.
- `<ShareProjectDialog project members tasks actorId canManage justCreated? onClose />`

- [ ] **Step 1: Tests que fallan** (resumen de casos; código al estilo de `ProjectPeople.test.tsx`, con `setProjectMembers`, `updateProject` y `createInvitation` mockeados):
  - Muestra "Enlace del proyecto" con `…/projects/p1` y "Copiar" (con `navigator.clipboard.writeText` mockeado, llamado con esa URL).
  - El admin escribe "le" en "Agregar personas": aparece "Leo (Invitado)"; al elegirlo llama `setProjectMembers('admin', 'p1', ['gus', 'leo'])` (el acceso inicial lo pone el servicio).
  - Escribe `nuevo@x.com`: aparece "Invitar a nuevo@x.com como Invitado"; al tocarlo llama `createInvitation('admin', 'nuevo@x.com', 'guest')` y avisa "Invitación creada. Cuando cree su cuenta, agrégala desde aquí."
  - Fila de un Invitado: selector "Acceso de Gus" con "Solo ver"/"Puede editar"; cambiarlo llama `setProjectMembers('admin', 'p1', ['gus'], { gus: 'edit' })`. "Quitar a Gus" + confirmación (el mensaje de hoy) llama sin `gus`.
  - Fila del responsable: texto "Responsable", sin selector.
  - Fila de un miembro de la lista: su rol ("Miembro") y botón "Hacer responsable" → confirmación "¿Hacer responsable a Leo?" → `updateProject('admin', 'p1', { ownerId: 'leo' })`.
  - Quien no es admin: sin buscador, sin selectores ni botones.
  - Con `justCreated`: título "¡Proyecto creado!" y botón "Ahora no"; sin él: "Compartir proyecto" y "Listo".
  - En `projectPeople.test.ts`: `searchPeople` encuentra por nombre sin tildes y por email; `isNewEmail('nuevo@x.com', …)` true, con email de alguien del espacio o pendiente false, con texto que no es email false.

- [ ] **Step 2: Ver que fallan.**
- [ ] **Step 3: Implementación** — `ShareProjectDialog` con `Modal`:
  - Encabezado: título según `justCreated`; texto "Agrega a las personas que van a trabajar en «{name}»." (recién creado) o "Quiénes ven y trabajan en «{name}». Un Invitado solo ve los proyectos donde está.".
  - "Enlace del proyecto": input de solo lectura con `${window.location.origin}/projects/${id}` + botón "Copiar" (avisa "Enlace copiado." o, si falla, "Selecciónalo y cópialo a mano.").
  - (admin) "Agregar personas": `<input type="search">` con etiqueta visible; debajo, una lista de botones con `searchPeople(...)` (máximo 6; "Nombre (Invitado)" si corresponde) y, si `isNewEmail`, el botón "Invitar a {email} como Invitado". Agregar = `setProjectMembers(actorId, id, [...memberIds, uid])`.
  - Invitaciones pendientes con rol Invitado (`usePendingGuestInvitations`) como ya existen.
  - "En este proyecto": `peopleRows(...)`; por fila: `Avatar`, nombre, etiqueta "Tú" (si `uid === actorId`), y a la derecha:
    - responsable → etiqueta "Responsable";
    - Invitado + admin → `<select aria-label="Acceso de {name}">` con `ACCESS_LABEL` (valor `guestAccessOf`) y botón "Quitar" (`aria-label="Quitar a {name}"`) con la confirmación de hoy;
    - Invitado sin admin → etiqueta con su acceso;
    - equipo → etiqueta con `ROLE_LABEL[role]` y (admin) botón "Hacer responsable" con confirmación.
  - Errores: `Alert` "No pudimos guardar el cambio. Inténtalo de nuevo."; cada acción deshabilita los controles mientras guarda.
  - Pie: botón "Listo" / "Ahora no" que cierra.
  - `ProjectPeople` usa este diálogo; `projects.service.setProjectMembers(actorId, projectId, memberIds, access?)`.

- [ ] **Step 4–5:** verde y commit `feat(v2): diálogo "Compartir proyecto" con buscador y acceso por Invitado`

---

### Task 4: Tareas según el acceso del Invitado

**Files:** `TodoList.tsx`/`TodoItem.tsx`, `TaskTable.tsx`, `TaskBoard.tsx`, `TaskWorkspace.tsx`, `TaskDialogs.tsx`; test `tests/components/guestAccessTasks.test.tsx` (nuevo).

**Interfaces:** prop opcional `canEditTask?: (task: Task) => boolean` en las tres vistas (si está, manda sobre `canEdit` para el selector de estado de cada tarea).

- [ ] **Step 1: Tests que fallan** — `TaskWorkspace` como Invitado con dos proyectos (`p1` con `guestAccess: { g: 'view' }`, `p2` sin entrada) y una tarea en cada uno: la de `p1` muestra el estado como etiqueta (sin selector) y la de `p2` con selector; "+ Nueva tarea" existe y el formulario solo ofrece `p2`. Con solo `p1` ("Solo ver"), no hay "+ Nueva tarea".
- [ ] **Step 2: Ver que fallan.**
- [ ] **Step 3: Implementación**
  - Vistas: `const editable = canEditTask ? canEditTask(task) : canEdit;` en cada fila/tarjeta.
  - `TaskWorkspace`: `const projectOf = makeProjectOf(projects)` (ya existe); `const canEditTask = (task: Task) => canEditInProject(profile.role, profile.uid, projectOf(task.projectId));`; para el Invitado, `editableProjects = projects.filter((p) => canEditInProject(profile.role, profile.uid, p))` y `canCreate` = hay al menos uno; pasar `canEditTask` a las vistas.
  - `TaskDialogs`: para el panel, `canEdit={canEditInProject(profile.role, profile.uid, projectOf(openTask.projectId))}` y `canDelete` además lo exige para el Invitado; "Nueva tarea" usa `projects.filter(p => !p.archived && canEditInProject(...))`.
- [ ] **Step 4–5:** verde y commit `feat(v2): el Invitado edita solo donde tiene "Puede editar"`

---

### Task 5: Al crear un proyecto + frases de auditoría

**Files:** `ProjectDialog.tsx` (prop `onCreated?: (id: string) => void`), `ProjectsPage.tsx`, `describeAuditEntry.ts`, `auditFields.ts`; tests `tests/components/ProjectsPage.test.tsx`, `tests/unit/describeAuditEntry.test.ts`, `tests/unit/auditFields.test.ts`.

- [ ] **Step 1: Tests que fallan**
  - `ProjectsPage` como admin: crear un proyecto (con `createProject` mockeado devolviendo `'p9'` y `state.projects` incluyendo `p9`) abre el diálogo "¡Proyecto creado!"; como miembro no se abre.
  - Auditoría: `before.guestAccess = { gus: 'view' }`, `after = { gus: 'edit' }`, con `gus` en `memberIds` antes y después → `'Admin cambió a Gus a «Puede editar» en «Portal»'`; al agregar a alguien (entra a `memberIds` y a `guestAccess`) solo sale "agregó a …".
  - `fieldLabel('guestAccess')` = "Acceso de Invitados"; `formatAuditValue('guestAccess', { leo: 'view' }, ctx)` = "Leo: Solo ver".
- [ ] **Step 2: Ver que fallan.**
- [ ] **Step 3: Implementación**
  - `ProjectDialog`: `const id = await createProject(actorId, values); onCreated?.(id); onClose();`.
  - `ProjectsPage`: estado `sharingId`; `onCreated` solo si `can(me, 'project:people')`; cuando el proyecto aparece en `projects`, renderizar `<ShareProjectDialog … justCreated onClose={() => setSharingId(null)} />`.
  - `describeAuditEntry` (`projectSentences`): caso `'guestAccess'`: para cada uid con valor distinto entre antes y después **que esté en `memberIds` antes y después**, `${who} cambió a ${persona} a «${ACCESS_LABEL[valor]}» en «${name}»`.
  - `auditFields`: `guestAccess: 'Acceso de Invitados'` y formato `Nombre: Acceso`, separado por comas.
- [ ] **Step 4–5:** verde y commit `feat(v2): compartir al crear un proyecto y auditoría del acceso`

---

### Task 6: Reglas en dev, preview, prueba y documentación

- [ ] Publicar reglas en dev (script temporal) y preview (+ alias, producción 200).
- [ ] Prueba de la usuaria: caras en tarjetas y página; "+" abre el diálogo; buscar y agregar un Invitado (queda "Solo ver": como Invitado no puede crear ni editar ahí); pasarlo a "Puede editar" (ya puede); invitar un email nuevo; "Hacer responsable"; crear un proyecto como admin abre "¡Proyecto creado!".
- [ ] README (sección etapa 9: compartir y acceso), AI_LOG (agregar al cierre de la etapa 9), `CLAUDE.md` (quitar los pendientes de "Personas del proyecto" y anotar `guestAccess`). Commit `docs(v2): compartir proyecto en README, AI_LOG y contexto`.
