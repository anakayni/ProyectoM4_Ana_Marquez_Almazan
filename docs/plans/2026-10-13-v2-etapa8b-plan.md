# Etapa 8B v2 — Auditoría para el admin: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pestaña "Auditoría" en Ajustes donde el admin lee todos los cambios del espacio en frases, los filtra (tipo, persona, fechas), carga de a 50, ve el detalle antes → después y exporta un CSV.

**Architecture:** Lógica pura en `src/features/audit/` (frases por tipo, etiquetas y valores legibles, filtros → rango de fechas, CSV seguro). Lectura paginada con `getDocs` + `orderBy('at','desc')` + `startAfter` en `audit.service.ts`, con tres índices compuestos en `firestore.indexes.json`. Un hook `useAuditLog` maneja la página actual y "Cargar más"; la pantalla se arma en `SettingsPage` con dos pestañas (General / Auditoría) dentro del encabezado fijo.

**Tech Stack:** React 19 + TS, Firebase 12 (Firestore), Vitest + RTL, CSS Modules con tokens.

**Spec:** `docs/specs/2026-10-13-v2-etapa8-ajustes-design.md` (secciones 1, 3, 4, 5 y 6, parte 8B).

## Global Constraints

- Solo el admin ve Ajustes y lee toda la auditoría (las reglas ya lo exigen: `isAdmin() || entityType in ['task','project']`).
- `auditLog` es solo-agregar: esta etapa **solo lee**.
- Frases en español, sin jerga; los IDs nunca se muestran crudos (se traducen a nombres, proyectos o etiquetas).
- Páginas de **50**; "Cargar más" agrega la siguiente.
- CSV: separador `;`, BOM UTF-8 (Excel en español), todo entre comillas, y celdas que empiezan con `=`, `+`, `-`, `@`, tabulador o retorno llevan `'` delante (protección contra fórmulas).
- Exportar trae **todo lo que coincide con los filtros** hasta 5000 cambios; si hay más, lo avisa.
- Accesibilidad: etiquetas visibles en los filtros, cada cambio es un botón, tabla con encabezados, contraste ≥ 4.5:1 (solo tokens, sin hex).
- Costo $0 (Spark): lecturas paginadas, nada en tiempo real para la lista completa.
- `npm test`, `npm run build` y `npm run lint` en verde antes de cada commit; un commit por tarea con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Frases y valores legibles de la auditoría

**Files:**
- Modify: `src/features/audit/describeChange.ts` (exportar `actorName`)
- Modify: `src/utils/formatDate.ts` (agregar `formatDateTime`)
- Create: `src/features/audit/describeAuditEntry.ts`
- Create: `src/features/audit/auditFields.ts`
- Test: `tests/unit/describeAuditEntry.test.ts`, `tests/unit/auditFields.test.ts`, `tests/unit/formatDate.test.ts` (agregar caso)

**Interfaces:**
- Produces:
  - `actorName(actorId: string, nameOf: NameOf): string`
  - `formatDateTime(ms: number): string` — "13 oct 2026, 18:30"
  - `type AuditContext = { nameOf: NameOf; projectNameOf: ProjectNameOf; formatNumber: (n: number) => string }`
  - `type AuditDescription = { type: string; subject: string; sentences: string[] }`
  - `ENTITY_LABEL: Record<EntityType, string>`
  - `describeAuditEntry(entry: AuditEntry, ctx: AuditContext): AuditDescription`
  - `fieldLabel(field: string): string`
  - `formatAuditValue(field: string, value: unknown, ctx: AuditContext): string`

- [ ] **Step 1: Tests que fallan**

```ts
// tests/unit/describeAuditEntry.test.ts
import { describe, expect, it } from 'vitest';
import { describeAuditEntry, type AuditContext } from '@/features/audit/describeAuditEntry';
import { DEFAULT_SETTINGS } from '@/features/settings/defaults';
import type { AuditEntry } from '@/types/audit';

const names: Record<string, string> = { ana: 'Ana', leo: 'Leo', admin: 'Admin' };
const ctx: AuditContext = {
  nameOf: (id) => (id ? names[id] ?? null : null),
  projectNameOf: (id) => (id === 'p1' ? 'Portal' : null),
  formatNumber: (n) => `FL-${n}`,
};
const entry = (over: Partial<AuditEntry>): AuditEntry => ({
  entityType: 'task', entityId: 'x', rev: 2, action: 'update', actorId: 'ana', at: 0, before: null, after: null, ...over,
});

describe('describeAuditEntry', () => {
  it('tarea: número con el prefijo, título y las frases del historial', () => {
    const d = describeAuditEntry(
      entry({ before: { number: 12, title: 'Pagar luz', status: 'todo' }, after: { number: 12, title: 'Pagar luz', status: 'done' } }),
      ctx,
    );
    expect(d).toEqual({ type: 'Tarea', subject: 'FL-12 · Pagar luz', sentences: ['Ana cambió el estado de Pendiente a Hecha'] });
  });

  it('tarea sin número (antes de migrar): solo el título', () => {
    expect(describeAuditEntry(entry({ action: 'create', rev: 1, after: { title: 'Vieja' } }), ctx).subject).toBe('Vieja');
  });

  it('el sistema aparece como "El sistema"', () => {
    const d = describeAuditEntry(entry({ actorId: 'system', before: { title: 'A', number: null }, after: { title: 'A', number: 3 } }), ctx);
    expect(d.sentences).toEqual(['El sistema actualizó la tarea']);
  });

  it('proyecto: crear, archivar, poner a cargo y renombrar', () => {
    const p = { name: 'Portal', archived: false, ownerId: 'ana' };
    expect(describeAuditEntry(entry({ entityType: 'project', action: 'create', rev: 1, after: p }), ctx)).toEqual({
      type: 'Proyecto', subject: 'Portal', sentences: ['Ana creó el proyecto «Portal»'],
    });
    expect(describeAuditEntry(entry({ entityType: 'project', before: p, after: { ...p, archived: true } }), ctx).sentences)
      .toEqual(['Ana archivó el proyecto']);
    expect(describeAuditEntry(entry({ entityType: 'project', before: p, after: { ...p, ownerId: 'leo' } }), ctx).sentences)
      .toEqual(['Ana puso a Leo a cargo del proyecto']);
    expect(describeAuditEntry(entry({ entityType: 'project', before: p, after: { ...p, name: 'Web' } }), ctx).sentences)
      .toEqual(['Ana cambió el nombre del proyecto de «Portal» a «Web»']);
    expect(describeAuditEntry(entry({ entityType: 'project', action: 'delete', before: p, after: null }), ctx).sentences)
      .toEqual(['Ana eliminó el proyecto «Portal»']);
  });

  it('persona: alta, rol, acceso y foto propia', () => {
    const u = { displayName: 'Leo', role: 'member', active: true, photo: null };
    expect(describeAuditEntry(entry({ entityType: 'user', entityId: 'leo', actorId: 'leo', action: 'create', rev: 1, after: u }), ctx))
      .toEqual({ type: 'Persona', subject: 'Leo', sentences: ['Leo se unió al equipo'] });
    expect(describeAuditEntry(entry({ entityType: 'user', entityId: 'leo', actorId: 'admin', before: u, after: { ...u, role: 'viewer' } }), ctx).sentences)
      .toEqual(['Admin cambió el rol de Leo de Miembro a Lector']);
    expect(describeAuditEntry(entry({ entityType: 'user', entityId: 'leo', actorId: 'admin', before: u, after: { ...u, active: false } }), ctx).sentences)
      .toEqual(['Admin desactivó el acceso de Leo']);
    expect(describeAuditEntry(entry({ entityType: 'user', entityId: 'leo', actorId: 'leo', before: u, after: { ...u, photo: 'data:image/jpeg;base64,x' } }), ctx).sentences)
      .toEqual(['Leo cambió su foto']);
  });

  it('invitación: crear, cancelar, aceptar y volver a invitar', () => {
    const inv = { email: 'leo@x.com', role: 'member', status: 'pending' };
    const base = { entityType: 'invitation' as const, entityId: 'leo@x.com', actorId: 'admin' };
    expect(describeAuditEntry(entry({ ...base, action: 'create', rev: 1, after: inv }), ctx))
      .toEqual({ type: 'Invitación', subject: 'leo@x.com', sentences: ['Admin invitó a leo@x.com como Miembro'] });
    expect(describeAuditEntry(entry({ ...base, before: inv, after: { ...inv, status: 'revoked' } }), ctx).sentences)
      .toEqual(['Admin canceló la invitación de leo@x.com']);
    expect(describeAuditEntry(entry({ ...base, actorId: 'leo', before: inv, after: { ...inv, status: 'accepted' } }), ctx).sentences)
      .toEqual(['Leo aceptó la invitación']);
    expect(describeAuditEntry(entry({ ...base, before: { ...inv, status: 'revoked' }, after: { ...inv, role: 'viewer' } }), ctx).sentences)
      .toEqual(['Admin volvió a invitar a leo@x.com como Lector']);
  });

  it('ajustes: el primer guardado se compara con los valores por defecto', () => {
    const after = { ...DEFAULT_SETTINGS, taskPrefix: 'FL', updatedBy: 'admin' };
    expect(describeAuditEntry(entry({ entityType: 'settings', entityId: 'workspace', actorId: 'admin', action: 'create', rev: 1, after }), ctx))
      .toEqual({ type: 'Ajustes', subject: 'Espacio de trabajo', sentences: ['Admin cambió el prefijo de las tareas a FL'] });
  });

  it('ajustes: logo, colores y nombre', () => {
    const before = { ...DEFAULT_SETTINGS, logo: 'data:image/png;base64,x' };
    const after = { ...before, logo: null, palette: ['#000000', ...DEFAULT_SETTINGS.palette.slice(1)], name: 'Ferretería' };
    expect(describeAuditEntry(entry({ entityType: 'settings', entityId: 'workspace', actorId: 'admin', before, after }), ctx).sentences)
      .toEqual(['Admin quitó el logo', 'Admin cambió el nombre del espacio a «Ferretería»', 'Admin cambió los colores']);
  });
});
```

```ts
// tests/unit/auditFields.test.ts
import { describe, expect, it } from 'vitest';
import { fieldLabel, formatAuditValue } from '@/features/audit/auditFields';
import type { AuditContext } from '@/features/audit/describeAuditEntry';
import { formatDateTime } from '@/utils/formatDate';

const ctx: AuditContext = {
  nameOf: (id) => (id === 'leo' ? 'Leo' : null),
  projectNameOf: (id) => (id === 'p1' ? 'Portal' : null),
  formatNumber: (n) => `MC-${n}`,
};

describe('fieldLabel', () => {
  it('traduce los campos conocidos y deja igual los desconocidos', () => {
    expect(fieldLabel('assigneeId')).toBe('Responsable');
    expect(fieldLabel('taskPrefix')).toBe('Prefijo');
    expect(fieldLabel('raro')).toBe('raro');
  });
});

describe('formatAuditValue', () => {
  it('vacíos, sí/no e imágenes', () => {
    expect(formatAuditValue('dueDate', null, ctx)).toBe('—');
    expect(formatAuditValue('description', '', ctx)).toBe('—');
    expect(formatAuditValue('active', true, ctx)).toBe('Sí');
    expect(formatAuditValue('archived', false, ctx)).toBe('No');
    expect(formatAuditValue('photo', 'data:image/jpeg;base64,abc', ctx)).toBe('(imagen)');
  });

  it('IDs a nombres y códigos a etiquetas', () => {
    expect(formatAuditValue('assigneeId', 'leo', ctx)).toBe('Leo');
    expect(formatAuditValue('ownerId', 'nadie', ctx)).toBe('Persona desconocida');
    expect(formatAuditValue('projectId', 'p1', ctx)).toBe('Portal');
    expect(formatAuditValue('status', 'doing', ctx)).toBe('En curso');
    expect(formatAuditValue('status', 'revoked', ctx)).toBe('Cancelada');
    expect(formatAuditValue('priority', 'alta', ctx)).toBe('Alta');
    expect(formatAuditValue('role', 'viewer', ctx)).toBe('Lector');
    expect(formatAuditValue('number', 7, ctx)).toBe('MC-7');
  });

  it('fechas, listas y subtareas', () => {
    const ms = new Date(2026, 9, 13, 18, 30).getTime();
    expect(formatAuditValue('createdAt', { toMillis: () => ms }, ctx)).toBe(formatDateTime(ms));
    expect(formatAuditValue('palette', ['#111111', '#222222'], ctx)).toBe('#111111, #222222');
    expect(formatAuditValue('subtasks', [{ id: 'a', title: 'Comprar', done: true }, { id: 'b', title: 'Pagar', done: false }], ctx))
      .toBe('✓ Comprar · ○ Pagar');
  });
});
```

Agregar a `tests/unit/formatDate.test.ts` (importar `formatDateTime` junto a lo que ya importa):

```ts
describe('formatDateTime', () => {
  it('incluye día, año y hora', () => {
    const text = formatDateTime(new Date(2026, 9, 13, 18, 30).getTime());
    expect(text).toContain('2026');
    expect(text).toContain('18:30');
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/unit/describeAuditEntry.test.ts tests/unit/auditFields.test.ts tests/unit/formatDate.test.ts`
Expected: FAIL — no existen `describeAuditEntry`, `auditFields` ni `formatDateTime`.

- [ ] **Step 3: Implementación**

En `src/features/audit/describeChange.ts`, renombrar `function actor(` a `export function actorName(` y su uso dentro de `describeChange` (`const who = actorName(entry.actorId, nameOf);`).

En `src/utils/formatDate.ts`, debajo de `dateTime`:

```ts
const fullDateTime = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** "13 oct 2026, 18:30" (para la auditoría, donde importa el año). */
export function formatDateTime(ms: number): string {
  return fullDateTime.format(new Date(ms));
}
```

```ts
// src/features/audit/describeAuditEntry.ts
import { DEFAULT_SETTINGS } from '@/features/settings/defaults';
import type { NameOf } from '@/features/team/members';
import { ROLE_LABEL, type Role } from '@/types/auth';
import type { AuditEntry, EntityType, Snapshot } from '@/types/audit';
import { formatDateLabel } from '@/utils/formatDate';
import { actorName, describeChange, type ProjectNameOf } from './describeChange';
import { diffSnapshots, type FieldChange } from './diffSnapshots';

export type AuditContext = { nameOf: NameOf; projectNameOf: ProjectNameOf; formatNumber: (n: number) => string };
export type AuditDescription = { type: string; subject: string; sentences: string[] };

export const ENTITY_LABEL: Record<EntityType, string> = {
  task: 'Tarea', project: 'Proyecto', user: 'Persona', invitation: 'Invitación', settings: 'Ajustes',
};

const role = (value: unknown) => ROLE_LABEL[value as Role] ?? 'sin rol';
/** Antes de existir la configuración, el espacio usaba los valores por defecto. */
const DEFAULT_SNAPSHOT: Snapshot = { ...DEFAULT_SETTINGS };

/** Frases a partir de las diferencias; si ningún campo "cuenta", una frase genérica. */
function fromDiff(changes: FieldChange[], toSentences: (change: FieldChange) => string[], fallback: string): string[] {
  const result = changes.flatMap(toSentences);
  return result.length > 0 ? result : [fallback];
}

function projectSentences(who: string, entry: AuditEntry, ctx: AuditContext, name: string): string[] {
  if (entry.action === 'create') return [`${who} creó el proyecto «${name}»`];
  if (entry.action === 'delete') return [`${who} eliminó el proyecto «${name}»`];
  return fromDiff(diffSnapshots(entry.before, entry.after), ({ field, from, to }) => {
    switch (field) {
      case 'name':
        return [`${who} cambió el nombre del proyecto de «${String(from)}» a «${String(to)}»`];
      case 'description':
        return [`${who} cambió la descripción del proyecto`];
      case 'color':
        return [`${who} cambió el color del proyecto`];
      case 'ownerId':
        return [`${who} puso a ${ctx.nameOf(String(to)) ?? 'alguien'} a cargo del proyecto`];
      case 'startDate':
        return [to ? `${who} cambió el inicio del proyecto a ${formatDateLabel(String(to))}` : `${who} quitó el inicio del proyecto`];
      case 'endDate':
        return [to ? `${who} cambió el fin del proyecto a ${formatDateLabel(String(to))}` : `${who} quitó el fin del proyecto`];
      case 'archived':
        return [to ? `${who} archivó el proyecto` : `${who} reactivó el proyecto`];
      default:
        return [];
    }
  }, `${who} actualizó el proyecto`);
}

function userSentences(who: string, entry: AuditEntry, name: string): string[] {
  if (entry.action === 'create') return [`${name} se unió al equipo`];
  if (entry.action === 'delete') return [`${who} eliminó a ${name}`];
  const self = entry.actorId === entry.entityId;
  return fromDiff(diffSnapshots(entry.before, entry.after), ({ field, from, to }) => {
    switch (field) {
      case 'role':
        return [`${who} cambió el rol de ${name} de ${role(from)} a ${role(to)}`];
      case 'active':
        return [to ? `${who} reactivó el acceso de ${name}` : `${who} desactivó el acceso de ${name}`];
      case 'displayName':
        return [self ? `${who} cambió su nombre a «${String(to)}»` : `${who} cambió el nombre de «${String(from)}» a «${String(to)}»`];
      case 'photo':
        if (to) return [self ? `${who} cambió su foto` : `${who} cambió la foto de ${name}`];
        return [self ? `${who} quitó su foto` : `${who} quitó la foto de ${name}`];
      default:
        return [];
    }
  }, `${who} actualizó el perfil de ${name}`);
}

function invitationSentences(who: string, entry: AuditEntry): string[] {
  const email = entry.entityId;
  if (entry.action === 'create') return [`${who} invitó a ${email} como ${role(entry.after?.role)}`];
  const from = entry.before?.status;
  const to = entry.after?.status;
  if (from !== to && to === 'revoked') return [`${who} canceló la invitación de ${email}`];
  if (from !== to && to === 'accepted') return [`${who} aceptó la invitación`];
  if (from !== to && to === 'pending') return [`${who} volvió a invitar a ${email} como ${role(entry.after?.role)}`];
  return [`${who} actualizó la invitación de ${email}`];
}

function settingsSentences(who: string, entry: AuditEntry): string[] {
  return fromDiff(diffSnapshots(entry.before ?? DEFAULT_SNAPSHOT, entry.after), ({ field, to }) => {
    switch (field) {
      case 'name':
        return [`${who} cambió el nombre del espacio a «${String(to)}»`];
      case 'logo':
        return [to ? `${who} cambió el logo` : `${who} quitó el logo`];
      case 'palette':
        return [`${who} cambió los colores`];
      case 'taskPrefix':
        return [`${who} cambió el prefijo de las tareas a ${String(to)}`];
      default:
        return [];
    }
  }, `${who} guardó los ajustes sin cambios`);
}

/** Qué elemento cambió, en palabras: "FL-12 · Pagar luz", "Portal", "Leo", un email o el espacio. */
function subjectOf(entry: AuditEntry, ctx: AuditContext): string {
  const snap = entry.after ?? entry.before ?? {};
  switch (entry.entityType) {
    case 'task': {
      const title = String(snap.title ?? 'Tarea');
      return typeof snap.number === 'number' ? `${ctx.formatNumber(snap.number)} · ${title}` : title;
    }
    case 'project':
      return String(snap.name ?? 'Proyecto');
    case 'user':
      return String(snap.displayName ?? ctx.nameOf(entry.entityId) ?? 'Persona');
    case 'invitation':
      return entry.entityId;
    case 'settings':
      return 'Espacio de trabajo';
  }
}

/** Una entrada de la auditoría contada para una persona: tipo, elemento y frases. */
export function describeAuditEntry(entry: AuditEntry, ctx: AuditContext): AuditDescription {
  const who = actorName(entry.actorId, ctx.nameOf);
  const subject = subjectOf(entry, ctx);
  const sentences = (() => {
    switch (entry.entityType) {
      case 'task':
        return describeChange(entry, ctx.nameOf, ctx.projectNameOf);
      case 'project':
        return projectSentences(who, entry, ctx, subject);
      case 'user':
        return userSentences(who, entry, subject);
      case 'invitation':
        return invitationSentences(who, entry);
      case 'settings':
        return settingsSentences(who, entry);
    }
  })();
  return { type: ENTITY_LABEL[entry.entityType], subject, sentences };
}
```

```ts
// src/features/audit/auditFields.ts
import { ROLE_LABEL, type Role } from '@/types/auth';
import { INVITATION_STATUS_LABEL, type InvitationStatus } from '@/types/invitation';
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type Subtask, type TaskStatus } from '@/types/task';
import { formatDateLabel, formatDateTime } from '@/utils/formatDate';
import type { AuditContext } from './describeAuditEntry';

const FIELD_LABEL: Record<string, string> = {
  title: 'Título', description: 'Descripción', status: 'Estado', priority: 'Prioridad', assigneeId: 'Responsable',
  projectId: 'Proyecto', dueDate: 'Vencimiento', subtasks: 'Subtareas', number: 'Número', completedBy: 'Completada por',
  completedAt: 'Completada el', createdBy: 'Creado por', createdAt: 'Creación', name: 'Nombre', color: 'Color',
  ownerId: 'A cargo', startDate: 'Inicio', endDate: 'Fin', archived: 'Archivado', displayName: 'Nombre', email: 'Email',
  photo: 'Foto', role: 'Rol', active: 'Acceso activo', invitedBy: 'Invitada por', acceptedBy: 'Aceptada por',
  acceptedAt: 'Aceptada el', logo: 'Logo', palette: 'Colores', taskPrefix: 'Prefijo',
};

/** Campos que guardan el ID de una persona. */
const PERSON_FIELDS = new Set(['assigneeId', 'ownerId', 'createdBy', 'completedBy', 'invitedBy', 'acceptedBy']);
/** Campos con fecha local 'YYYY-MM-DD'. */
const DATE_FIELDS = new Set(['dueDate', 'startDate', 'endDate']);

export function fieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? field;
}

const isTimestamp = (value: unknown): value is { toMillis: () => number } =>
  typeof value === 'object' && value !== null && typeof (value as { toMillis?: unknown }).toMillis === 'function';

/** Un valor guardado, en palabras: nombres en vez de IDs, etiquetas en vez de códigos, "(imagen)" en vez de datos. */
export function formatAuditValue(field: string, value: unknown, ctx: AuditContext): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (isTimestamp(value)) return formatDateTime(value.toMillis());
  if (PERSON_FIELDS.has(field)) return ctx.nameOf(String(value)) ?? 'Persona desconocida';
  if (field === 'projectId') return ctx.projectNameOf(String(value)) ?? 'Proyecto eliminado';
  if (field === 'number' && typeof value === 'number') return ctx.formatNumber(value);
  if (field === 'status') return STATUS_LABEL[value as TaskStatus] ?? INVITATION_STATUS_LABEL[value as InvitationStatus] ?? String(value);
  if (field === 'priority') return PRIORITY_LABEL[value as Priority] ?? String(value);
  if (field === 'role') return ROLE_LABEL[value as Role] ?? String(value);
  if (DATE_FIELDS.has(field)) return formatDateLabel(String(value));
  if (field === 'subtasks' && Array.isArray(value)) {
    return (value as Subtask[]).map((s) => `${s.done ? '✓' : '○'} ${s.title}`).join(' · ') || '—';
  }
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'string') return value.startsWith('data:image/') ? '(imagen)' : value;
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}
```

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run tests/unit/describeAuditEntry.test.ts tests/unit/auditFields.test.ts tests/unit/formatDate.test.ts tests/unit/describeChange.test.ts`
Expected: PASS (describeChange sigue igual).

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(v2): frases de auditoría para todos los tipos"
```

---

### Task 2: CSV seguro

**Files:**
- Create: `src/features/audit/auditCsv.ts`
- Create: `src/utils/download.ts`
- Test: `tests/unit/auditCsv.test.ts`

**Interfaces:**
- Consumes: `describeAuditEntry`, `AuditContext`, `actorName` (Task 1)
- Produces:
  - `type AuditCsvRow = { at: number; person: string; type: string; subject: string; action: string; detail: string }`
  - `csvCell(value: string): string`
  - `auditCsvRow(entry: AuditEntry, ctx: AuditContext): AuditCsvRow`
  - `auditToCsv(rows: AuditCsvRow[]): string`
  - `downloadTextFile(filename: string, text: string, type?: string): void`

- [ ] **Step 1: Test que falla**

```ts
// tests/unit/auditCsv.test.ts
import { describe, expect, it } from 'vitest';
import { auditCsvRow, auditToCsv, csvCell } from '@/features/audit/auditCsv';
import type { AuditContext } from '@/features/audit/describeAuditEntry';

const ctx: AuditContext = { nameOf: (id) => (id === 'ana' ? 'Ana' : null), projectNameOf: () => null, formatNumber: (n) => `MC-${n}` };

describe('csvCell', () => {
  it('pone comillas y duplica las comillas internas', () => {
    expect(csvCell('hola')).toBe('"hola"');
    expect(csvCell('dijo "sí"; listo')).toBe('"dijo ""sí""; listo"');
  });

  it('neutraliza lo que una planilla tomaría como fórmula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1')).toBe('"\'+1"');
    expect(csvCell('-2')).toBe('"\'-2"');
    expect(csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
  });
});

describe('auditToCsv', () => {
  it('BOM, encabezado, separador ; y una línea por cambio', () => {
    const at = new Date(2026, 9, 13, 9, 5).getTime();
    const row = auditCsvRow(
      { entityType: 'task', entityId: 't1', rev: 2, action: 'update', actorId: 'ana', at,
        before: { number: 4, title: 'Luz', status: 'todo' }, after: { number: 4, title: 'Luz', status: 'done' } },
      ctx,
    );
    expect(row).toEqual({ at, person: 'Ana', type: 'Tarea', subject: 'MC-4 · Luz', action: 'Cambio', detail: 'Ana cambió el estado de Pendiente a Hecha' });
    const csv = auditToCsv([row]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      '"Fecha";"Persona";"Tipo";"Elemento";"Acción";"Detalle"',
      '"2026-10-13 09:05";"Ana";"Tarea";"MC-4 · Luz";"Cambio";"Ana cambió el estado de Pendiente a Hecha"',
      '',
    ]);
  });

  it('varias frases van en la misma celda, separadas por punto y coma', () => {
    const row = auditCsvRow(
      { entityType: 'project', entityId: 'p', rev: 2, action: 'update', actorId: 'ana', at: 0,
        before: { name: 'A', archived: false, color: '#111111' }, after: { name: 'A', archived: true, color: '#222222' } },
      ctx,
    );
    expect(row.detail).toBe('Ana archivó el proyecto; Ana cambió el color del proyecto');
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run tests/unit/auditCsv.test.ts`
Expected: FAIL — no existe `@/features/audit/auditCsv`.

> Nota: en el segundo test el orden sale de `diffSnapshots`, que ordena los campos alfabéticamente (`archived` antes que `color`).

- [ ] **Step 3: Implementación**

```ts
// src/features/audit/auditCsv.ts
import type { AuditAction, AuditEntry } from '@/types/audit';
import { actorName } from './describeChange';
import { describeAuditEntry, type AuditContext } from './describeAuditEntry';

export type AuditCsvRow = { at: number; person: string; type: string; subject: string; action: string; detail: string };

const ACTION_LABEL: Record<AuditAction, string> = { create: 'Creación', update: 'Cambio', delete: 'Eliminación' };
const HEADER = ['Fecha', 'Persona', 'Tipo', 'Elemento', 'Acción', 'Detalle'];
/** Excel en español espera ";" como separador. */
const SEPARATOR = ';';

/**
 * Celda segura: entre comillas, con las comillas internas duplicadas y, si empieza como una fórmula
 * (= + - @, tabulador o retorno), con un apóstrofo delante para que la planilla la muestre como texto.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-13 09:05" en hora local: se ordena bien en una planilla. */
function csvDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function auditCsvRow(entry: AuditEntry, ctx: AuditContext): AuditCsvRow {
  const { type, subject, sentences } = describeAuditEntry(entry, ctx);
  return {
    at: entry.at,
    person: actorName(entry.actorId, ctx.nameOf),
    type,
    subject,
    action: ACTION_LABEL[entry.action],
    detail: sentences.join('; '),
  };
}

/** CSV con BOM (para que Excel lea bien los acentos) y fin de línea de Windows. */
export function auditToCsv(rows: AuditCsvRow[]): string {
  const lines = [HEADER, ...rows.map((r) => [csvDate(r.at), r.person, r.type, r.subject, r.action, r.detail])];
  return `﻿${lines.map((cells) => cells.map(csvCell).join(SEPARATOR)).join('\r\n')}\r\n`;
}
```

```ts
// src/utils/download.ts
/** Descarga un texto como archivo (sin servidor: se arma en el navegador). */
export function downloadTextFile(filename: string, text: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Se libera después, para no cortar la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run tests/unit/auditCsv.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(v2): exportación de la auditoría a CSV con protección de fórmulas"
```

---

### Task 3: Lectura paginada con filtros

**Files:**
- Create: `src/features/audit/auditFilters.ts`
- Modify: `src/services/audit.service.ts`
- Create: `src/hooks/useAuditLog.ts`
- Create: `firestore.indexes.json`; Modify: `firebase.json`
- Test: `tests/unit/auditFilters.test.ts`, `tests/unit/useAuditLog.test.tsx`, `tests/rules/audit.rules.test.ts` (agregar casos)

**Interfaces:**
- Produces:
  - `type AuditFilters = { entityType: EntityType | 'all'; actorId: string; from: string; to: string }` (`actorId: ''` = todas; fechas `'YYYY-MM-DD'` o `''`)
  - `EMPTY_AUDIT_FILTERS: AuditFilters`
  - `ENTITY_FILTER_OPTIONS: { value: EntityType; label: string }[]`
  - `filterBounds(filters: Pick<AuditFilters, 'from' | 'to'>): { start: number | null; end: number | null }`
  - `AUDIT_PAGE_SIZE = 50`, `type AuditCursor`, `type AuditPage = { entries: AuditEntry[]; cursor: AuditCursor | null; hasMore: boolean }`
  - `fetchAuditPage(filters: AuditFilters, cursor: AuditCursor | null, pageSize?: number): Promise<AuditPage>`
  - `fetchAllAudit(filters: AuditFilters, max?: number): Promise<{ entries: AuditEntry[]; truncated: boolean }>`
  - `useAuditLog(filters: AuditFilters): { entries; loading; loadingMore; error; hasMore; loadMore: () => Promise<void> }`

- [ ] **Step 1: Tests que fallan**

```ts
// tests/unit/auditFilters.test.ts
import { describe, expect, it } from 'vitest';
import { filterBounds } from '@/features/audit/auditFilters';

describe('filterBounds', () => {
  it('sin fechas no limita', () => {
    expect(filterBounds({ from: '', to: '' })).toEqual({ start: null, end: null });
  });

  it('"desde" empieza a las 00:00 y "hasta" incluye todo ese día', () => {
    expect(filterBounds({ from: '2026-06-10', to: '2026-06-12' })).toEqual({
      start: new Date(2026, 5, 10).getTime(),
      end: new Date(2026, 5, 13).getTime(),
    });
  });
});
```

```tsx
// tests/unit/useAuditLog.test.tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_AUDIT_FILTERS } from '@/features/audit/auditFilters';
import type { AuditEntry } from '@/types/audit';

const svc = vi.hoisted(() => ({ fetchAuditPage: vi.fn() }));
vi.mock('@/services/audit.service', () => ({ fetchAuditPage: svc.fetchAuditPage }));

import { useAuditLog } from '@/hooks/useAuditLog';

const e = (rev: number): AuditEntry => ({
  entityType: 'task', entityId: 't', rev, action: 'update', actorId: 'ana', at: rev, before: null, after: null,
});

describe('useAuditLog', () => {
  beforeEach(() => {
    svc.fetchAuditPage.mockReset();
  });

  it('carga la primera página y agrega la siguiente con "Cargar más"', async () => {
    svc.fetchAuditPage
      .mockResolvedValueOnce({ entries: [e(3), e(2)], cursor: 'c1', hasMore: true })
      .mockResolvedValueOnce({ entries: [e(1)], cursor: 'c2', hasMore: false });
    const { result } = renderHook(() => useAuditLog(EMPTY_AUDIT_FILTERS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((x) => x.rev)).toEqual([3, 2]);
    expect(result.current.hasMore).toBe(true);

    await act(() => result.current.loadMore());
    expect(svc.fetchAuditPage).toHaveBeenLastCalledWith(EMPTY_AUDIT_FILTERS, 'c1');
    expect(result.current.entries.map((x) => x.rev)).toEqual([3, 2, 1]);
    expect(result.current.hasMore).toBe(false);
  });

  it('si falla, muestra un mensaje', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    svc.fetchAuditPage.mockRejectedValueOnce(new Error('index'));
    const { result } = renderHook(() => useAuditLog(EMPTY_AUDIT_FILTERS));
    await waitFor(() => expect(result.current.error).toBe('No pudimos cargar la auditoría.'));
  });
});
```

Agregar a `tests/rules/audit.rules.test.ts` (sumar `limit` y `orderBy` al import de `firebase/firestore`):

```ts
describe('lectura de toda la auditoría', () => {
  it('el admin la lee completa, ordenada por fecha y filtrada', async () => {
    await createTask(as('ana'), 'ana', input);
    const log = collection(as('admin'), 'auditLog');
    await assertSucceeds(getDocs(query(log, orderBy('at', 'desc'), limit(50))));
    await assertSucceeds(getDocs(query(log, where('actorId', '==', 'ana'), orderBy('at', 'desc'), limit(50))));
  });

  it('un miembro no puede leer la auditoría completa', async () => {
    await assertFails(getDocs(query(collection(as('ana'), 'auditLog'), orderBy('at', 'desc'), limit(50))));
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/unit/auditFilters.test.ts tests/unit/useAuditLog.test.tsx`
Expected: FAIL — no existen `auditFilters` ni `useAuditLog`.

Run: `npm run test:rules`
Expected: PASS (las reglas ya permiten esto; los casos nuevos protegen que siga así — el de miembro es el control negativo).

- [ ] **Step 3: Implementación**

```ts
// src/features/audit/auditFilters.ts
import type { EntityType } from '@/types/audit';

/** `actorId: ''` = todas las personas; fechas 'YYYY-MM-DD' locales o '' (sin límite). */
export type AuditFilters = { entityType: EntityType | 'all'; actorId: string; from: string; to: string };

export const EMPTY_AUDIT_FILTERS: AuditFilters = { entityType: 'all', actorId: '', from: '', to: '' };

export const ENTITY_FILTER_OPTIONS: { value: EntityType; label: string }[] = [
  { value: 'task', label: 'Tareas' },
  { value: 'project', label: 'Proyectos' },
  { value: 'user', label: 'Personas' },
  { value: 'invitation', label: 'Invitaciones' },
  { value: 'settings', label: 'Ajustes' },
];

function localMidnight(value: string, plusDays = 0): number {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day + plusDays).getTime();
}

/** Desde las 00:00 de `from` hasta antes de las 00:00 del día siguiente a `to` (así "hasta" incluye ese día). */
export function filterBounds({ from, to }: Pick<AuditFilters, 'from' | 'to'>): { start: number | null; end: number | null } {
  return { start: from ? localMidnight(from) : null, end: to ? localMidnight(to, 1) : null };
}
```

`src/services/audit.service.ts` completo:

```ts
// src/services/audit.service.ts
import {
  collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, Timestamp, where,
  type QueryConstraint, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { filterBounds, type AuditFilters } from '@/features/audit/auditFilters';
import type { AuditEntry } from '@/types/audit';
import { db } from './firebase';

function toEntry(d: QueryDocumentSnapshot): AuditEntry {
  const data = d.data({ serverTimestamps: 'estimate' });
  return { ...data, at: (data.at as Timestamp | null)?.toMillis() ?? Date.now() } as AuditEntry;
}

/**
 * Historial de una tarea en tiempo real. Dos filtros de igualdad no necesitan índice compuesto;
 * `entityType == 'task'` además es lo que permite la lectura en las reglas. Se ordena en el cliente.
 */
export function subscribeToTaskHistory(
  taskId: string,
  onData: (entries: AuditEntry[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(collection(db, 'auditLog'), where('entityType', '==', 'task'), where('entityId', '==', taskId));
  return onSnapshot(q, (snap) => onData(snap.docs.map(toEntry).sort((a, b) => b.rev - a.rev)), onError);
}

export const AUDIT_PAGE_SIZE = 50;

/** Marca dónde terminó la página anterior (lo usa Firestore para seguir desde ahí). */
export type AuditCursor = QueryDocumentSnapshot;
export type AuditPage = { entries: AuditEntry[]; cursor: AuditCursor | null; hasMore: boolean };

/**
 * Una página de la auditoría completa (solo admin), de la más reciente a la más vieja.
 * Tipo + persona + fecha necesitan los índices de `firestore.indexes.json`.
 */
export async function fetchAuditPage(filters: AuditFilters, cursor: AuditCursor | null, pageSize = AUDIT_PAGE_SIZE): Promise<AuditPage> {
  const { start, end } = filterBounds(filters);
  const constraints: QueryConstraint[] = [];
  if (filters.entityType !== 'all') constraints.push(where('entityType', '==', filters.entityType));
  if (filters.actorId) constraints.push(where('actorId', '==', filters.actorId));
  if (start !== null) constraints.push(where('at', '>=', Timestamp.fromMillis(start)));
  if (end !== null) constraints.push(where('at', '<', Timestamp.fromMillis(end)));
  constraints.push(orderBy('at', 'desc'));
  if (cursor) constraints.push(startAfter(cursor));
  // Uno de más: si llega, hay otra página (sin contar todo).
  constraints.push(limit(pageSize + 1));
  const snap = await getDocs(query(collection(db, 'auditLog'), ...constraints));
  const docs = snap.docs.slice(0, pageSize);
  return { entries: docs.map(toEntry), cursor: docs.at(-1) ?? null, hasMore: snap.docs.length > pageSize };
}

/** Todo lo que coincide con los filtros, de a 500, hasta `max` (para exportar). */
export async function fetchAllAudit(filters: AuditFilters, max = 5000): Promise<{ entries: AuditEntry[]; truncated: boolean }> {
  const entries: AuditEntry[] = [];
  let cursor: AuditCursor | null = null;
  for (;;) {
    const page: AuditPage = await fetchAuditPage(filters, cursor, 500);
    entries.push(...page.entries);
    if (!page.hasMore) return { entries, truncated: false };
    if (entries.length >= max) return { entries, truncated: true };
    cursor = page.cursor;
  }
}
```

```ts
// src/hooks/useAuditLog.ts
import { useEffect, useState } from 'react';
import type { AuditFilters } from '@/features/audit/auditFilters';
import { fetchAuditPage, type AuditCursor } from '@/services/audit.service';
import type { AuditEntry } from '@/types/audit';

/**
 * Auditoría paginada. Quien lo usa lo monta con `key` según los filtros:
 * así cada combinación empieza de cero (sin reiniciar estado dentro del efecto).
 */
export function useAuditLog(filters: AuditFilters) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [cursor, setCursor] = useState<AuditCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAuditPage(filters, null).then(
      (page) => {
        if (cancelled) return;
        setEntries(page.entries);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        // Si falta un índice, Firestore deja acá el enlace para crearlo.
        console.error('Error al leer la auditoría:', err);
        setError('No pudimos cargar la auditoría.');
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [filters]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchAuditPage(filters, cursor);
      setEntries((prev) => [...prev, ...page.entries]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error('Error al leer más auditoría:', err);
      setError('No pudimos cargar más cambios.');
    } finally {
      setLoadingMore(false);
    }
  }

  return { entries, loading, loadingMore, error, hasMore, loadMore };
}
```

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "auditLog", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "entityType", "order": "ASCENDING" }, { "fieldPath": "at", "order": "DESCENDING" }]
    },
    {
      "collectionGroup": "auditLog", "queryScope": "COLLECTION",
      "fields": [{ "fieldPath": "actorId", "order": "ASCENDING" }, { "fieldPath": "at", "order": "DESCENDING" }]
    },
    {
      "collectionGroup": "auditLog", "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "entityType", "order": "ASCENDING" },
        { "fieldPath": "actorId", "order": "ASCENDING" },
        { "fieldPath": "at", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

(El archivo JSON real va sin la línea de comentario.) En `firebase.json`: `"firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }`.

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run tests/unit/auditFilters.test.ts tests/unit/useAuditLog.test.tsx tests/components/TaskHistory.test.tsx && npm run test:rules`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src tests firestore.indexes.json firebase.json
git commit -m "feat(v2): lectura paginada y filtrada de la auditoría"
```

---

### Task 4: Pestaña Auditoría en Ajustes

**Files:**
- Create: `src/components/settings/AuditFilters.tsx` (+ `.module.css`)
- Create: `src/components/settings/AuditLog.tsx` (+ `.module.css`)
- Create: `src/components/settings/AuditEntryDialog.tsx` (+ `.module.css`)
- Modify: `src/pages/SettingsPage.tsx` (+ css)
- Test: `tests/components/AuditFilters.test.tsx`, `tests/components/AuditLog.test.tsx`, `tests/components/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–3 (`describeAuditEntry`, `fieldLabel`, `formatAuditValue`, `auditCsvRow`, `auditToCsv`, `downloadTextFile`, `AuditFilters`, `EMPTY_AUDIT_FILTERS`, `ENTITY_FILTER_OPTIONS`, `useAuditLog`, `fetchAllAudit`); `useTeamMembers`, `useProjects`, `useTaskNumberFormat`, `makeNameOf`.
- Produces: `<AuditFilters value onChange />`, `<AuditLog filters />` (montar con `key`), `<AuditEntryDialog entry ctx onClose />`.

- [ ] **Step 1: Tests que fallan**

```tsx
// tests/components/AuditFilters.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_AUDIT_FILTERS } from '@/features/audit/auditFilters';

vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: () => [
    { uid: 'leo', email: 'l@x.com', displayName: 'Leo', role: 'member', active: false, invitedBy: null, rev: 1 },
    { uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'admin', active: true, invitedBy: null, rev: 1 },
  ],
}));

import { AuditFilters } from '@/components/settings/AuditFilters';

describe('AuditFilters', () => {
  it('cambia el tipo y la persona', async () => {
    const onChange = vi.fn();
    render(<AuditFilters value={EMPTY_AUDIT_FILTERS} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Proyectos');
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_AUDIT_FILTERS, entityType: 'project' });
    const people = screen.getByLabelText('Persona');
    expect([...people.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Todas', 'Ana', 'Leo (desactivada)', 'El sistema']);
    await userEvent.selectOptions(people, 'Ana');
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_AUDIT_FILTERS, actorId: 'ana' });
  });

  it('"Limpiar filtros" aparece solo con filtros y los vacía', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<AuditFilters value={EMPTY_AUDIT_FILTERS} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
    rerender(<AuditFilters value={{ ...EMPTY_AUDIT_FILTERS, from: '2026-10-01' }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onChange).toHaveBeenLastCalledWith(EMPTY_AUDIT_FILTERS);
  });
});
```

```tsx
// tests/components/AuditLog.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_AUDIT_FILTERS } from '@/features/audit/auditFilters';
import type { AuditEntry } from '@/types/audit';

const svc = vi.hoisted(() => ({ fetchAuditPage: vi.fn(), fetchAllAudit: vi.fn(), downloadTextFile: vi.fn() }));
vi.mock('@/services/audit.service', () => ({ fetchAuditPage: svc.fetchAuditPage, fetchAllAudit: svc.fetchAllAudit }));
vi.mock('@/utils/download', () => ({ downloadTextFile: svc.downloadTextFile }));
vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: () => [{ uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'admin', active: true, invitedBy: null, rev: 1 }],
}));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loading: false, error: null }) }));

import { AuditLog } from '@/components/settings/AuditLog';

const statusChange: AuditEntry = {
  entityType: 'task', entityId: 't1', rev: 2, action: 'update', actorId: 'ana', at: new Date(2026, 9, 13, 9, 5).getTime(),
  before: { number: 4, title: 'Luz', status: 'todo' }, after: { number: 4, title: 'Luz', status: 'done' },
};
const created: AuditEntry = { ...statusChange, rev: 1, action: 'create', before: null, after: { number: 4, title: 'Luz', status: 'todo' } };

describe('AuditLog', () => {
  beforeEach(() => {
    svc.fetchAuditPage.mockReset();
    svc.fetchAllAudit.mockReset();
    svc.downloadTextFile.mockReset();
  });

  it('muestra los cambios en frases y "Cargar más" trae la siguiente página', async () => {
    svc.fetchAuditPage
      .mockResolvedValueOnce({ entries: [statusChange], cursor: 'c1', hasMore: true })
      .mockResolvedValueOnce({ entries: [created], cursor: 'c2', hasMore: false });
    render(<AuditLog filters={EMPTY_AUDIT_FILTERS} />);
    expect(await screen.findByRole('button', { name: /Ana cambió el estado de Pendiente a Hecha/ })).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 cambio')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByRole('button', { name: /Ana creó la tarea/ })).toBeInTheDocument();
    expect(svc.fetchAuditPage).toHaveBeenLastCalledWith(EMPTY_AUDIT_FILTERS, 'c1');
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
  });

  it('sin resultados lo dice', async () => {
    svc.fetchAuditPage.mockResolvedValueOnce({ entries: [], cursor: null, hasMore: false });
    render(<AuditLog filters={EMPTY_AUDIT_FILTERS} />);
    expect(await screen.findByText('No hay cambios con estos filtros.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  });

  it('el detalle muestra antes y después', async () => {
    svc.fetchAuditPage.mockResolvedValueOnce({ entries: [statusChange], cursor: 'c1', hasMore: false });
    render(<AuditLog filters={EMPTY_AUDIT_FILTERS} />);
    await userEvent.click(await screen.findByRole('button', { name: /Ana cambió el estado/ }));
    const dialog = screen.getByRole('dialog', { name: 'Detalle del cambio' });
    const row = within(dialog).getByRole('row', { name: /Estado/ });
    expect(within(row).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Pendiente', 'Hecha']);
  });

  it('exporta todo lo filtrado a CSV', async () => {
    svc.fetchAuditPage.mockResolvedValueOnce({ entries: [statusChange], cursor: 'c1', hasMore: true });
    svc.fetchAllAudit.mockResolvedValueOnce({ entries: [statusChange, created], truncated: false });
    render(<AuditLog filters={EMPTY_AUDIT_FILTERS} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));
    expect(svc.fetchAllAudit).toHaveBeenCalledWith(EMPTY_AUDIT_FILTERS);
    const [filename, text] = svc.downloadTextFile.mock.calls[0];
    expect(filename).toMatch(/^auditoria-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(text).toContain('"Ana creó la tarea"');
    expect(await screen.findByText('Se exportaron 2 cambios.')).toBeInTheDocument();
  });
});
```

Agregar a `tests/components/SettingsPage.test.tsx`, junto a los otros `vi.mock`:

```tsx
vi.mock('@/services/audit.service', () => ({
  fetchAuditPage: () => Promise.resolve({ entries: [], cursor: null, hasMore: false }),
  fetchAllAudit: vi.fn(),
}));
vi.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => [] }));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loading: false, error: null }) }));
```

y el caso (importar `userEvent`):

```tsx
  it('la pestaña Auditoría muestra filtros y cambios', async () => {
    as('admin');
    renderAt();
    await userEvent.click(screen.getByRole('radio', { name: 'Auditoría' }));
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument();
    expect(await screen.findByText('No hay cambios con estos filtros.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre del espacio')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/components/AuditFilters.test.tsx tests/components/AuditLog.test.tsx tests/components/SettingsPage.test.tsx`
Expected: FAIL — no existen los componentes ni la pestaña.

- [ ] **Step 3: Implementación**

```tsx
// src/components/settings/AuditFilters.tsx
import { Button } from '@/components/ui/Button';
import { EMPTY_AUDIT_FILTERS, ENTITY_FILTER_OPTIONS, type AuditFilters as Filters } from '@/features/audit/auditFilters';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import styles from './AuditFilters.module.css';

type Props = { value: Filters; onChange: (next: Filters) => void };

/** Filtros de la auditoría: tipo, persona y rango de fechas. */
export function AuditFilters({ value, onChange }: Props) {
  const members = [...useTeamMembers()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  const isEmpty = JSON.stringify(value) === JSON.stringify(EMPTY_AUDIT_FILTERS);
  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        Tipo
        <select value={value.entityType} onChange={(e) => set({ entityType: e.target.value as Filters['entityType'] })}>
          <option value="all">Todos</option>
          {ENTITY_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        Persona
        <select value={value.actorId} onChange={(e) => set({ actorId: e.target.value })}>
          <option value="">Todas</option>
          {members.map((m) => <option key={m.uid} value={m.uid}>{m.displayName}{m.active ? '' : ' (desactivada)'}</option>)}
          <option value="system">El sistema</option>
        </select>
      </label>
      <label className={styles.field}>
        Desde
        <input type="date" value={value.from} max={value.to || undefined} onChange={(e) => set({ from: e.target.value })} />
      </label>
      <label className={styles.field}>
        Hasta
        <input type="date" value={value.to} min={value.from || undefined} onChange={(e) => set({ to: e.target.value })} />
      </label>
      {!isEmpty && <Button size="sm" variant="ghost" onClick={() => onChange(EMPTY_AUDIT_FILTERS)}>Limpiar filtros</Button>}
    </div>
  );
}
```

```css
/* src/components/settings/AuditFilters.module.css */
.filters { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.field { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-md); color: var(--color-text-secondary); }
.field select, .field input {
  min-height: 36px; padding: 0 var(--space-2);
  border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
  background: var(--color-surface-default); color: var(--color-text-primary);
}
```

```tsx
// src/components/settings/AuditLog.tsx
import { useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { auditCsvRow, auditToCsv } from '@/features/audit/auditCsv';
import type { AuditFilters } from '@/features/audit/auditFilters';
import { describeAuditEntry, type AuditContext } from '@/features/audit/describeAuditEntry';
import { makeNameOf } from '@/features/team/members';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useProjects } from '@/hooks/useProjects';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTaskNumberFormat } from '@/hooks/useWorkspaceSettings';
import { fetchAllAudit } from '@/services/audit.service';
import type { AuditEntry } from '@/types/audit';
import { downloadTextFile } from '@/utils/download';
import { formatDateTime, toDateInputValue } from '@/utils/formatDate';
import { AuditEntryDialog } from './AuditEntryDialog';
import styles from './AuditLog.module.css';

const plural = (n: number) => `${n} ${n === 1 ? 'cambio' : 'cambios'}`;

/** Lista de la auditoría. Montar con `key` según los filtros: cada combinación empieza su propia lista. */
export function AuditLog({ filters }: { filters: AuditFilters }) {
  const members = useTeamMembers();
  const { projects } = useProjects();
  const formatNumber = useTaskNumberFormat();
  const ctx = useMemo<AuditContext>(
    () => ({
      nameOf: makeNameOf(members),
      projectNameOf: (id) => projects.find((p) => p.id === id)?.name ?? null,
      formatNumber,
    }),
    [members, projects, formatNumber],
  );
  const { entries, loading, loadingMore, error, hasMore, loadMore } = useAuditLog(filters);
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  async function exportCsv() {
    setExporting(true);
    setExportResult(null);
    try {
      const { entries: all, truncated } = await fetchAllAudit(filters);
      downloadTextFile(`auditoria-${toDateInputValue(new Date())}.csv`, auditToCsv(all.map((entry) => auditCsvRow(entry, ctx))));
      setExportResult({
        kind: 'info',
        text: truncated
          ? `Se exportaron los ${plural(all.length)} más recientes. Usa las fechas para exportar el resto.`
          : `Se exportaron ${plural(all.length)}.`,
      });
    } catch (err) {
      console.error('Error al exportar la auditoría:', err);
      setExportResult({ kind: 'error', text: 'No pudimos exportar. Intenta de nuevo.' });
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <Spinner label="Cargando auditoría…" />;

  return (
    <section aria-labelledby="audit-title" className={styles.section}>
      <div className={styles.head}>
        <h2 id="audit-title" className={styles.title}>Cambios</h2>
        <Button size="sm" variant="secondary" onClick={() => void exportCsv()} disabled={exporting || entries.length === 0}>
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </Button>
      </div>
      {exportResult && <Alert kind={exportResult.kind}>{exportResult.text}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}
      {!error && entries.length === 0 && <p className={styles.empty}>No hay cambios con estos filtros.</p>}
      {entries.length > 0 && (
        <ul className={styles.list}>
          {entries.map((entry) => {
            const d = describeAuditEntry(entry, ctx);
            return (
              <li key={`${entry.entityType}_${entry.entityId}_${entry.rev}`}>
                <button type="button" className={styles.item} onClick={() => setOpen(entry)}>
                  <span className={styles.sentences}>{d.sentences.join('. ')}</span>
                  <span className={styles.meta}>{d.type} · {d.subject} · {formatDateTime(entry.at)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {entries.length > 0 && <p className={styles.count}>Mostrando {plural(entries.length)}</p>}
      {hasMore && (
        <Button variant="secondary" onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? 'Cargando…' : 'Cargar más'}
        </Button>
      )}
      {open && <AuditEntryDialog entry={open} ctx={ctx} onClose={() => setOpen(null)} />}
    </section>
  );
}
```

```css
/* src/components/settings/AuditLog.module.css */
.section { display: flex; flex-direction: column; gap: var(--space-3); }
.head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.title { font-size: var(--text-2xl); font-weight: var(--weight-semibold); color: var(--color-text-heading); }
.empty, .count { color: var(--color-text-secondary); font-size: var(--text-md); }
.list {
  list-style: none; margin: 0; padding: 0;
  border: 1px solid var(--color-border-default); border-radius: var(--radius-md); background: var(--color-surface-default);
}
.list li + li { border-top: 1px solid var(--color-border-subtle); }
.item {
  width: 100%; display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-3) var(--space-4);
  border: 0; background: none; text-align: left; cursor: pointer; color: var(--color-text-primary);
}
.item:hover { background: var(--color-surface-subtle); }
.sentences { font-size: var(--text-md); }
.meta { font-size: var(--text-sm); color: var(--color-text-secondary); }
```

```tsx
// src/components/settings/AuditEntryDialog.tsx
import { Modal } from '@/components/ui/Modal';
import { fieldLabel, formatAuditValue } from '@/features/audit/auditFields';
import { actorName } from '@/features/audit/describeChange';
import { describeAuditEntry, type AuditContext } from '@/features/audit/describeAuditEntry';
import { diffSnapshots } from '@/features/audit/diffSnapshots';
import type { AuditEntry } from '@/types/audit';
import { formatDateTime } from '@/utils/formatDate';
import styles from './AuditEntryDialog.module.css';

type Props = { entry: AuditEntry; ctx: AuditContext; onClose: () => void };

/** Detalle de un cambio: quién, cuándo, las frases y cada campo antes → después. */
export function AuditEntryDialog({ entry, ctx, onClose }: Props) {
  const { type, subject, sentences } = describeAuditEntry(entry, ctx);
  const changes = diffSnapshots(entry.before, entry.after);
  return (
    <Modal title="Detalle del cambio" onClose={onClose}>
      <dl className={styles.facts}>
        <dt>Quién</dt>
        <dd>{actorName(entry.actorId, ctx.nameOf)}</dd>
        <dt>Cuándo</dt>
        <dd>{formatDateTime(entry.at)}</dd>
        <dt>{type}</dt>
        <dd>{subject}</dd>
      </dl>
      <ul className={styles.sentences}>
        {sentences.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      {changes.length > 0 && (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className="visually-hidden">Valores antes y después del cambio</caption>
            <thead>
              <tr><th scope="col">Campo</th><th scope="col">Antes</th><th scope="col">Después</th></tr>
            </thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.field}>
                  <th scope="row">{fieldLabel(c.field)}</th>
                  <td>{formatAuditValue(c.field, c.from, ctx)}</td>
                  <td>{formatAuditValue(c.field, c.to, ctx)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
```

```css
/* src/components/settings/AuditEntryDialog.module.css */
.facts { display: grid; grid-template-columns: auto 1fr; gap: var(--space-1) var(--space-3); margin: 0 0 var(--space-3); font-size: var(--text-md); }
.facts dt { color: var(--color-text-secondary); }
.facts dd { margin: 0; color: var(--color-text-primary); overflow-wrap: anywhere; }
.sentences { margin: 0 0 var(--space-4); padding-left: var(--space-5); display: flex; flex-direction: column; gap: var(--space-1); }
.scroll { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: var(--text-md); }
.table th, .table td { padding: var(--space-2); border-bottom: 1px solid var(--color-border-subtle); text-align: left; vertical-align: top; overflow-wrap: anywhere; }
.table thead th { color: var(--color-text-secondary); font-weight: var(--weight-semibold); }
.table tbody th { color: var(--color-text-heading); font-weight: var(--weight-semibold); }
```

`src/pages/SettingsPage.tsx` completo:

```tsx
// src/pages/SettingsPage.tsx
import { useState } from 'react';
import { Navigate } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { StickyHeader } from '@/components/layout/StickyHeader';
import { AuditFilters } from '@/components/settings/AuditFilters';
import { AuditLog } from '@/components/settings/AuditLog';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EMPTY_AUDIT_FILTERS, type AuditFilters as Filters } from '@/features/audit/auditFilters';
import { can } from '@/features/auth/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/types/auth';
import styles from './SettingsPage.module.css';

type Tab = 'general' | 'audit';

const SUBTITLE: Record<Tab, string> = {
  general: 'Nombre, logo, colores y numeración del espacio.',
  audit: 'Todos los cambios del espacio, del más reciente al más antiguo.',
};

/** Ajustes del espacio (solo admin; las reglas también lo exigen). */
export function SettingsPage() {
  const { profile } = useAuth();
  const me = profile as UserProfile;
  const [tab, setTab] = useState<Tab>('general');
  const [filters, setFilters] = useState<Filters>(EMPTY_AUDIT_FILTERS);
  if (!can(me, 'team:manage')) return <Navigate to="/tasks" replace />;
  return (
    <>
      <StickyHeader>
        <PageHeader title="Ajustes" subtitle={SUBTITLE[tab]} />
        <div className={styles.bars}>
          <SegmentedControl
            label="Sección" name="settings-tab" value={tab} onChange={setTab}
            options={[{ value: 'general', label: 'General' }, { value: 'audit', label: 'Auditoría' }]}
          />
          {tab === 'audit' && <AuditFilters value={filters} onChange={setFilters} />}
        </div>
      </StickyHeader>
      <main className={styles.page}>
        {tab === 'general' ? <GeneralSettings actorId={me.uid} /> : <AuditLog key={JSON.stringify(filters)} filters={filters} />}
      </main>
    </>
  );
}
```

`src/pages/SettingsPage.module.css` completo:

```css
/* src/pages/SettingsPage.module.css */
.bars { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-3) var(--space-4); }
.page { padding: var(--space-5) var(--space-4) var(--space-12); }

@media (min-width: 640px) {
  .bars { max-width: 880px; margin: 0 auto; padding: var(--space-3) var(--space-8); }
  .page { max-width: 880px; margin: 0 auto; padding: var(--space-8); }
}
```

- [ ] **Step 4: Ver que pasan, build y lint**

Run: `npm test && npm run build && npm run lint`
Expected: todo en verde.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(v2): pestaña de auditoría con filtros, detalle y exportación"
```

---

### Task 5: Índices en dev, preview y documentación

**Files:**
- Temporal (scratchpad, se borra): `publish-indexes.mjs`
- Modify: `README.md`, `AI_LOG.md`, `CLAUDE.md`

- [ ] **Step 1: Crear los índices en `matecode-tasks-dev`**

Script temporal en el scratchpad (se ejecuta con `node --env-file=<repo>/.env`, nunca imprime valores, se niega si el proyecto no es `matecode-tasks-dev`):

```js
// <scratchpad>/publish-indexes.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const REPO = '/Users/anamarquez/Documents/Soy Henry/M4-Ana-Marquez/matecode-tasks';
const require = createRequire(`${REPO}/package.json`);
const { cert } = require('firebase-admin/app');

const project = process.env.FIREBASE_ADMIN_PROJECT_ID;
if (project !== 'matecode-tasks-dev') throw new Error('Solo se publica en matecode-tasks-dev.');

const credential = cert({
  projectId: project,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
});
const { access_token: token } = await credential.getAccessToken();
const { indexes } = JSON.parse(readFileSync(`${REPO}/firestore.indexes.json`, 'utf8'));
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups`;

for (const index of indexes) {
  const res = await fetch(`${base}/${index.collectionGroup}/indexes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ queryScope: index.queryScope, fields: index.fields }),
  });
  const fields = index.fields.map((f) => f.fieldPath).join('+');
  // 409 = ya existe: está bien.
  console.log(fields, res.status, res.ok || res.status === 409 ? 'ok' : (await res.json()).error?.status);
}
```

Run: `node --env-file=.env <scratchpad>/publish-indexes.mjs && rm <scratchpad>/publish-indexes.mjs`
Expected: tres líneas `ok`. Los índices tardan unos minutos en construirse.

**Si devuelve 403** (la cuenta de servicio no tiene permiso para índices): la usuaria abre la pestaña Auditoría con un filtro de tipo en la preview; la consola del navegador muestra el error de Firestore con un enlace "create it here" que crea el índice en un clic (repetir con filtro de persona y con ambos).

- [ ] **Step 2: Preview**

```bash
vercel --yes
vercel alias set <url-de-la-preview> matecode-tasks-dev.vercel.app
curl -s -o /dev/null -w '%{http_code}' https://matecode-tasks-sandy.vercel.app   # producción: 200
```

La usuaria prueba: lista en frases, cada filtro (tipo, persona, fechas y combinados), "Cargar más", detalle antes → después, "Exportar CSV" (abrirlo en Excel/Numbers/Sheets: acentos bien, columnas separadas).

- [ ] **Step 3: Documentación**

- `README.md`: sección de Ajustes (identidad, colores con control de contraste, prefijo, pie Imago Design, encabezados fijos) y Auditoría (frases, filtros, de a 50, detalle, CSV con protección de fórmulas); mención de `firestore.indexes.json`.
- `AI_LOG.md`: entrada de la etapa 8 (decisiones, problemas: dos contrastes medidos y corregidos, índices compuestos, CSV y fórmulas). "Qué aprendí" lo escribe la usuaria (ofrecerle preguntas).
- `CLAUDE.md`: etapa 8 a ✅; agregar en Comandos/Arquitectura que la auditoría completa usa índices (`firestore.indexes.json`, se crean con la API de Firestore igual que las reglas) y que al integrar a `main` hay que crear los índices y `settings/workspace` también en producción.

- [ ] **Step 4: Commit**

```bash
git add README.md AI_LOG.md CLAUDE.md
git commit -m "docs(v2): etapa 8 en README, AI_LOG y contexto"
```
