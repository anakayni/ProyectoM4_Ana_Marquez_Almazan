# Etapa 9A v2 — Invitados: rol, datos y reglas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que exista el rol Invitado y que, con las reglas de Firestore como garantía, un Invitado solo pueda leer y trabajar en los proyectos donde el admin lo puso, sin cambiar nada para admin, miembro y lector.

**Architecture:** `projects/{id}.memberIds` (auditado, solo admin) define quién está en cada proyecto; `projects/{id}/people/{uid}` guarda una tarjeta (nombre, foto, activo, invitado/equipo) que las reglas validan contra `users/{uid}`. Las reglas suman `isGuest`, `isTeam`, `guestIn`, `canWork` y `validAssignee(uid, pid)`. En la app, los hooks leen según el rol (el Invitado pide solo lo suyo) y los formularios ofrecen responsables según el proyecto.

**Tech Stack:** React 19 + TS, Firebase 12 (Firestore + reglas), firebase-admin 13 (email de resumen), Vitest + RTL, emulador de Firestore.

**Spec:** `docs/specs/2026-10-13-v2-etapa9-invitados-design.md` (parte 9A).

## Global Constraints

- Rol nuevo `guest`, etiqueta **"Invitado"**. Admin, miembro y lector: **sin cambios** de comportamiento.
- Invitado: trabaja con tareas **solo en sus proyectos**; no crea proyectos ni cambia sus datos; no ve Equipo, emails ni roles.
- `memberIds` es **opcional** (sin campo = lista vacía), ≤ 50, solo `isAdmin()` lo cambia. El Invitado nunca es responsable de proyecto.
- Personas del proyecto = `memberIds` ∪ `{ownerId}`.
- Tarjeta `projects/{id}/people/{uid}` = `{ uid, displayName, photo, active, role: 'guest' | 'team' }`, igual al perfil real; no se audita.
- Desconocido para el Invitado: **"Alguien del equipo"**.
- Toda escritura de entidades sigue auditada (`auditLog/{tipo}_{id}_{rev}`).
- Costo $0: sin Cloud Functions.
- `npm test`, `npm run build`, `npm run lint` en verde (y `npm run test:rules` en las tareas de reglas) antes de cada commit; un commit por tarea con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Rol Invitado y permisos en la app

**Files:**
- Modify: `src/types/auth.ts` (Role, ROLE_LABEL)
- Modify: `src/features/auth/permissions.ts`
- Modify: `src/features/navigation/navItems.ts`
- Modify: `src/components/team/InviteDialog.tsx`, `src/components/team/MemberRow.tsx` (rol en los selectores)
- Modify: `src/pages/ProjectsPage.tsx`, `src/pages/ProjectPage.tsx`, `src/pages/TeamPage.tsx`
- Test: `tests/unit/permissions.test.ts`, `tests/unit/navItems.test.ts`, `tests/components/InviteDialog.test.tsx`

**Interfaces:**
- Produces: `type Role = 'admin' | 'member' | 'viewer' | 'guest'`; `Action` suma `'project:create' | 'project:edit' | 'project:people' | 'team:view'`.

- [ ] **Step 1: Tests que fallan**

En `tests/unit/permissions.test.ts` agregar:

```ts
const guest = { uid: 'g', role: 'guest' as const };

describe('can — Invitado', () => {
  it('trabaja con tareas y borra solo lo que creó', () => {
    expect(can(guest, 'task:create')).toBe(true);
    expect(can(guest, 'task:edit')).toBe(true);
    expect(can(guest, 'task:delete', { createdBy: 'g' })).toBe(true);
    expect(can(guest, 'task:delete', { createdBy: 'otro' })).toBe(false);
  });

  it('no toca proyectos ni ve el equipo', () => {
    expect(can(guest, 'project:create')).toBe(false);
    expect(can(guest, 'project:edit')).toBe(false);
    expect(can(guest, 'project:people')).toBe(false);
    expect(can(guest, 'team:view')).toBe(false);
  });

  it('proyectos: admin y miembro los crean y editan; solo el admin maneja sus personas', () => {
    expect(can(member, 'project:create')).toBe(true);
    expect(can(member, 'project:edit')).toBe(true);
    expect(can(member, 'project:people')).toBe(false);
    expect(can(admin, 'project:people')).toBe(true);
    expect(can(viewer, 'project:edit')).toBe(false);
    expect(can(viewer, 'team:view')).toBe(true);
  });
});
```

En `tests/unit/navItems.test.ts` agregar:

```ts
  it('el Invitado ve Mis tareas, Proyectos y Calendario', () => {
    expect(navItems(profile('guest')).map((i) => i.key)).toEqual(['tasks', 'projects', 'calendar']);
  });
```

En `tests/components/InviteDialog.test.tsx` agregar (usa los mocks y el render que ya tiene el archivo; adaptar el nombre de la función de render a la existente):

```tsx
  it('ofrece el rol Invitado con su explicación', async () => {
    renderDialog();
    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'Invitado');
    expect(screen.getByText('Solo ve los proyectos a los que lo agregues.')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/unit/permissions.test.ts tests/unit/navItems.test.ts tests/components/InviteDialog.test.tsx`
Expected: FAIL (acciones y rol desconocidos; falta la opción "Invitado").

- [ ] **Step 3: Implementación**

`src/types/auth.ts`:

```ts
export type Role = 'admin' | 'member' | 'viewer' | 'guest';

export const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador', member: 'Miembro', viewer: 'Lector', guest: 'Invitado' };
```

`src/features/auth/permissions.ts` (completo):

```ts
import type { Role } from '@/types/auth';

export type Action =
  | 'task:create' | 'task:edit' | 'task:delete'
  | 'project:create' | 'project:edit' | 'project:people'
  | 'team:view' | 'team:manage' | 'audit:read-all';

type Actor = { uid: string; role: Role } | null;

/**
 * Permisos para la UI (mostrar u ocultar acciones).
 * La seguridad real la imponen las reglas de Firestore: esta función debe coincidir con firestore.rules.
 * El Invitado trabaja con tareas solo en sus proyectos: eso lo garantizan las reglas y las listas que ve.
 */
export function can(actor: Actor, action: Action, ctx: { createdBy?: string } = {}): boolean {
  if (!actor) return false;
  const { role, uid } = actor;
  switch (action) {
    case 'task:create':
    case 'task:edit':
      return role === 'admin' || role === 'member' || role === 'guest';
    case 'task:delete':
      return role === 'admin' || ((role === 'member' || role === 'guest') && ctx.createdBy === uid);
    case 'project:create':
    case 'project:edit':
      return role === 'admin' || role === 'member';
    case 'team:view':
      return role !== 'guest';
    case 'project:people':
    case 'team:manage':
    case 'audit:read-all':
      return role === 'admin';
  }
}
```

`src/features/navigation/navItems.ts`: reemplazar el `return items.filter(...)` por:

```ts
  return items.filter(
    (item) => (item.key !== 'settings' || can(profile, 'team:manage')) && (item.key !== 'team' || can(profile, 'team:view')),
  );
```

`InviteDialog.tsx`: `const ROLES: Role[] = ['member', 'viewer', 'guest', 'admin'];` y debajo del `<select id="invite-role">` (dentro del mismo `Field`) agregar:

```tsx
          {role === 'guest' && <p className={styles.hint}>Solo ve los proyectos a los que lo agregues.</p>}
```

(Si `InviteDialog.module.css` no tiene `.hint`, agregar `.hint { font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--space-1); }`.)

`MemberRow.tsx`: `const ROLES: Role[] = ['admin', 'member', 'viewer', 'guest'];`

`ProjectsPage.tsx`: el botón "+ Nuevo proyecto" usa `can(me, 'project:create')`.

`ProjectPage.tsx`: `const canEdit = can(me, 'project:edit');` (controla Editar y Archivar del proyecto). Si `canEdit` también se pasa al área de tareas, usar ahí `can(me, 'task:edit')` en una constante aparte `canEditTasks`.

`TeamPage.tsx`: al inicio del componente, después de obtener `me`:

```tsx
  if (!can(me, 'team:view')) return <Navigate to="/tasks" replace />;
```

(importar `Navigate` de `react-router`; los hooks del componente deben quedar **antes** de este `return`).

- [ ] **Step 4: Ver que pasan**

Run: `npm test && npm run build && npm run lint`
Expected: verde. Si `tsc` marca algún `Record<Role, …>` incompleto, agregarle la clave `guest`.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(v2): rol Invitado y permisos de proyecto en la app"
```

---

### Task 2: Reglas del Invitado (lectura y tareas)

**Files:**
- Modify: `firestore.rules`
- Modify: `tests/rules/helpers.ts` (agregar `seedProject`)
- Create: `tests/rules/guest.rules.test.ts`

**Interfaces:**
- Produces (reglas): `isGuest()`, `isTeam()`, `memberIdsOf(p)`, `guestIn(pid)`, `inProject(uid, pid)`, `canWork(pid)`, `taskPath(id)`, `validOwner(uid)`, `isGuestUser(uid)`, `validAssignee(uid, pid)`, `guestAssigns(uid, pid)`.
- Produces (tests): `seedProject(env, id, { ownerId, memberIds?, archived? })`.

- [ ] **Step 1: Helper y tests que fallan**

Agregar a `tests/rules/helpers.ts`:

```ts
/** Proyecto válido (sin pasar por las reglas). `memberIds` se omite si no se pasa, como en los proyectos viejos. */
export async function seedProject(
  env: RulesTestEnvironment,
  id: string,
  data: { ownerId: string; memberIds?: string[]; archived?: boolean },
): Promise<void> {
  await seed(env, (db) =>
    setDoc(doc(db, 'projects', id), {
      name: id, description: '', color: '#1B4079', ownerId: data.ownerId,
      startDate: '2026-10-01', endDate: '2026-12-31', archived: data.archived ?? false,
      createdBy: data.ownerId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), updatedBy: data.ownerId, rev: 1,
      ...(data.memberIds && { memberIds: data.memberIds }),
    }),
  );
}
```

```ts
// tests/rules/guest.rules.test.ts
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { createInvitation } from '@/services/audited/invitations';
import { updateProject } from '@/services/audited/projects';
import { createTask, deleteTask, updateTask } from '@/services/audited/tasks';
import type { ProjectPatch } from '@/types/project';
import { createEnv, dbAs, seedCounter, seedProject, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const input = (projectId: string | null, assigneeId: string | null = null) => ({
  title: 'T', description: '', priority: 'media' as const, dueDate: null, assigneeId, projectId,
});
/** `memberIds` todavía no es parte de ProjectPatch: así se prueba la regla directamente. */
const members = (ids: string[]) => ({ memberIds: ids }) as unknown as ProjectPatch;

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
  await seedUser(env, 'otro', 'guest');
  await seedCounter(env);
  await seedProject(env, 'p1', { ownerId: 'ana', memberIds: ['gus'] });
  await seedProject(env, 'p2', { ownerId: 'ana' });
});

describe('Invitado: lectura', () => {
  it('ve sus proyectos y no los demás', async () => {
    const db = as('gus');
    await assertSucceeds(getDocs(query(collection(db, 'projects'), where('memberIds', 'array-contains', 'gus'))));
    await assertSucceeds(getDoc(doc(db, 'projects', 'p1')));
    await assertFails(getDoc(doc(db, 'projects', 'p2')));
    await assertFails(getDocs(collection(db, 'projects')));
  });

  it('ve las tareas de su proyecto, no las de otro ni todas', async () => {
    await createTask(as('ana'), 'ana', input('p1'));
    await createTask(as('ana'), 'ana', input('p2'));
    const db = as('gus');
    await assertSucceeds(getDocs(query(collection(db, 'tasks'), where('projectId', '==', 'p1'))));
    await assertFails(getDocs(query(collection(db, 'tasks'), where('projectId', '==', 'p2'))));
    await assertFails(getDocs(collection(db, 'tasks')));
  });

  it('solo lee su propio perfil', async () => {
    const db = as('gus');
    await assertSucceeds(getDoc(doc(db, 'users', 'gus')));
    await assertFails(getDoc(doc(db, 'users', 'ana')));
    await assertFails(getDocs(collection(db, 'users')));
  });

  it('lee el historial de las tareas de su proyecto y no el de otras', async () => {
    const mine = await createTask(as('ana'), 'ana', input('p1'));
    const other = await createTask(as('ana'), 'ana', input('p2'));
    const history = (id: string) =>
      getDocs(query(collection(as('gus'), 'auditLog'), where('entityType', '==', 'task'), where('entityId', '==', id)));
    await assertSucceeds(history(mine));
    await assertFails(history(other));
  });

  it('el resto del equipo sigue leyendo todo', async () => {
    await assertSucceeds(getDocs(collection(as('ana'), 'projects')));
    await assertSucceeds(getDocs(collection(as('ana'), 'tasks')));
    await assertSucceeds(getDocs(collection(as('ana'), 'users')));
  });
});

describe('Invitado: tareas', () => {
  it('crea tareas en su proyecto, no sin proyecto ni en otro', async () => {
    await assertSucceeds(createTask(as('gus'), 'gus', input('p1')));
    await assertFails(createTask(as('gus'), 'gus', input(null)));
    await assertFails(createTask(as('gus'), 'gus', input('p2')));
  });

  it('no saca una tarea de su proyecto ni trae una de afuera', async () => {
    const mine = await createTask(as('ana'), 'ana', input('p1'));
    const other = await createTask(as('ana'), 'ana', input('p2'));
    await assertSucceeds(updateTask(as('gus'), 'gus', mine, { title: 'Editada' }));
    await assertFails(updateTask(as('gus'), 'gus', mine, { projectId: 'p2' }));
    await assertFails(updateTask(as('gus'), 'gus', other, { projectId: 'p1' }));
  });

  it('asigna solo a personas del proyecto', async () => {
    await assertSucceeds(createTask(as('gus'), 'gus', input('p1', 'ana')));
    await assertSucceeds(createTask(as('gus'), 'gus', input('p1', 'gus')));
    await assertFails(createTask(as('gus'), 'gus', input('p1', 'admin')));
  });

  it('un miembro asigna a un Invitado solo si está en ese proyecto', async () => {
    await assertSucceeds(createTask(as('ana'), 'ana', input('p1', 'gus')));
    await assertFails(createTask(as('ana'), 'ana', input('p1', 'otro')));
    const task = await createTask(as('ana'), 'ana', input('p1', 'gus'));
    await assertFails(updateTask(as('ana'), 'ana', task, { projectId: 'p2' }));
  });

  it('elimina solo las tareas que creó', async () => {
    const own = await createTask(as('gus'), 'gus', input('p1'));
    const others = await createTask(as('ana'), 'ana', input('p1'));
    await assertSucceeds(deleteTask(as('gus'), 'gus', own));
    await assertFails(deleteTask(as('gus'), 'gus', others));
  });
});

describe('Proyectos y personas', () => {
  it('el Invitado no cambia datos del proyecto', async () => {
    await assertFails(updateProject(as('gus'), 'gus', 'p1', { name: 'Otro nombre' }));
  });

  it('solo el admin cambia la lista de personas', async () => {
    await assertFails(updateProject(as('ana'), 'ana', 'p1', members(['gus', 'otro'])));
    await assertSucceeds(updateProject(as('admin'), 'admin', 'p1', members(['gus', 'otro'])));
  });

  it('un Invitado no puede ser responsable de un proyecto', async () => {
    await assertFails(updateProject(as('admin'), 'admin', 'p1', { ownerId: 'gus' }));
  });

  it('el admin puede invitar con el rol Invitado', async () => {
    await assertSucceeds(createInvitation(as('admin'), 'admin', 'nuevo@test.com', 'guest'));
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npm run test:rules`
Expected: FAIL — el Invitado no puede crear tareas (`canEdit`), lee todo (`isActive`), no existe el rol en invitaciones, etc. Los tests de los demás archivos siguen pasando.

- [ ] **Step 3: Reglas**

En el bloque "Identidad y rol", debajo de `canEdit()`:

```
    function isGuest() { return hasRole(['guest']); }
    // Admin, miembro y lector ven todo el espacio; el Invitado, solo sus proyectos.
    function isTeam() { return hasRole(['admin', 'member', 'viewer']); }
```

Debajo de `function projectPath(id) { … }`:

```
    function taskPath(id) { return /databases/$(database)/documents/tasks/$(id); }
    function memberIdsOf(p) { return p.get('memberIds', []); }

    // El Invitado está en la lista de personas del proyecto.
    function guestIn(pid) {
      return pid != null && exists(projectPath(pid)) && request.auth.uid in memberIdsOf(get(projectPath(pid)).data);
    }
    // Persona del proyecto: su responsable o alguien de la lista.
    function inProject(uid, pid) {
      return pid != null && exists(projectPath(pid))
        && (uid == get(projectPath(pid)).data.ownerId || uid in memberIdsOf(get(projectPath(pid)).data));
    }
    // Admin y miembro trabajan en cualquier tarea; el Invitado solo en las de sus proyectos.
    function canWork(pid) { return canEdit() || (isGuest() && guestIn(pid)); }
```

Reemplazar la función `validAssignee(uid)` completa por:

```
    // Responsable de un proyecto: admin o miembro activo (solo se revisa cuando cambia).
    function validOwner(uid) {
      return exists(userPath(uid))
        && get(userPath(uid)).data.active == true
        && get(userPath(uid)).data.role in ['admin', 'member'];
    }
    function isGuestUser(uid) { return uid != null && exists(userPath(uid)) && get(userPath(uid)).data.role == 'guest'; }

    // Responsable de una tarea: admin o miembro activo, o un Invitado activo que esté en el proyecto de la tarea.
    function validAssignee(uid, pid) {
      return uid == null || validOwner(uid)
        || (isGuestUser(uid) && get(userPath(uid)).data.active == true
            && pid != null && exists(projectPath(pid)) && uid in memberIdsOf(get(projectPath(pid)).data));
    }
    // Si quien asigna es Invitado, solo puede elegir personas del proyecto.
    function guestAssigns(uid, pid) { return !isGuest() || uid == null || inProject(uid, pid); }
```

Reemplazar el `match /tasks/{taskId} { … }` completo por:

```
    match /tasks/{taskId} {
      allow read: if isTeam() || (isGuest() && guestIn(resource.data.projectId));
      allow create: if canWork(request.resource.data.projectId)
        && validTask(request.resource.data)
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.createdAt == request.time
        && request.resource.data.rev == 1
        && validAssignee(request.resource.data.assigneeId, request.resource.data.projectId)
        && guestAssigns(request.resource.data.assigneeId, request.resource.data.projectId)
        && completionOnCreate(request.resource.data)
        && validProjectRef(request.resource.data.projectId)
        && request.resource.data.number == get(counterPath()).data.next
        && getAfter(counterPath()).data.next == request.resource.data.number + 1
        && audited('task', taskId, 1);
      allow update: if canWork(request.resource.data.projectId)
        // El Invitado tampoco puede traer una tarea de un proyecto ajeno.
        && (canEdit() || guestIn(resource.data.projectId))
        && validTask(request.resource.data)
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.createdAt == resource.data.createdAt
        && request.resource.data.number == resource.data.number
        && (!changed().hasAny(['assigneeId'])
            || (validAssignee(request.resource.data.assigneeId, request.resource.data.projectId)
                && guestAssigns(request.resource.data.assigneeId, request.resource.data.projectId)))
        // Si la tarea cambia de proyecto y su responsable es Invitado, tiene que estar también en el nuevo.
        && (!changed().hasAny(['projectId']) || !isGuestUser(request.resource.data.assigneeId)
            || validAssignee(request.resource.data.assigneeId, request.resource.data.projectId))
        && completionOnUpdate(request.resource.data, resource.data)
        && (!changed().hasAny(['projectId']) || validProjectRef(request.resource.data.projectId))
        && nextRev()
        && audited('task', taskId, request.resource.data.rev);
      allow delete: if (isAdmin()
          || (hasRole(['member']) && resource.data.createdBy == request.auth.uid)
          || (isGuest() && resource.data.createdBy == request.auth.uid && guestIn(resource.data.projectId)))
        && audited('task', taskId, resource.data.rev + 1);
    }
```

Contador: en `match /counters/tasks`, `allow update: if canEdit()` → `allow update: if (canEdit() || isGuest())`.

Proyectos — en `validProject(d)`: agregar `'memberIds'` a la lista de `hasOnly` y la línea:

```
        && (!('memberIds' in d) || (d.memberIds is list && d.memberIds.size() <= 50))
```

y en `match /projects/{projectId}`:

```
      allow read: if isTeam() || (isGuest() && 'memberIds' in resource.data && request.auth.uid in resource.data.memberIds);
```

En `create`: `validAssignee(request.resource.data.ownerId)` → `validOwner(request.resource.data.ownerId)` y agregar `&& (!('memberIds' in request.resource.data) || isAdmin())`.
En `update`: `validAssignee(request.resource.data.ownerId)` → `validOwner(request.resource.data.ownerId)` y agregar `&& (!changed().hasAny(['memberIds']) || isAdmin())`.

Invitaciones: en las dos listas `request.resource.data.role in ['admin', 'member', 'viewer']` → `['admin', 'member', 'viewer', 'guest']`.

Usuarios: `allow read: if isActive() || (signedIn() && request.auth.uid == uid);` → `allow read: if isTeam() || (signedIn() && request.auth.uid == uid);` y en la rama del admin `request.resource.data.role in ['admin', 'member', 'viewer']` → `['admin', 'member', 'viewer', 'guest']`.

Auditoría: reemplazar `allow read` de `match /auditLog/{logId}` por:

```
      allow read: if isAdmin()
        || (isTeam() && resource.data.entityType in ['task', 'project'])
        || (isGuest() && resource.data.entityType == 'task'
            && exists(taskPath(resource.data.entityId)) && guestIn(get(taskPath(resource.data.entityId)).data.projectId))
        || (isGuest() && resource.data.entityType == 'project' && guestIn(resource.data.entityId));
```

- [ ] **Step 4: Ver que pasan**

Run: `npm run test:rules`
Expected: PASS todos (los anteriores y los nuevos).

Si la consulta `where('memberIds', 'array-contains', 'gus')` falla aunque el `getDoc` de p1 pase, es que el motor de reglas no deduce `in` desde la consulta: cambiar la condición a `resource.data.get('memberIds', []).hasAny([request.auth.uid])` y volver a correr.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules tests/rules
git commit -m "feat(v2): reglas del Invitado para proyectos, tareas y auditoría"
```

---

### Task 3: Tarjetas y lista de personas del proyecto

**Files:**
- Modify: `firestore.rules` (tarjetas)
- Create: `src/services/audited/people.ts`
- Modify: `src/services/audited/projects.ts` (tarjeta del responsable al crear/cambiar; borrar tarjetas al eliminar)
- Modify: `src/services/team.service.ts` (sincronizar tarjetas después de cambiar perfil, rol o activo)
- Modify: `src/services/projects.service.ts` (exportar `setProjectMembers`)
- Create: `tests/rules/people.rules.test.ts`

**Interfaces:**
- Produces:
  - `type PersonCard = { uid: string; displayName: string; photo: string | null; active: boolean; role: 'guest' | 'team' }`
  - `cardFrom(uid: string, user: DocumentData): PersonCard`
  - `cardRef(db: Firestore, projectId: string, uid: string): DocumentReference`
  - `setProjectMembers(db, actorId, projectId, memberIds: string[]): Promise<void>` (auditada)
  - `syncPersonCards(db, uid): Promise<void>`
  - En `projects.service.ts`: `setProjectMembers(actorId, projectId, memberIds)`

- [ ] **Step 1: Tests que fallan**

```ts
// tests/rules/people.rules.test.ts
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setProjectMembers, syncPersonCards } from '@/services/audited/people';
import { createProject, deleteProject, updateProject } from '@/services/audited/projects';
import { updateMember, updateOwnProfile } from '@/services/audited/users';
import { createEnv, dbAs, seed, seedProject, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const card = (pid: string, uid: string) => doc(as('admin'), 'projects', pid, 'people', uid);
const cardData = async (pid: string, uid: string) => (await getDoc(card(pid, uid))).data();

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
  await seedProject(env, 'p1', { ownerId: 'ana' });
  await seedProject(env, 'p2', { ownerId: 'ana' });
});

describe('lista de personas', () => {
  it('el admin agrega y quita, con auditoría y tarjeta', async () => {
    await assertSucceeds(setProjectMembers(as('admin'), 'admin', 'p1', ['gus']));
    expect(await cardData('p1', 'gus')).toEqual({ uid: 'gus', displayName: 'gus', photo: null, active: true, role: 'guest' });
    expect((await getDoc(doc(as('admin'), 'auditLog', 'project_p1_2'))).exists()).toBe(true);
    await assertSucceeds(setProjectMembers(as('admin'), 'admin', 'p1', []));
    expect(await cardData('p1', 'gus')).toBeUndefined();
  });

  it('un miembro no puede cambiar la lista', async () => {
    await assertFails(setProjectMembers(as('ana'), 'ana', 'p1', ['gus']));
  });
});

describe('tarjetas', () => {
  beforeEach(async () => {
    await setProjectMembers(as('admin'), 'admin', 'p1', ['gus']);
  });

  it('no se puede inventar una tarjeta ni cambiarle el nombre', async () => {
    const real = { uid: 'gus', displayName: 'gus', photo: null, active: true, role: 'guest' };
    await assertFails(setDoc(doc(as('ana'), 'projects', 'p1', 'people', 'gus'), { ...real, displayName: 'Otro' }));
    await assertFails(setDoc(doc(as('ana'), 'projects', 'p2', 'people', 'gus'), real));
    await assertSucceeds(setDoc(doc(as('ana'), 'projects', 'p1', 'people', 'gus'), real));
  });

  it('el Invitado lee las tarjetas de su proyecto y no las de otro', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'projects', 'p2', 'people', 'ana'), { uid: 'ana', displayName: 'ana', photo: null, active: true, role: 'team' });
    });
    await assertSucceeds(getDocs(collection(as('gus'), 'projects', 'p1', 'people')));
    await assertFails(getDocs(collection(as('gus'), 'projects', 'p2', 'people')));
  });

  it('al cambiar su nombre, el Invitado actualiza sus tarjetas', async () => {
    await updateOwnProfile(as('gus'), 'gus', { displayName: 'Gustavo' });
    await assertSucceeds(syncPersonCards(as('gus'), 'gus'));
    expect((await cardData('p1', 'gus'))?.displayName).toBe('Gustavo');
  });

  it('al desactivarlo, el admin actualiza sus tarjetas', async () => {
    await updateMember(as('admin'), 'admin', 'gus', { active: false });
    await assertSucceeds(syncPersonCards(as('admin'), 'gus'));
    expect((await cardData('p1', 'gus'))?.active).toBe(false);
  });
});

describe('responsable', () => {
  it('crear un proyecto crea la tarjeta del responsable', async () => {
    const id = await createProject(as('ana'), 'ana', {
      name: 'Web', description: '', color: '#1B4079', ownerId: 'ana', startDate: '2026-10-01', endDate: '2026-12-31',
    });
    expect((await cardData(id, 'ana'))?.role).toBe('team');
  });

  it('cambiar el responsable mueve la tarjeta', async () => {
    await assertSucceeds(updateProject(as('ana'), 'ana', 'p1', { ownerId: 'admin' }));
    expect((await cardData('p1', 'admin'))?.displayName).toBe('admin');
    expect(await cardData('p1', 'ana')).toBeUndefined();
  });

  it('eliminar el proyecto borra sus tarjetas', async () => {
    await setProjectMembers(as('admin'), 'admin', 'p1', ['gus']);
    await deleteProject(as('admin'), 'admin', 'p1');
    expect(await cardData('p1', 'gus')).toBeUndefined();
  });
});
```

> `seedProject` no crea la tarjeta de `ana` (responsable de p1); `cardData('p1','ana')` es `undefined` desde el inicio en "cambiar el responsable": lo que prueba es que el nuevo responsable tenga la suya y que la del anterior no quede.

- [ ] **Step 2: Ver que fallan**

Run: `npm run test:rules`
Expected: FAIL — no existe `@/services/audited/people` (el archivo nuevo no compila).

- [ ] **Step 3: Implementación**

Reglas — debajo de `validProject(d)`:

```
    // Tarjeta de una persona del proyecto: copia fiel de su perfil (después de la escritura).
    function cardMatches(uid) {
      let d = request.resource.data;
      let u = getAfter(userPath(uid)).data;
      return d.keys().hasOnly(['uid', 'displayName', 'photo', 'active', 'role'])
        && d.uid == uid
        && d.displayName == u.displayName
        && d.photo == u.get('photo', null)
        && d.active == u.active
        && d.role == (u.role == 'guest' ? 'guest' : 'team');
    }
    function personOfProjectAfter(pid, uid) {
      let p = getAfter(projectPath(pid)).data;
      return uid == p.ownerId || uid in p.get('memberIds', []);
    }
```

Dentro de `match /projects/{projectId} { … }`, al final:

```
      // Tarjetas: lo único que el Invitado ve de las personas (sin email ni rol).
      match /people/{uid} {
        allow read: if isTeam() || (isGuest() && guestIn(projectId));
        allow create, update: if isActive() && existsAfter(projectPath(projectId))
          && personOfProjectAfter(projectId, uid) && cardMatches(uid);
        allow delete: if isActive()
          && (!existsAfter(projectPath(projectId)) || !personOfProjectAfter(projectId, uid));
      }
```

Al final del bloque `match /databases/{database}/documents { … }`:

```
    // Buscar las tarjetas de una persona en todos los proyectos (para actualizarlas).
    match /{path=**}/people/{uid} {
      allow read: if isTeam() || (signedIn() && resource.data.uid == request.auth.uid);
    }
```

```ts
// src/services/audited/people.ts
import {
  collectionGroup, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch,
  type DocumentData, type DocumentReference, type Firestore,
} from 'firebase/firestore';
import { auditEntry, auditRef } from './audit';

/** Lo que el Invitado ve de una persona: sin email ni rol interno. */
export type PersonCard = { uid: string; displayName: string; photo: string | null; active: boolean; role: 'guest' | 'team' };

/** Cada tarjeta valida su perfil y su proyecto: de a pocas para no pasar el límite de lecturas de las reglas. */
const SYNC_CHUNK = 5;

export function cardFrom(uid: string, user: DocumentData): PersonCard {
  return {
    uid,
    displayName: user.displayName,
    photo: user.photo ?? null,
    active: user.active,
    role: user.role === 'guest' ? 'guest' : 'team',
  };
}

export function cardRef(db: Firestore, projectId: string, uid: string): DocumentReference {
  return doc(db, 'projects', projectId, 'people', uid);
}

/** El admin define quiénes están en el proyecto: lista auditada + tarjetas de quienes entran y salen. */
export async function setProjectMembers(db: Firestore, actorId: string, projectId: string, memberIds: string[]): Promise<void> {
  const ref = doc(db, 'projects', projectId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('El proyecto ya no existe.');
    const before = snap.data();
    const previous: string[] = before.memberIds ?? [];
    const next = [...new Set(memberIds)];
    const added = next.filter((uid) => !previous.includes(uid));
    const removed = previous.filter((uid) => !next.includes(uid) && uid !== before.ownerId);
    const users = await Promise.all(added.map((uid) => tx.get(doc(db, 'users', uid))));

    const rev = before.rev + 1;
    const after = { ...before, memberIds: next, rev, updatedBy: actorId, updatedAt: serverTimestamp() };
    tx.set(ref, after);
    tx.set(auditRef(db, 'project', projectId, rev), auditEntry({ type: 'project', id: projectId, rev, action: 'update', actorId, before, after }));
    users.forEach((user, i) => {
      if (user.exists()) tx.set(cardRef(db, projectId, added[i]), cardFrom(added[i], user.data()));
    });
    removed.forEach((uid) => tx.delete(cardRef(db, projectId, uid)));
  });
}

/**
 * Copia el perfil actual a todas las tarjetas de la persona (después de cambiar nombre, foto, rol o activo).
 * Va aparte del cambio de perfil: las reglas comparan con el perfil ya guardado.
 */
export async function syncPersonCards(db: Firestore, uid: string): Promise<void> {
  const user = await getDoc(doc(db, 'users', uid));
  if (!user.exists()) return;
  const card = cardFrom(uid, user.data());
  const cards = (await getDocs(query(collectionGroup(db, 'people'), where('uid', '==', uid)))).docs;
  for (let i = 0; i < cards.length; i += SYNC_CHUNK) {
    const batch = writeBatch(db);
    cards.slice(i, i + SYNC_CHUNK).forEach((snap) => batch.set(snap.ref, card));
    await batch.commit();
  }
}
```

`src/services/audited/projects.ts`:
- Importar `cardFrom, cardRef` de `./people` y `doc` ya está.
- En `createProject`, antes del batch: `const owner = await getDoc(doc(db, 'users', input.ownerId));` y dentro del batch, después de la auditoría: `if (owner.exists()) batch.set(cardRef(db, ref.id, input.ownerId), cardFrom(input.ownerId, owner.data()));`
- En `updateProject`, dentro de la transacción, **antes** de los `tx.set` (en una transacción todas las lecturas van primero):

```ts
    const ownerChanged = patch.ownerId !== undefined && patch.ownerId !== before.ownerId;
    const newOwner = ownerChanged ? await tx.get(doc(db, 'users', patch.ownerId as string)) : null;
```

y después de la auditoría:

```ts
    if (ownerChanged && newOwner?.exists()) {
      tx.set(cardRef(db, id, newOwner.id), cardFrom(newOwner.id, newOwner.data()));
      // El responsable anterior deja de ser persona del proyecto si no está en la lista.
      if (!(before.memberIds ?? []).includes(before.ownerId)) tx.delete(cardRef(db, id, before.ownerId));
    }
```

- En `deleteProject`, al principio: `const cards = (await getDocs(collection(db, 'projects', id, 'people'))).docs;` y al final (después del `for`):

```ts
  // Las tarjetas se borran después: las reglas lo permiten cuando el proyecto ya no existe.
  if (cards.length > 0) {
    const batch = writeBatch(db);
    cards.forEach((snap) => batch.delete(snap.ref));
    await batch.commit();
  }
```

`src/services/team.service.ts` — donde hoy exporta los envoltorios de `updateMember` y `updateOwnProfile`, encadenar la sincronización:

```ts
import { syncPersonCards } from '@/services/audited/people';

/** Después de guardar el perfil, actualiza sus tarjetas; si eso falla, el perfil ya quedó guardado (se corrige en el próximo cambio). */
function syncCards(uid: string): Promise<void> {
  return syncPersonCards(db, uid).catch((err: unknown) => console.error('No se pudieron actualizar las tarjetas:', err));
}

export const updateMember = (actorId: string, uid: string, patch: { role?: Role; active?: boolean }) =>
  users.updateMember(db, actorId, uid, patch).then(() => syncCards(uid));
export const updateOwnProfile = (uid: string, patch: { displayName?: string; photo?: string | null }) =>
  users.updateOwnProfile(db, uid, patch).then(() => syncCards(uid));
```

(Reemplazar las definiciones existentes de esos dos envoltorios; mantener sus nombres.)

`src/services/projects.service.ts`:

```ts
import { setProjectMembers as setMembers } from '@/services/audited/people';

export const setProjectMembers = (actorId: string, projectId: string, memberIds: string[]) =>
  setMembers(db, actorId, projectId, memberIds);
```

- [ ] **Step 4: Ver que pasan**

Run: `npm run test:rules && npm test && npm run build && npm run lint`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules src tests/rules
git commit -m "feat(v2): personas del proyecto con tarjetas validadas por las reglas"
```

---

### Task 4: Lectura según el rol

**Files:**
- Create: `src/utils/fanOut.ts`
- Modify: `src/types/project.ts` (`memberIds?`)
- Modify: `src/services/projects.service.ts`, `src/services/tasks.service.ts`, `src/services/team.service.ts`
- Modify: `src/hooks/useProjects.ts`, `src/hooks/useTasks.ts`, `src/hooks/useTeamMembers.ts`
- Modify: `src/features/team/members.ts` (nombre para desconocidos)
- Modify: `src/components/tasks/TaskWorkspace.tsx`, `src/components/tasks/TaskDialogs.tsx`, `src/pages/ProjectsPage.tsx`, `src/pages/CalendarPage.tsx`, `src/pages/ProjectPage.tsx`
- Test: `tests/unit/fanOut.test.ts`, `tests/unit/useTasks.test.tsx`, `tests/unit/members.test.ts`

**Interfaces:**
- Consumes: `PersonCard` (Task 3).
- Produces:
  - `type Viewer = { uid: string; role: Role }` (en `src/types/auth.ts`)
  - `subscribeFanOut<T>(subscribeKeys, subscribeOne, onData, onError): () => void`
  - `subscribeToProjects(viewer, onData, onError)`, `subscribeToTasks(viewer, onData, onError)`, `subscribeToGuestPeople(uid, onData, onError)`
  - `UNKNOWN_PERSON = 'Alguien del equipo'`, `unknownPersonFor(role: Role): string | null`
  - `makeNameOf(members, unknown?: string | null)`, `makePersonOf(members, unknown?: string | null)`

- [ ] **Step 1: Tests que fallan**

```ts
// tests/unit/fanOut.test.ts
import { describe, expect, it, vi } from 'vitest';
import { subscribeFanOut } from '@/utils/fanOut';

describe('subscribeFanOut', () => {
  it('une los resultados de cada fuente y sigue los cambios de la lista', () => {
    let emitKeys: (keys: string[]) => void = () => {};
    const emitters = new Map<string, (items: string[]) => void>();
    const unsubs = new Map<string, ReturnType<typeof vi.fn>>();
    const onData = vi.fn();
    subscribeFanOut<string>(
      (onKeys) => {
        emitKeys = onKeys;
        return () => {};
      },
      (key, onItems) => {
        emitters.set(key, onItems);
        const unsub = vi.fn();
        unsubs.set(key, unsub);
        return unsub;
      },
      onData,
      vi.fn(),
    );

    emitKeys(['a', 'b']);
    emitters.get('a')!(['a1']);
    expect(onData).not.toHaveBeenCalled(); // falta "b"
    emitters.get('b')!(['b1', 'b2']);
    expect(onData).toHaveBeenLastCalledWith(['a1', 'b1', 'b2']);

    emitKeys(['b']);
    expect(unsubs.get('a')).toHaveBeenCalled();
    expect(onData).toHaveBeenLastCalledWith(['b1', 'b2']);
  });

  it('sin fuentes entrega una lista vacía', () => {
    const onData = vi.fn();
    subscribeFanOut<string>((onKeys) => (onKeys([]), () => {}), () => () => {}, onData, vi.fn());
    expect(onData).toHaveBeenCalledWith([]);
  });

  it('al cancelar, cancela todo', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const stop = subscribeFanOut<string>((onKeys) => (onKeys(['a']), outer), () => inner, vi.fn(), vi.fn());
    stop();
    expect(outer).toHaveBeenCalled();
    expect(inner).toHaveBeenCalled();
  });
});
```

En `tests/unit/members.test.ts` agregar:

```ts
describe('desconocidos', () => {
  it('con un nombre para desconocidos, lo usa solo si hay alguien asignado', () => {
    const nameOf = makeNameOf([], 'Alguien del equipo');
    expect(nameOf('x')).toBe('Alguien del equipo');
    expect(nameOf(null)).toBeNull();
    expect(makePersonOf([], 'Alguien del equipo')('x')).toEqual({ name: 'Alguien del equipo', photo: null, active: true });
  });

  it('sin él, sigue devolviendo null', () => {
    expect(makeNameOf([])('x')).toBeNull();
  });
});
```

(importar `makePersonOf` si el archivo no lo importa).

`tests/unit/useTasks.test.tsx`: agregar el mock de `useAuth` y adaptar la firma del servicio:

```ts
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: { uid: 'u1', role: 'member' } }) }));
```

y en el mock del servicio `subscribeToTasks: vi.fn((_viewer: unknown, onData: typeof emitData, onError: typeof emitError) => { … })`; la expectativa pasa a:

```ts
    expect(service.subscribeToTasks).toHaveBeenCalledWith({ uid: 'u1', role: 'member' }, expect.any(Function), expect.any(Function));
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/unit/fanOut.test.ts tests/unit/members.test.ts tests/unit/useTasks.test.tsx`
Expected: FAIL (no existe `fanOut`; `makeNameOf` ignora el segundo parámetro; `subscribeToTasks` se llama sin `viewer`).

- [ ] **Step 3: Implementación**

```ts
// src/utils/fanOut.ts
type Unsubscribe = () => void;
type OnError = (error: Error) => void;

/**
 * Escucha una lista de fuentes que cambia con el tiempo (p. ej. los proyectos del Invitado)
 * y, por cada una, sus elementos (p. ej. sus tareas). Entrega todo junto cuando cada fuente respondió.
 */
export function subscribeFanOut<T>(
  subscribeKeys: (onKeys: (keys: string[]) => void, onError: OnError) => Unsubscribe,
  subscribeOne: (key: string, onItems: (items: T[]) => void, onError: OnError) => Unsubscribe,
  onData: (items: T[]) => void,
  onError: OnError,
): Unsubscribe {
  const sources = new Map<string, { stop: Unsubscribe; items: T[] | null }>();

  function emit() {
    const all = [...sources.values()];
    if (all.some((s) => s.items === null)) return;
    onData(all.flatMap((s) => s.items as T[]));
  }

  const stopKeys = subscribeKeys((keys) => {
    for (const [key, source] of sources) {
      if (!keys.includes(key)) {
        source.stop();
        sources.delete(key);
      }
    }
    for (const key of keys) {
      if (sources.has(key)) continue;
      const source: { stop: Unsubscribe; items: T[] | null } = { stop: () => {}, items: null };
      sources.set(key, source);
      source.stop = subscribeOne(key, (items) => {
        source.items = items;
        emit();
      }, onError);
    }
    emit();
  }, onError);

  return () => {
    stopKeys();
    sources.forEach((s) => s.stop());
    sources.clear();
  };
}
```

`src/types/auth.ts`: agregar `export type Viewer = { uid: string; role: Role };`

`src/types/project.ts`: en `Project` agregar

```ts
  /** Personas agregadas por el admin (los Invitados ven el proyecto si están acá). Vacía si no se cargó nunca. */
  memberIds?: string[];
```

`src/services/projects.service.ts`: en `toProject` agregar `memberIds: d.memberIds ?? [],` y reemplazar `subscribeToProjects` por:

```ts
/** Proyectos en tiempo real, ordenados por fecha de fin. El Invitado pide solo los suyos (las reglas lo exigen). */
export function subscribeToProjects(
  viewer: Viewer,
  onData: (projects: Project[]) => void,
  onError: (error: Error) => void,
): () => void {
  const source = viewer.role === 'guest'
    ? query(collection(db, 'projects'), where('memberIds', 'array-contains', viewer.uid))
    : collection(db, 'projects');
  return onSnapshot(
    source,
    (snap) => onData(snap.docs.map(toProject).sort((a, b) => a.endDate.localeCompare(b.endDate) || a.name.localeCompare(b.name))),
    onError,
  );
}

/** IDs de los proyectos del Invitado, en tiempo real (base para pedir sus tareas y sus personas). */
export function subscribeToGuestProjectIds(uid: string, onIds: (ids: string[]) => void, onError: (error: Error) => void): () => void {
  return onSnapshot(
    query(collection(db, 'projects'), where('memberIds', 'array-contains', uid)),
    (snap) => onIds(snap.docs.map((d) => d.id)),
    onError,
  );
}
```

(importar `query`, `where` de `firebase/firestore` y `type Viewer` de `@/types/auth`).

`src/services/tasks.service.ts`: reemplazar `subscribeToTasks` por:

```ts
const newestFirst = (tasks: Task[]) => tasks.sort((a, b) => b.createdAt - a.createdAt);

/**
 * Tareas en tiempo real. El equipo ve todas; el Invitado, las de sus proyectos
 * (una consulta por proyecto: es lo que las reglas pueden comprobar). La más nueva primero.
 */
export function subscribeToTasks(viewer: Viewer, onData: (tasks: Task[]) => void, onError: (error: Error) => void): () => void {
  if (viewer.role !== 'guest') {
    return onSnapshot(collection(db, 'tasks'), (snapshot) => onData(newestFirst(snapshot.docs.map(toTask))), onError);
  }
  return subscribeFanOut<Task>(
    (onIds, onErr) => subscribeToGuestProjectIds(viewer.uid, onIds, onErr),
    (projectId, onItems, onErr) =>
      onSnapshot(query(collection(db, 'tasks'), where('projectId', '==', projectId)), (snap) => onItems(snap.docs.map(toTask)), onErr),
    (tasks) => onData(newestFirst(tasks)),
    onError,
  );
}
```

(importar `query`, `where`, `subscribeFanOut` de `@/utils/fanOut`, `subscribeToGuestProjectIds` de `./projects.service`, `type Viewer`).

`src/services/team.service.ts`: agregar

```ts
/**
 * Lo que el Invitado ve del equipo: las tarjetas de sus proyectos, unidas por persona.
 * Se adaptan a UserProfile para que el resto de la app las use igual (sin email; "team" cuenta como miembro).
 */
export function subscribeToGuestPeople(uid: string, onData: (members: UserProfile[]) => void, onError: (error: Error) => void): () => void {
  return subscribeFanOut<PersonCard>(
    (onIds, onErr) => subscribeToGuestProjectIds(uid, onIds, onErr),
    (projectId, onItems, onErr) =>
      onSnapshot(collection(db, 'projects', projectId, 'people'), (snap) => onItems(snap.docs.map((d) => d.data() as PersonCard)), onErr),
    (cards) => {
      const byUid = new Map(cards.map((c) => [c.uid, c]));
      onData(
        [...byUid.values()]
          .map((c): UserProfile => ({
            uid: c.uid, email: '', displayName: c.displayName, photo: c.photo, active: c.active,
            role: c.role === 'guest' ? 'guest' : 'member', invitedBy: null, rev: 0,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );
    },
    onError,
  );
}
```

(importar `subscribeFanOut`, `subscribeToGuestProjectIds` de `./projects.service`, `type PersonCard` de `@/services/audited/people`).

Hooks — los tres leen el perfil con `useAuth()` (siempre hay perfil dentro del marco de la app):

`useProjects.ts`:

```ts
export function useProjects() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? '';
  const role = profile?.role ?? 'viewer';
  // …estado igual que hoy…
  useEffect(
    () =>
      subscribeToProjects(
        { uid, role },
        (next) => { setProjects(next); setLoading(false); },
        (err) => { console.error('Error al leer proyectos:', err); setError('No pudimos cargar los proyectos.'); setLoading(false); },
      ),
    [uid, role],
  );
```

`useTasks.ts`: igual, `subscribeToTasks({ uid, role }, …)` y el efecto depende de `[attempt, uid, role]`.

`useTeamMembers.ts`:

```ts
export function useTeamMembers(): UserProfile[] {
  const { profile } = useAuth();
  const uid = profile?.uid ?? '';
  const isGuest = profile?.role === 'guest';
  const [members, setMembers] = useState<UserProfile[]>([]);
  useEffect(() => {
    const onError = (err: Error) => console.error('Error al leer el equipo:', err);
    return isGuest ? subscribeToGuestPeople(uid, setMembers, onError) : subscribeToMembers(setMembers, onError);
  }, [uid, isGuest]);
  return members;
}
```

`src/features/team/members.ts`:

```ts
/** Para el Invitado: quien no está en sus proyectos aparece así (sin revelar quién es). */
export const UNKNOWN_PERSON = 'Alguien del equipo';

export function unknownPersonFor(role: Role): string | null {
  return role === 'guest' ? UNKNOWN_PERSON : null;
}

export function makeNameOf(members: readonly UserProfile[], unknown: string | null = null): NameOf {
  const names = new Map(members.map((m) => [m.uid, m.active ? m.displayName : `${m.displayName} (inactiva)`]));
  return (uid) => (uid ? names.get(uid) ?? unknown : null);
}

export function makePersonOf(members: readonly UserProfile[], unknown: string | null = null): PersonOf {
  const people = new Map(members.map((m) => [m.uid, { name: m.displayName, photo: m.photo ?? null, active: m.active }]));
  return (uid) => (uid ? people.get(uid) ?? (unknown ? { name: unknown, photo: null, active: true } : null) : null);
}
```

Llamadas: pasar `unknownPersonFor(profile.role)` (o `me.role`) como segundo argumento en `TaskWorkspace` (`makeNameOf`, `makePersonOf`), `TaskDialogs` (`makeNameOf`), `ProjectsPage` (`makePersonOf`), `CalendarPage` (`makeNameOf`) y `ProjectPage` (`makeNameOf`).

- [ ] **Step 4: Ver que pasan**

Run: `npm test && npm run build && npm run lint`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(v2): cada rol pide solo lo que puede ver"
```

---

### Task 5: Formularios — proyecto obligatorio y responsables según el proyecto

**Files:**
- Create: `src/features/projects/projectPeople.ts`
- Modify: `src/features/team/members.ts` (`assigneeOptions` con proyecto y quien asigna)
- Modify: `src/components/tasks/TodoForm.tsx`, `src/components/tasks/TaskDetailPanel.tsx`, `src/components/tasks/TaskDialogs.tsx`
- Test: `tests/unit/projectPeople.test.ts`, `tests/unit/members.test.ts`, `tests/components/TodoForm.test.tsx`

**Interfaces:**
- Produces:
  - `projectPeople(project: Pick<Project, 'ownerId' | 'memberIds'>): string[]`
  - `assigneeOptions(members, currentId, ctx?: { project?: Project | null; actorRole?: Role }): AssigneeOption[]`
  - `TodoForm` y `TaskDetailPanel`: props nuevas `assigneesFor?: (projectId: string | null) => AssigneeOption[]` y `projectRequired?: boolean`

- [ ] **Step 1: Tests que fallan**

```ts
// tests/unit/projectPeople.test.ts
import { describe, expect, it } from 'vitest';
import { projectPeople } from '@/features/projects/projectPeople';

describe('projectPeople', () => {
  it('responsable + lista, sin repetidos', () => {
    expect(projectPeople({ ownerId: 'ana', memberIds: ['gus', 'ana'] })).toEqual(['ana', 'gus']);
    expect(projectPeople({ ownerId: 'ana' })).toEqual(['ana']);
  });
});
```

En `tests/unit/members.test.ts`:

```ts
describe('assigneeOptions con proyecto', () => {
  const p = (uid: string, role: Role, active = true): UserProfile =>
    ({ uid, email: '', displayName: uid, role, active, invitedBy: null, rev: 1 });
  const team = [p('admin', 'admin'), p('ana', 'member'), p('gus', 'guest'), p('otro', 'guest')];
  const project = { id: 'p1', ownerId: 'ana', memberIds: ['gus'] } as Project;

  it('un miembro puede asignar al Invitado solo si está en el proyecto', () => {
    expect(assigneeOptions(team, null, { project }).map((o) => o.uid)).toEqual(['admin', 'ana', 'gus']);
    expect(assigneeOptions(team, null).map((o) => o.uid)).toEqual(['admin', 'ana']);
  });

  it('el Invitado asigna solo a personas del proyecto', () => {
    expect(assigneeOptions(team, null, { project, actorRole: 'guest' }).map((o) => o.uid)).toEqual(['ana', 'gus']);
  });
});
```

(importar `type Role`, `type UserProfile`, `type Project` si faltan).

En `tests/components/TodoForm.test.tsx`:

```tsx
  it('con proyecto obligatorio no ofrece "Sin proyecto" y pide elegir uno', async () => {
    const onSubmit = vi.fn();
    const projects = [{ id: 'p1', name: 'Portal', archived: false } as Project];
    render(<TodoForm projects={projects} projectRequired onSubmit={onSubmit} />);
    expect(screen.queryByRole('option', { name: 'Sin proyecto' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Título'), 'Tarea');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar tarea' }));
    expect(screen.getByText('Elige un proyecto.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('los responsables cambian según el proyecto elegido', async () => {
    const projects = [{ id: 'p1', name: 'Portal', archived: false } as Project, { id: 'p2', name: 'Web', archived: false } as Project];
    const assigneesFor = (id: string | null) => (id === 'p1' ? [{ uid: 'gus', label: 'Gus' }] : [{ uid: 'ana', label: 'Ana' }]);
    render(<TodoForm projects={projects} assigneesFor={assigneesFor} onSubmit={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText('Proyecto'), 'Portal');
    expect(screen.getByRole('option', { name: 'Gus' })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Proyecto'), 'Web');
    expect(screen.queryByRole('option', { name: 'Gus' })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/unit/projectPeople.test.ts tests/unit/members.test.ts tests/components/TodoForm.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementación**

```ts
// src/features/projects/projectPeople.ts
import type { Project } from '@/types/project';

/** Personas del proyecto: su responsable y quienes el admin agregó. */
export function projectPeople(project: Pick<Project, 'ownerId' | 'memberIds'>): string[] {
  return [...new Set([project.ownerId, ...(project.memberIds ?? [])])];
}
```

`members.ts` — reemplazar `assigneeOptions` (y el `canBeAssigned` que solo usa ella):

```ts
/**
 * Opciones de "Responsable": admins y miembros activos, y los Invitados activos que estén en el proyecto.
 * Si asigna un Invitado, solo personas del proyecto. Se agrega el actual si ya no califica, para no perderlo al editar.
 */
export function assigneeOptions(
  members: readonly UserProfile[],
  currentId: string | null,
  ctx: { project?: Project | null; actorRole?: Role } = {},
): AssigneeOption[] {
  const project = ctx.project ?? null;
  const inProject = new Set(project ? projectPeople(project) : []);
  const guestsHere = new Set(project?.memberIds ?? []);
  const assignable = (m: UserProfile) =>
    m.active && (m.role === 'admin' || m.role === 'member' || (m.role === 'guest' && guestsHere.has(m.uid)));
  const pool = members.filter((m) => assignable(m) && (ctx.actorRole !== 'guest' || inProject.has(m.uid)));
  const options = pool.map((m) => ({ uid: m.uid, label: m.displayName }));
  const current = members.find((m) => m.uid === currentId);
  if (current && !pool.includes(current)) {
    options.push({ uid: current.uid, label: current.active ? current.displayName : `${current.displayName} (inactiva)` });
  }
  return options;
}
```

(importar `projectPeople`, `type Project`, `type Role`).

`TodoForm.tsx`:
- Props nuevas en `TodoFormProps`:

```ts
  /** Responsables según el proyecto elegido (si no se pasa, se usa `assignees`). */
  assigneesFor?: (projectId: string | null) => AssigneeOption[];
  /** El Invitado siempre trabaja dentro de un proyecto. */
  projectRequired?: boolean;
```

- Desestructurar `assigneesFor, projectRequired = false`; `const options = assigneesFor ? assigneesFor(values.projectId) : assignees;` y usar `options` en el `<select id="task-assignee">`.
- Estado `const [projectError, setProjectError] = useState<string | null>(null);`; en `handleSubmit`, después de calcular `nextErrors`:

```ts
    const missingProject = projectRequired && !values.projectId;
    setProjectError(missingProject ? 'Elige un proyecto.' : null);
    if (hasErrors(nextErrors) || missingProject) return;
```

- `<Field id="task-project" label="Proyecto" error={projectError ?? undefined}>` y la primera opción:

```tsx
          {projectRequired ? <option value="" disabled>Elige un proyecto</option> : <option value="">Sin proyecto</option>}
```

- Al cambiar el proyecto, si el responsable elegido ya no está entre las opciones del nuevo proyecto, se limpia:

```tsx
          onChange={(e) => {
            const projectId = e.target.value || null;
            setValues((v) => {
              const allowed = assigneesFor ? assigneesFor(projectId).some((a) => a.uid === v.assigneeId) : true;
              return { ...v, projectId, assigneeId: allowed ? v.assigneeId : null };
            });
          }}
```

`TaskDetailPanel.tsx`: mismas dos props; `const options = assigneesFor ? assigneesFor(draft.projectId) : assignees;` en el select de responsable; la opción "Sin proyecto" solo si `!projectRequired`.

`TaskDialogs.tsx`:

```ts
  const isGuest = profile.role === 'guest';
  const assigneesFor = (currentId: string | null) => (projectId: string | null) =>
    assigneeOptions(members, currentId, { project: projects.find((p) => p.id === projectId) ?? null, actorRole: profile.role });
```

- Panel: `assigneesFor={assigneesFor(openTask.assigneeId)}` y `projectRequired={isGuest}` (en lugar de `assignees=`).
- "Nueva tarea": `assigneesFor={assigneesFor(profile.uid)}`, `projectRequired={isGuest}`, y el valor inicial del proyecto: `projectId: creating.projectId ?? (isGuest && projects.length === 1 ? projects[0].id : null)` (mantener el resto de `initialValues`).

- [ ] **Step 4: Ver que pasan**

Run: `npm test && npm run build && npm run lint`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(v2): responsables según el proyecto y proyecto obligatorio para el Invitado"
```

---

### Task 6: Email de resumen del Invitado

**Files:**
- Create: `functions/visibleTasks.ts`
- Modify: `functions/firebaseAdmin.ts`
- Test: `tests/server/visibleTasks.test.ts`

**Interfaces:**
- Produces: `visibleForRole<T extends { projectId: string | null }>(role: string, tasks: T[], guestProjectIds: string[]): T[]`

- [ ] **Step 1: Test que falla**

```ts
// tests/server/visibleTasks.test.ts
import { describe, expect, it } from 'vitest';
import { visibleForRole } from '../../functions/visibleTasks';

const tasks = [{ id: 'a', projectId: 'p1' }, { id: 'b', projectId: 'p2' }, { id: 'c', projectId: null }];

describe('visibleForRole', () => {
  it('el equipo cuenta todas sus tareas asignadas', () => {
    expect(visibleForRole('member', tasks, []).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('el Invitado solo las de proyectos donde sigue estando', () => {
    expect(visibleForRole('guest', tasks, ['p1']).map((t) => t.id)).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run tests/server/visibleTasks.test.ts`
Expected: FAIL — no existe `functions/visibleTasks`.

- [ ] **Step 3: Implementación**

```ts
// functions/visibleTasks.ts
/**
 * firebase-admin ignora las reglas: si quitan a un Invitado de un proyecto, sus tareas asignadas ahí
 * no deben llegarle por email. El resto del equipo ve todo.
 */
export function visibleForRole<T extends { projectId: string | null }>(role: string, tasks: T[], guestProjectIds: string[]): T[] {
  if (role !== 'guest') return tasks;
  const allowed = new Set(guestProjectIds);
  return tasks.filter((t) => t.projectId !== null && allowed.has(t.projectId));
}
```

`functions/firebaseAdmin.ts` — reemplazar `getTasksForUser`:

```ts
/** firebase-admin ignora las Security Rules: el filtro por responsable (y por proyecto, para el Invitado) es obligatorio acá. */
export async function getTasksForUser(uid: string): Promise<SummaryTask[]> {
  const db = getFirestore(getAdminApp());
  const [snapshot, user] = await Promise.all([
    db.collection('tasks').where('assigneeId', '==', uid).get(),
    db.collection('users').doc(uid).get(),
  ]);
  const role = String(user.data()?.role ?? '');
  const guestProjectIds = role === 'guest'
    ? (await db.collection('projects').where('memberIds', 'array-contains', uid).get()).docs.map((d) => d.id)
    : [];
  const tasks = snapshot.docs.map((doc) => ({ ...doc.data(), projectId: (doc.data().projectId ?? null) as string | null }));
  return visibleForRole(role, tasks, guestProjectIds).map((data) => ({
    title: String(data.title),
    description: String(data.description ?? ''),
    status: data.status as SummaryTask['status'],
  }));
}
```

(importar `visibleForRole` de `./visibleTasks.js`).

- [ ] **Step 4: Ver que pasa**

Run: `npm test && npm run build && npm run lint`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add functions tests/server
git commit -m "feat(v2): el resumen del Invitado solo incluye sus proyectos"
```

---

### Task 7: Reglas en dev, preview y prueba

- [ ] **Step 1: Publicar reglas en `matecode-tasks-dev`** con el script temporal de siempre (scratchpad, `node --env-file=.env`, se niega si el proyecto no es dev, imprime solo el resultado, se borra al terminar).

- [ ] **Step 2: Índice de tarjetas.** La consulta `collectionGroup('people')` por `uid` usa un índice de un solo campo con alcance "Grupo de colecciones", que Firestore **no** crea solo. Pedir a la usuaria crearlo en la consola: Firestore → Índices → **Campo único** → Agregar exención: colección `people`, campo `uid`, alcance **Grupo de colecciones**, Ascendente. Agregarlo a `firestore.indexes.json` en `fieldOverrides`:

```json
  "fieldOverrides": [
    {
      "collectionGroup": "people", "fieldPath": "uid",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION" },
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    }
  ]
```

Comprobarlo con un script de solo lectura (como en la etapa 8).

- [ ] **Step 3: Preview** — `vercel --yes`, `vercel alias set <url> matecode-tasks-dev.vercel.app`, comprobar producción 200.

- [ ] **Step 4: Prueba de la usuaria**
  - Como admin y como miembro: todo igual que antes (Mis tareas, proyectos, calendario, equipo, crear y editar).
  - Invitar a un segundo email suyo con el rol **Invitado** ("copiar enlace de invitación", porque SES está en sandbox) y crear esa cuenta.
  - Como Invitado: el menú tiene 3 secciones; no hay tareas ni proyectos (todavía no está en ninguno); `/team` y `/settings` llevan a Mis tareas.
  - (La pantalla para agregarlo a un proyecto llega en la 9B; ahí se prueba el trabajo dentro del proyecto.)

- [ ] **Step 5: Commit** (si cambió `firestore.indexes.json`)

```bash
git add firestore.indexes.json
git commit -m "chore(v2): índice de tarjetas por persona"
```
