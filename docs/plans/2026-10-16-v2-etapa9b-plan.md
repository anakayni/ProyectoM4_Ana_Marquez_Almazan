# Etapa 9B v2 — Invitados: pantallas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el admin agregue y quite personas de cada proyecto desde la página del proyecto, que el Invitado sin proyectos vea un mensaje claro, que Equipo muestre los proyectos de cada Invitado y que la auditoría cuente estos cambios en frases.

**Architecture:** Lógica pura en `src/features/projects/projectPeople.ts` (filas, a quién se puede agregar, mensaje al quitar). Un componente `ProjectPeople` (resumen con caras + diálogo) en el encabezado de la página del proyecto usa `setProjectMembers` (9A). `NoProjectsYet` se muestra en Mis tareas, Proyectos y Calendario. Equipo calcula los proyectos de cada Invitado con `memberIds`. `describeAuditEntry` y `auditFields` suman `memberIds`.

**Tech Stack:** React 19 + TS, Firebase 12, Vitest + RTL, CSS Modules con tokens.

**Spec:** `docs/specs/2026-10-13-v2-etapa9-invitados-design.md` (parte 9B). Plan anterior: `docs/plans/2026-10-13-v2-etapa9a-plan.md`.

## Global Constraints

- Solo el admin agrega/quita personas (`can(me, 'project:people')`); todos ven la lista.
- El responsable siempre es persona del proyecto y no se puede quitar desde la lista.
- No se agregan lectores (ya ven todo y no se les asigna).
- Textos: "Personas del proyecto", "Responsable", "Invitado", "Todavía no tienes proyectos asignados." + "El administrador te agregará.", "Podrás agregarla cuando cree su cuenta."
- Contraste ≥ 4.5:1, etiquetas visibles, sin hex en componentes.
- `npm test`, `npm run build`, `npm run lint` en verde antes de cada commit; un commit por tarea con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Personas del proyecto

**Files:**
- Modify: `src/features/projects/projectPeople.ts`
- Create: `src/hooks/usePendingGuestInvitations.ts`
- Create: `src/components/projects/ProjectPeople.tsx` (+ `.module.css`)
- Modify: `src/pages/ProjectPage.tsx`
- Test: `tests/unit/projectPeople.test.ts`, `tests/components/ProjectPeople.test.tsx`, `tests/components/ProjectPage.test.tsx` (mock de `team.service`)

**Interfaces:**
- Consumes: `projectPeople(project)`, `setProjectMembers(actorId, projectId, memberIds)` (9A), `subscribeToInvitations`.
- Produces:
  - `type PersonRow = { uid: string; name: string; photo: string | null; active: boolean; isOwner: boolean; isGuest: boolean }`
  - `peopleRows(project, members): PersonRow[]`
  - `addableMembers(project, members): UserProfile[]`
  - `removePersonMessage(name: string, isGuest: boolean, openAssigned: number): string`
  - `usePendingGuestInvitations(enabled: boolean): string[]`
  - `<ProjectPeople project members tasks actorId canManage />`

- [ ] **Step 1: Tests que fallan**

Agregar a `tests/unit/projectPeople.test.ts`:

```ts
import { addableMembers, peopleRows, removePersonMessage } from '@/features/projects/projectPeople';
import type { Role, UserProfile } from '@/types/auth';

const person = (uid: string, role: Role, active = true): UserProfile =>
  ({ uid, email: '', displayName: uid.toUpperCase(), role, active, invitedBy: null, rev: 1 });
const team = [person('ana', 'member'), person('gus', 'guest'), person('vera', 'viewer'), person('leo', 'member', false), person('admin', 'admin')];

describe('peopleRows', () => {
  it('el responsable primero y después por nombre, con sus etiquetas', () => {
    expect(peopleRows({ ownerId: 'ana', memberIds: ['gus', 'admin'] }, team)).toEqual([
      { uid: 'ana', name: 'ANA', photo: null, active: true, isOwner: true, isGuest: false },
      { uid: 'admin', name: 'ADMIN', photo: null, active: true, isOwner: false, isGuest: false },
      { uid: 'gus', name: 'GUS', photo: null, active: true, isOwner: false, isGuest: true },
    ]);
  });
});

describe('addableMembers', () => {
  it('activos que no están, sin lectores', () => {
    expect(addableMembers({ ownerId: 'ana', memberIds: ['gus'] }, team).map((m) => m.uid)).toEqual(['admin']);
  });
});

describe('removePersonMessage', () => {
  it('al Invitado le avisa que deja de verlo y cuántas tareas tiene', () => {
    expect(removePersonMessage('Gus', true, 0)).toBe('Gus dejará de ver este proyecto.');
    expect(removePersonMessage('Gus', true, 2)).toBe(
      'Gus dejará de ver este proyecto. Tiene 2 tareas asignadas sin terminar aquí: quedan a su nombre, pero ya no podrá verlas.',
    );
  });

  it('a alguien del equipo solo deja de mostrarlo en la lista', () => {
    expect(removePersonMessage('Ana', false, 3)).toBe('Ana dejará de aparecer en las personas de este proyecto.');
  });
});
```

```tsx
// tests/components/ProjectPeople.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role, UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';

const svc = vi.hoisted(() => ({ setProjectMembers: vi.fn() }));
vi.mock('@/services/projects.service', () => ({ setProjectMembers: svc.setProjectMembers }));
vi.mock('@/hooks/usePendingGuestInvitations', () => ({ usePendingGuestInvitations: (on: boolean) => (on ? ['nuevo@x.com'] : []) }));

import { ProjectPeople } from '@/components/projects/ProjectPeople';

const person = (uid: string, name: string, role: Role): UserProfile =>
  ({ uid, email: '', displayName: name, role, active: true, invitedBy: null, rev: 1 });
const members = [person('ana', 'Ana', 'member'), person('gus', 'Gus', 'guest'), person('admin', 'Admin', 'admin')];
const project = {
  id: 'p1', name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', memberIds: ['gus'],
  startDate: '2026-10-01', endDate: '2026-11-30', archived: false, createdBy: 'ana', createdAt: 1, rev: 1,
} as Project;
const task = (assigneeId: string): Task => ({
  id: assigneeId + Math.random(), createdBy: 'ana', updatedBy: 'ana', rev: 1, title: 't', description: '', status: 'todo',
  assigneeId, completedBy: null, completedAt: null, projectId: 'p1', number: 1, subtasks: [], priority: 'media', dueDate: null, createdAt: 1,
});

function open(canManage: boolean) {
  render(<ProjectPeople project={project} members={members} tasks={[task('gus')]} actorId="admin" canManage={canManage} />);
  return userEvent.click(screen.getByRole('button', { name: 'Personas del proyecto (2)' }));
}

describe('ProjectPeople', () => {
  beforeEach(() => {
    svc.setProjectMembers.mockReset();
    svc.setProjectMembers.mockResolvedValue(undefined);
  });

  it('muestra a todos con sus etiquetas', async () => {
    await open(false);
    const dialog = screen.getByRole('dialog', { name: 'Personas del proyecto' });
    expect(within(dialog).getByText('Ana').closest('li')).toHaveTextContent('Responsable');
    expect(within(dialog).getByText('Gus').closest('li')).toHaveTextContent('Invitado');
    expect(within(dialog).queryByRole('button', { name: /Quitar/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Agregar persona')).not.toBeInTheDocument();
  });

  it('el admin agrega a alguien', async () => {
    await open(true);
    await userEvent.selectOptions(screen.getByLabelText('Agregar persona'), 'Admin');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(svc.setProjectMembers).toHaveBeenCalledWith('admin', 'p1', ['gus', 'admin']);
  });

  it('el admin quita a un Invitado después de confirmar', async () => {
    await open(true);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar a Gus' }));
    expect(screen.getByText(/Gus dejará de ver este proyecto\. Tiene 1 tarea asignada/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, quitar' }));
    expect(svc.setProjectMembers).toHaveBeenCalledWith('admin', 'p1', []);
  });

  it('el responsable no se puede quitar y se avisan las invitaciones pendientes', async () => {
    await open(true);
    expect(screen.queryByRole('button', { name: 'Quitar a Ana' })).not.toBeInTheDocument();
    expect(screen.getByText(/nuevo@x\.com/)).toHaveTextContent('Podrás agregarla cuando cree su cuenta.');
  });
});
```

En `tests/components/ProjectPage.test.tsx`, junto a los demás `vi.mock`, agregar (el componente nuevo lee invitaciones):

```tsx
vi.mock('@/services/team.service', () => ({ subscribeToInvitations: () => () => {} }));
```

y en el mock de `@/services/projects.service` sumar `setProjectMembers: vi.fn(),`.

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/unit/projectPeople.test.ts tests/components/ProjectPeople.test.tsx`
Expected: FAIL (funciones y componente inexistentes).

- [ ] **Step 3: Implementación**

Agregar a `src/features/projects/projectPeople.ts` (importar `type UserProfile` de `@/types/auth`):

```ts
export type PersonRow = { uid: string; name: string; photo: string | null; active: boolean; isOwner: boolean; isGuest: boolean };

const byName = (a: UserProfile, b: UserProfile) => a.displayName.localeCompare(b.displayName);

/** Filas de "Personas del proyecto": el responsable primero, después por nombre. Quien no se conoce se omite. */
export function peopleRows(project: Pick<Project, 'ownerId' | 'memberIds'>, members: readonly UserProfile[]): PersonRow[] {
  const byUid = new Map(members.map((m) => [m.uid, m]));
  return projectPeople(project)
    .flatMap((uid) => {
      const m = byUid.get(uid);
      return m
        ? [{ uid, name: m.displayName, photo: m.photo ?? null, active: m.active, isOwner: uid === project.ownerId, isGuest: m.role === 'guest' }]
        : [];
    })
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name));
}

/** A quién se puede agregar: activos que todavía no están. Los lectores no (ya ven todo y no se les asigna). */
export function addableMembers(project: Pick<Project, 'ownerId' | 'memberIds'>, members: readonly UserProfile[]): UserProfile[] {
  const inProject = new Set(projectPeople(project));
  return members.filter((m) => m.active && m.role !== 'viewer' && !inProject.has(m.uid)).sort(byName);
}

/** Qué pasa al quitar a alguien: el Invitado deja de ver el proyecto; el equipo sigue viéndolo todo. */
export function removePersonMessage(name: string, isGuest: boolean, openAssigned: number): string {
  if (!isGuest) return `${name} dejará de aparecer en las personas de este proyecto.`;
  const base = `${name} dejará de ver este proyecto.`;
  if (openAssigned === 0) return base;
  const tasks = openAssigned === 1 ? '1 tarea asignada' : `${openAssigned} tareas asignadas`;
  return `${base} Tiene ${tasks} sin terminar aquí: quedan a su nombre, pero ya no podrá verlas.`;
}
```

```ts
// src/hooks/usePendingGuestInvitations.ts
import { useEffect, useState } from 'react';
import { subscribeToInvitations } from '@/services/team.service';

/** Emails invitados como Invitado que todavía no crearon su cuenta (solo el admin puede leerlas). */
export function usePendingGuestInvitations(enabled: boolean): string[] {
  const [emails, setEmails] = useState<string[]>([]);
  useEffect(() => {
    if (!enabled) return;
    return subscribeToInvitations(
      (list) => setEmails(list.filter((i) => i.status === 'pending' && i.role === 'guest').map((i) => i.email)),
      (err) => console.error('Error al leer invitaciones:', err),
    );
  }, [enabled]);
  return enabled ? emails : [];
}
```

```tsx
// src/components/projects/ProjectPeople.tsx
import { useState } from 'react';
import { Avatar } from '@/components/layout/Avatar';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { addableMembers, peopleRows, removePersonMessage, type PersonRow } from '@/features/projects/projectPeople';
import { usePendingGuestInvitations } from '@/hooks/usePendingGuestInvitations';
import { setProjectMembers } from '@/services/projects.service';
import type { UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';
import styles from './ProjectPeople.module.css';

type Props = { project: Project; members: UserProfile[]; tasks: Task[]; actorId: string; canManage: boolean };

/** Caras de quienes trabajan en el proyecto y botón para ver (y, el admin, cambiar) la lista. */
export function ProjectPeople(props: Props) {
  const [open, setOpen] = useState(false);
  const rows = peopleRows(props.project, props.members);
  return (
    <div className={styles.summary}>
      <span className={styles.faces} aria-hidden="true">
        {rows.slice(0, 5).map((r) => <Avatar key={r.uid} name={r.name} photo={r.photo} inactive={!r.active} />)}
      </span>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Personas del proyecto ({rows.length})</Button>
      {open && <PeopleDialog {...props} rows={rows} onClose={() => setOpen(false)} />}
    </div>
  );
}

function PeopleDialog({ project, members, tasks, actorId, canManage, rows, onClose }: Props & { rows: PersonRow[]; onClose: () => void }) {
  const pendingGuests = usePendingGuestInvitations(canManage);
  const addable = addableMembers(project, members);
  const memberIds = project.memberIds ?? [];
  const [selected, setSelected] = useState('');
  const [removing, setRemoving] = useState<PersonRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openAssigned = (uid: string) =>
    tasks.filter((t) => t.projectId === project.id && t.assigneeId === uid && t.status !== 'done').length;

  async function save(next: string[]) {
    setSaving(true);
    setError(null);
    try {
      await setProjectMembers(actorId, project.id, next);
      setSelected('');
      setRemoving(null);
    } catch (err) {
      console.error('Error al cambiar las personas del proyecto:', err);
      setError('No pudimos guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Personas del proyecto" onClose={onClose}>
      <p className={styles.help}>Quienes trabajan en «{project.name}». Un Invitado solo ve los proyectos donde está.</p>
      {error && <Alert kind="error">{error}</Alert>}
      <ul className={styles.list}>
        {rows.map((r) => (
          <li key={r.uid} className={styles.row}>
            <Avatar name={r.name} photo={r.photo} inactive={!r.active} />
            <span className={styles.name}>{r.name}</span>
            {r.isOwner && <span className={styles.tag}>Responsable</span>}
            {r.isGuest && <span className={styles.tag}>Invitado</span>}
            {canManage && !r.isOwner && (
              <Button size="sm" variant="ghost" aria-label={`Quitar a ${r.name}`} onClick={() => setRemoving(r)}>Quitar</Button>
            )}
          </li>
        ))}
      </ul>
      {removing && (
        <div className={styles.confirm}>
          <p>{removePersonMessage(removing.name, removing.isGuest, openAssigned(removing.uid))}</p>
          <div className={styles.actions}>
            <Button size="sm" variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button>
            <Button size="sm" variant="danger" disabled={saving} onClick={() => void save(memberIds.filter((id) => id !== removing.uid))}>
              Sí, quitar
            </Button>
          </div>
        </div>
      )}
      {canManage && (
        <div className={styles.add}>
          <Field id="people-add" label="Agregar persona">
            <select id="people-add" className={fieldInputClass} value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Elige a alguien</option>
              {addable.map((m) => <option key={m.uid} value={m.uid}>{m.displayName}{m.role === 'guest' ? ' (Invitado)' : ''}</option>)}
            </select>
          </Field>
          <Button size="sm" disabled={!selected || saving} onClick={() => void save([...memberIds, selected])}>Agregar</Button>
        </div>
      )}
      {canManage && pendingGuests.length > 0 && (
        <p className={styles.pending}>
          Invitaciones pendientes con rol Invitado: {pendingGuests.join(', ')}. Podrás agregarla cuando cree su cuenta.
        </p>
      )}
    </Modal>
  );
}
```

```css
/* src/components/projects/ProjectPeople.module.css */
.summary { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.faces { display: inline-flex; }
.faces > * + * { margin-left: calc(-1 * var(--space-2)); }
.help, .pending { font-size: var(--text-md); color: var(--color-text-secondary); }
.list { list-style: none; margin: var(--space-3) 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.name { font-weight: var(--weight-medium); color: var(--color-text-primary); }
.tag {
  padding: 1px var(--space-2); border-radius: var(--radius-pill); font-size: var(--text-xs); font-weight: var(--weight-medium);
  background: var(--color-done-chip); color: var(--color-done-chip-text);
}
.row > button { margin-left: auto; }
.confirm { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-md); background: var(--color-status-warning-surface); }
.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.add { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-2); margin-top: var(--space-3); }
.add > :first-child { flex: 1 1 220px; }
```

`src/pages/ProjectPage.tsx`: importar `ProjectPeople`; en el `header`, debajo de `{progress.late && …}`:

```tsx
          <ProjectPeople project={project} members={members} tasks={tasks} actorId={me.uid} canManage={can(me, 'project:people')} />
```

- [ ] **Step 4: Ver que pasan**

Run: `npm test && npm run build && npm run lint`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(v2): personas del proyecto en la página de cada proyecto"
```

---

### Task 2: Invitado sin proyectos

**Files:**
- Create: `src/components/projects/NoProjectsYet.tsx` (+ `.module.css`)
- Modify: `src/components/tasks/TaskWorkspace.tsx`, `src/pages/ProjectsPage.tsx`, `src/pages/CalendarPage.tsx`
- Test: `tests/components/NoProjectsYet.test.tsx`

**Interfaces:**
- Produces: `<NoProjectsYet />`

- [ ] **Step 1: Test que falla**

```tsx
// tests/components/NoProjectsYet.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';

vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ tasks: [], loading: false, error: null, retry: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), setStatus: vi.fn() }),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loading: false, error: null }) }));

import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';

const profile = (role: UserProfile['role']): UserProfile =>
  ({ uid: 'g', email: 'g@x.com', displayName: 'G', role, active: true, invitedBy: null, rev: 1 });

describe('Invitado sin proyectos', () => {
  it('ve el mensaje y no puede crear tareas', () => {
    render(<TaskWorkspace profile={profile('guest')} renderHeader={(button) => <header>{button}</header>} />);
    expect(screen.getByText('Todavía no tienes proyectos asignados.')).toBeInTheDocument();
    expect(screen.getByText('El administrador te agregará.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Nueva tarea' })).not.toBeInTheDocument();
  });

  it('un miembro sin proyectos sigue viendo Mis tareas normal', () => {
    render(<TaskWorkspace profile={profile('member')} renderHeader={(button) => <header>{button}</header>} />);
    expect(screen.queryByText('Todavía no tienes proyectos asignados.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Nueva tarea' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run tests/components/NoProjectsYet.test.tsx`
Expected: FAIL (no aparece el mensaje).

- [ ] **Step 3: Implementación**

```tsx
// src/components/projects/NoProjectsYet.tsx
import styles from './NoProjectsYet.module.css';

/** Lo que ve un Invitado mientras el admin no lo agrega a ningún proyecto. */
export function NoProjectsYet() {
  return (
    <div className={styles.box} role="status">
      <p className={styles.title}>Todavía no tienes proyectos asignados.</p>
      <p>El administrador te agregará.</p>
    </div>
  );
}
```

```css
/* src/components/projects/NoProjectsYet.module.css */
.box {
  display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-6) var(--space-4); text-align: center;
  border: 1px dashed var(--color-border-strong); border-radius: var(--radius-lg); background: var(--color-surface-default);
  color: var(--color-text-secondary);
}
.title { font-size: var(--text-xl); font-weight: var(--weight-semibold); color: var(--color-text-heading); }
```

`TaskWorkspace.tsx`:
- `const { projects, loading: projectsLoading } = useProjects();`
- `const withoutProjects = profile.role === 'guest' && !projectsLoading && projects.length === 0;`
- En el encabezado: `renderHeader(canCreate && !withoutProjects ? <Button …>+ Nueva tarea</Button> : null)` (mismo botón de hoy).
- Al principio de `<main className={styles.main}>`: si `withoutProjects`, renderizar solo `<NoProjectsYet />` en lugar del resto del contenido de `main` (alerta de solo lectura y sección de tareas).
- Si `withoutProjects`, no mostrar las barras de filtros del encabezado fijo (envolver el `<div className={styles.bars}>` con `{!withoutProjects && …}`).

`ProjectsPage.tsx`: si `me.role === 'guest' && !loading && projects.length === 0`, mostrar `<NoProjectsYet />` en lugar del párrafo vacío.

`CalendarPage.tsx`: `const { projects, loading: projectsLoading } = useProjects();` y, si `me.role === 'guest' && !projectsLoading && projects.length === 0`, mostrar `<NoProjectsYet />` dentro de `<main>` en lugar de las vistas.

- [ ] **Step 4: Ver que pasan**

Run: `npm test && npm run build && npm run lint`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(v2): mensaje para el Invitado sin proyectos"
```

---

### Task 3: Equipo — proyectos de cada Invitado y aviso con responsables

**Files:**
- Modify: `src/features/projects/projectPeople.ts` (`projectsOfGuest`, `ownedProjects`)
- Modify: `src/components/team/MemberRow.tsx` (+ css), `src/pages/TeamPage.tsx`
- Test: `tests/unit/projectPeople.test.ts`, `tests/components/TeamPage.test.tsx`

**Interfaces:**
- Produces:
  - `projectsOfGuest(projects: readonly Project[], uid: string): Project[]`
  - `ownedProjects(projects: readonly Project[], uid: string): Project[]`
  - `MemberRow` prop nueva `projectsLabel?: string`

- [ ] **Step 1: Tests que fallan**

En `tests/unit/projectPeople.test.ts`:

```ts
import { ownedProjects, projectsOfGuest } from '@/features/projects/projectPeople';
import type { Project } from '@/types/project';

describe('proyectos de una persona', () => {
  const projects = [
    { id: 'p1', name: 'Portal', ownerId: 'ana', memberIds: ['gus'] },
    { id: 'p2', name: 'Web', ownerId: 'leo', memberIds: [] },
  ] as unknown as Project[];

  it('en cuáles está un Invitado y de cuáles es responsable alguien', () => {
    expect(projectsOfGuest(projects, 'gus').map((p) => p.name)).toEqual(['Portal']);
    expect(ownedProjects(projects, 'leo').map((p) => p.name)).toEqual(['Web']);
  });
});
```

En `tests/components/TeamPage.test.tsx`: sumar `projects: [] as Project[]` al `state` (importar `type Project`), el mock

```tsx
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: state.projects, loading: false, error: null }) }));
```

`state.projects = [];` en el `beforeEach`, y los casos:

```tsx
  it('muestra los proyectos de cada Invitado', () => {
    state.members = [...state.members, person('gus', 'Gus', 'guest'), person('tom', 'Tom', 'guest')];
    state.projects = [{ id: 'p1', name: 'Portal', ownerId: 'ana', memberIds: ['gus'] } as unknown as Project];
    renderPage();
    expect(row('Gus')).toHaveTextContent('Proyectos: Portal');
    expect(row('Tom')).toHaveTextContent('Sin proyectos');
  });

  it('no pasa a Invitado a alguien que es responsable de un proyecto', async () => {
    state.projects = [{ id: 'p1', name: 'Portal', ownerId: 'luis', memberIds: [] } as unknown as Project];
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText('Rol de Luis'), 'Invitado');
    expect(state.updateMember).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Luis es responsable de «Portal»: cambia el responsable antes de pasarlo a Invitado.');
  });
```

(`renderPage` es la función de render que ya usa el archivo, con `state.me` admin; adaptar el nombre si difiere. Si el Toast usa `role="alert"` para errores, cambiar `getByRole('status')` por `getByRole('alert')`.)

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/unit/projectPeople.test.ts tests/components/TeamPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementación**

En `projectPeople.ts`:

```ts
/** Proyectos donde el admin agregó a esta persona. */
export function projectsOfGuest(projects: readonly Project[], uid: string): Project[] {
  return projects.filter((p) => (p.memberIds ?? []).includes(uid));
}

/** Proyectos de los que la persona es responsable (un Invitado no puede serlo). */
export function ownedProjects(projects: readonly Project[], uid: string): Project[] {
  return projects.filter((p) => p.ownerId === uid);
}
```

`MemberRow.tsx`: prop `projectsLabel?: string` (documentada: "Solo para Invitados: en qué proyectos está") y, dentro de `.info`, debajo del email:

```tsx
        {projectsLabel && <p className={styles.projects}>{projectsLabel}</p>}
```

CSS: `.projects { font-size: var(--text-sm); color: var(--color-text-secondary); }`

`TeamPage.tsx` (`TeamView`): `const { projects } = useProjects();` y

```tsx
  const projectsLabel = (member: UserProfile) => {
    if (member.role !== 'guest') return undefined;
    const names = projectsOfGuest(projects, member.uid).map((p) => p.name);
    return names.length > 0 ? `Proyectos: ${names.join(', ')}` : 'Sin proyectos';
  };

  function changeRole(member: UserProfile, role: Role) {
    const owned = ownedProjects(projects, member.uid);
    if (role === 'guest' && owned.length > 0) {
      const list = owned.map((p) => `«${p.name}»`).join(', ');
      setToast({ kind: 'error', message: `${member.displayName} es responsable de ${list}: cambia el responsable antes de pasarlo a Invitado.` });
      return;
    }
    void change(member, { role }, `Rol de ${member.displayName} actualizado.`);
  }
```

y en `MemberRow`: `projectsLabel={projectsLabel(member)}` y `onRoleChange={(role) => changeRole(member, role)}`.

- [ ] **Step 4: Ver que pasan**

Run: `npm test && npm run build && npm run lint`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(v2): Equipo muestra los proyectos de cada Invitado"
```

---

### Task 4: Frases de auditoría para las personas del proyecto

**Files:**
- Modify: `src/features/audit/describeAuditEntry.ts`, `src/features/audit/auditFields.ts`
- Test: `tests/unit/describeAuditEntry.test.ts`, `tests/unit/auditFields.test.ts`

- [ ] **Step 1: Tests que fallan**

En `tests/unit/describeAuditEntry.test.ts`, dentro de `describe('describeAuditEntry', …)`:

```ts
  it('proyecto: agregar y quitar personas', () => {
    const p = { name: 'Portal', ownerId: 'ana' };
    expect(describeAuditEntry(entry({ entityType: 'project', actorId: 'admin', before: p, after: { ...p, memberIds: ['leo'] } }), ctx).sentences)
      .toEqual(['Admin agregó a Leo al proyecto «Portal»']);
    expect(describeAuditEntry(entry({ entityType: 'project', actorId: 'admin', before: { ...p, memberIds: ['leo', 'ana'] }, after: { ...p, memberIds: ['ana'] } }), ctx).sentences)
      .toEqual(['Admin quitó a Leo del proyecto «Portal»']);
  });
```

En `tests/unit/auditFields.test.ts`:

```ts
  it('personas del proyecto con nombres', () => {
    expect(fieldLabel('memberIds')).toBe('Personas');
    expect(formatAuditValue('memberIds', ['leo', 'x'], ctx)).toBe('Leo, Persona desconocida');
    expect(formatAuditValue('memberIds', [], ctx)).toBe('—');
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/unit/describeAuditEntry.test.ts tests/unit/auditFields.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementación**

`describeAuditEntry.ts`, en el `switch` de `projectSentences`:

```ts
      case 'memberIds': {
        const prev = (from ?? []) as string[];
        const next = (to ?? []) as string[];
        const nameOf = (uid: string) => ctx.nameOf(uid) ?? 'alguien';
        return [
          ...next.filter((uid) => !prev.includes(uid)).map((uid) => `${who} agregó a ${nameOf(uid)} al proyecto «${name}»`),
          ...prev.filter((uid) => !next.includes(uid)).map((uid) => `${who} quitó a ${nameOf(uid)} del proyecto «${name}»`),
        ];
      }
```

`auditFields.ts`: en `FIELD_LABEL` agregar `memberIds: 'Personas'`, y en `formatAuditValue`, antes del caso genérico de listas:

```ts
  if (field === 'memberIds' && Array.isArray(value)) {
    return value.map((uid) => ctx.nameOf(String(uid)) ?? 'Persona desconocida').join(', ') || '—';
  }
```

- [ ] **Step 4: Ver que pasan**

Run: `npm test && npm run build && npm run lint`
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(v2): la auditoría cuenta quién entra y sale de cada proyecto"
```

---

### Task 5: Preview, prueba y documentación

- [ ] **Step 1: Preview** — `vercel --yes`, `vercel alias set <url> matecode-tasks-dev.vercel.app`, producción responde 200. (Las reglas no cambian en la 9B.)

- [ ] **Step 2: Prueba de la usuaria**
  - Como admin, en un proyecto: "Personas del proyecto" → agregar al Invitado de prueba y a un miembro; ver etiquetas; quitar con confirmación (el aviso cuenta sus tareas sin terminar).
  - Como Invitado (ventana privada): ve ese proyecto en Proyectos, sus tareas en Mis tareas y Calendario; crea una tarea (el proyecto es obligatorio), la asigna a alguien del proyecto, cambia estados y subtareas; ve "Alguien del equipo" en tareas asignadas a gente que no está en la lista; no ve otros proyectos.
  - Quitar al Invitado del proyecto: deja de verlo al instante y vuelve el mensaje "Todavía no tienes proyectos asignados".
  - Equipo (admin): fila del Invitado con "Proyectos: …"; intentar pasar a Invitado a un responsable muestra el aviso.
  - Ajustes → Auditoría: "Admin agregó a … al proyecto «…»".

- [ ] **Step 3: Documentación**
  - `README.md`: sección "Invitados por proyecto (etapa 9)": rol Invitado, personas del proyecto (lista auditada + tarjetas validadas por las reglas), qué ve y hace el Invitado, lectura según el rol, índice de tarjetas (`fieldOverrides`), y totales de tests actualizados. Mencionar el ajuste de tareas terminadas (tachadas y en gris, sin transparencias).
  - `AI_LOG.md`: entrada "v2 — Etapa 9: Invitados por proyecto" (qué pedí, qué propuso, qué revisé o cambié, "Qué aprendí" pendiente para la usuaria, qué no funcionó: el índice de "campo único" no se encontraba en la consola y se obtuvo el enlace directo con una consulta; tipos del servidor en el resumen).
  - `CLAUDE.md`: etapa 9 ✅; Arquitectura: rol `guest`, `memberIds` + tarjetas `projects/{id}/people/{uid}`, hooks que leen según el rol (`subscribeFanOut`); Comandos: el índice de tarjetas se crea con el enlace que devuelve la consulta; integrar a `main` incluye ese índice.

- [ ] **Step 4: Commit**

```bash
git add README.md AI_LOG.md CLAUDE.md
git commit -m "docs(v2): etapa 9 en README, AI_LOG y contexto"
```
