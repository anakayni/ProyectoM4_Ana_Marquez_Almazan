# v2 Etapa 8A — Ajustes del espacio: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El admin personaliza nombre, logo, colores (con control de contraste) y prefijo; la app se recolorea en vivo; pie "Desarrollado por Imago Design"; encabezados y filtros fijos; dos contrastes existentes corregidos.

**Architecture:** `settings/workspace` (lectura pública, escritura admin auditada). `WorkspaceSettingsProvider` se suscribe, escribe `--brand-1…5` en `:root` y expone nombre, logo y prefijo por contexto. `paletteChecks` (puro) replica las mezclas de `tokens.css` para medir contraste; lo usan el test de tokens y la pantalla de Ajustes.

**Tech Stack:** React 19, Firebase 12, Canvas, Vitest + RTL, emulador.

**Spec:** `docs/specs/2026-10-13-v2-etapa8-ajustes-design.md` (parte 8A)

## Global Constraints

- Paleta original: `#1B4079`, `#4D7C8A`, `#7F9C96`, `#8FAD88`, `#CBDF90`. Por defecto: nombre "MateCode Tasks", sin logo, prefijo "MC".
- Contraste de texto ≥ 4.5:1 en todas las combinaciones de `paletteChecks`; guardar se bloquea si alguna falla.
- `settings/workspace`: `name` 1–60; `logo` `null` o PNG data URL ≤ 100 000 caracteres; `palette` 5 × `#RRGGBB`; `taskPrefix` `^[A-Z0-9]{1,5}$`.
- Lectura de ajustes sin sesión; escritura solo admin, auditada (`entityType: 'settings'`, id `workspace`).
- Ajustes solo para admin: no aparece en el menú de los demás.
- Pie fijo "Desarrollado por Imago Design" (no configurable).
- Reglas solo a `matecode-tasks-dev`. Producción no se toca.
- Cada tarea: `npm test`, `npm run build`, `npm run lint` (y `npm run test:rules` si toca reglas) en verde.
- Commits Conventional en español con trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Control de contraste de la paleta (y dos correcciones)

**Files:** Create `src/features/settings/paletteChecks.ts`, `src/features/settings/defaults.ts`; Modify `src/utils/color.ts`, `src/styles/tokens.css`; Test `tests/unit/paletteChecks.test.ts`, `tests/unit/color.test.ts`, `tests/unit/tokens.test.ts`

**Produces:**
```ts
export function mixColors(a: string, b: string, weight: number): string;  // como color-mix(in srgb, a weight%, b)
export const DEFAULT_PALETTE: readonly string[];
export type WorkspaceSettings = { name: string; logo: string | null; palette: string[]; taskPrefix: string };
export const DEFAULT_SETTINGS: WorkspaceSettings;
export function isValidPrefix(value: string): boolean;
export type PaletteCheck = { label: string; ratio: number; ok: boolean };
export function paletteChecks(palette: readonly string[]): PaletteCheck[];
```

- [ ] **Step 1: Tests que fallan**

```ts
// tests/unit/paletteChecks.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_PALETTE, isValidPrefix } from '@/features/settings/defaults';
import { paletteChecks } from '@/features/settings/paletteChecks';

describe('paletteChecks', () => {
  it('la paleta original pasa todas las combinaciones', () => {
    const failing = paletteChecks(DEFAULT_PALETTE).filter((c) => !c.ok);
    expect(failing).toEqual([]);
  });
  it('un menú claro con texto blanco falla y dice por qué', () => {
    const bad = ['#F5E663', ...DEFAULT_PALETTE.slice(1)];
    const failing = paletteChecks(bad).filter((c) => !c.ok);
    expect(failing.map((c) => c.label)).toContain('Texto blanco sobre el color 1 (menú y botones)');
    expect(failing[0].ratio).toBeLessThan(4.5);
  });
});

describe('isValidPrefix', () => {
  it.each([['MC', true], ['FL2', true], ['ABCDE', true], ['', false], ['ABCDEF', false], ['mc', false], ['M-C', false]])(
    '%s → %s', (value, ok) => expect(isValidPrefix(value)).toBe(ok),
  );
});
```

En `tests/unit/color.test.ts` agregar:

```ts
describe('mixColors', () => {
  it('mezcla como color-mix en srgb', () => {
    expect(mixColors('#FFFFFF', '#000000', 50)).toBe('#808080');
    expect(mixColors('#1B4079', '#FFFFFF', 100)).toBe('#1B4079');
  });
});
```

(import `mixColors`.) En `tests/unit/tokens.test.ts` agregar:

```ts
  it('info y la inicial del avatar usan versiones oscurecidas', () => {
    expect(tokens).toMatch(/--color-status-info:\s*color-mix\(in srgb, var\(--brand-2\) 85%, black\);/);
    expect(tokens).toMatch(/--color-avatar-text:\s*color-mix\(in srgb, var\(--brand-1\) 70%, black\);/);
  });
```

- [ ] **Step 2: Correr y ver que fallan** → FAIL.

- [ ] **Step 3: Implementar**

En `src/utils/color.ts`:

```ts
const toRgb = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16));

/** Igual que `color-mix(in srgb, a weight%, b)` de CSS (mezcla canal por canal). */
export function mixColors(a: string, b: string, weight: number): string {
  const [ra, rb] = [toRgb(a), toRgb(b)];
  const p = weight / 100;
  return `#${ra.map((c, i) => Math.round(c * p + rb[i] * (1 - p)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
```

```ts
// src/features/settings/defaults.ts
export const DEFAULT_PALETTE: readonly string[] = ['#1B4079', '#4D7C8A', '#7F9C96', '#8FAD88', '#CBDF90'];

export type WorkspaceSettings = { name: string; logo: string | null; palette: string[]; taskPrefix: string };

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  name: 'MateCode Tasks', logo: null, palette: [...DEFAULT_PALETTE], taskPrefix: 'MC',
};

export function isValidPrefix(value: string): boolean {
  return /^[A-Z0-9]{1,5}$/.test(value);
}
```

```ts
// src/features/settings/paletteChecks.ts
import { contrastRatio, mixColors } from '@/utils/color';

export type PaletteCheck = { label: string; ratio: number; ok: boolean };

const WHITE = '#FFFFFF';
const BLACK = '#000000';

/**
 * Combinaciones de texto que dependen de la paleta. Las mezclas son las mismas que usa tokens.css:
 * si se cambia una fórmula allá, hay que cambiarla acá (el test de tokens lo vigila).
 */
export function paletteChecks(palette: readonly string[]): PaletteCheck[] {
  const [c1, c2, , c4, c5] = palette;
  const subtle = mixColors(c5, WHITE, 14);
  const pairs: [string, string, string][] = [
    ['Texto blanco sobre el color 1 (menú y botones)', WHITE, c1],
    ['Color 1 sobre el color 5 (sección activa del menú)', c1, c5],
    ['Texto atenuado del menú sobre el color 1', mixColors(WHITE, c1, 62), c1],
    ['Links (color 2) sobre blanco', mixColors(c2, BLACK, 85), WHITE],
    ['Links (color 2) sobre el fondo', mixColors(c2, BLACK, 85), subtle],
    ['Títulos (color 1) sobre el fondo', c1, subtle],
    ['Estado "En curso" (color 2) sobre su fondo', mixColors(c2, BLACK, 85), mixColors(c2, WHITE, 12)],
    ['Estado "Hecha" (color 4) sobre su fondo', mixColors(c4, BLACK, 55), mixColors(c4, WHITE, 18)],
    ['Inicial del avatar sobre el color 4', mixColors(c1, BLACK, 70), c4],
  ];
  return pairs.map(([label, text, bg]) => {
    const ratio = contrastRatio(text, bg);
    return { label, ratio, ok: ratio >= 4.5 };
  });
}
```

En `tokens.css`: `--color-status-info: color-mix(in srgb, var(--brand-2) 85%, black);` y `--color-avatar-text: color-mix(in srgb, var(--brand-1) 70%, black);`.

- [ ] **Step 4: Verificar y commit**

```bash
git add src/utils/color.ts src/features/settings src/styles/tokens.css tests/unit
git commit -m "fix(v2): control de contraste de la paleta y dos textos con poco contraste"
```

---

### Task 2: Ajustes en Firestore (tipos, reglas y escritura)

**Files:** Create `src/services/audited/settings.ts`, `src/services/settings.service.ts`; Modify `firestore.rules`, `src/types/audit.ts`; Test `tests/rules/settings.rules.test.ts`

**Produces:**
```ts
export function saveSettings(db: Firestore, actorId: string, values: WorkspaceSettings): Promise<void>; // audited/settings
export function subscribeToSettings(onData: (s: WorkspaceSettings) => void, onError: (e: Error) => void): () => void; // service
export const saveWorkspaceSettings: (actorId: string, values: WorkspaceSettings) => Promise<void>;                  // service
```

- [ ] **Step 1: Test de reglas que falla**

```ts
// tests/rules/settings.rules.test.ts
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/features/settings/defaults';
import { saveSettings } from '@/services/audited/settings';
import { anonDb, createEnv, dbAs, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);

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
});

describe('ajustes del espacio', () => {
  it('cualquiera los lee, incluso sin sesión (para el login)', async () => {
    await saveSettings(as('admin'), 'admin', DEFAULT_SETTINGS);
    await assertSucceeds(getDoc(doc(anonDb(env), 'settings', 'workspace')));
  });

  it('solo el admin los cambia, y con auditoría', async () => {
    await assertSucceeds(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, name: 'Ferretería López' }));
    await assertSucceeds(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, taskPrefix: 'FL' }));
    await assertFails(saveSettings(as('ana'), 'ana', { ...DEFAULT_SETTINGS, name: 'Hackeado' }));
    await assertFails(setDoc(doc(as('admin'), 'settings', 'workspace'), { ...DEFAULT_SETTINGS, rev: 9 }));
  });

  it('valida nombre, logo, paleta y prefijo', async () => {
    await assertFails(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, name: '' }));
    await assertFails(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, logo: 'data:image/jpeg;base64,AAAA' }));
    await assertFails(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, palette: ['#000000'] }));
    await assertFails(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, taskPrefix: 'mc' }));
    await assertSucceeds(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, logo: `data:image/png;base64,${'A'.repeat(500)}` }));
  });
});
```

- [ ] **Step 2: Correr y ver que falla** → `npm run test:rules` FAIL.

- [ ] **Step 3: Implementar**

`src/types/audit.ts`: `EntityType` suma `'settings'`.

`firestore.rules`:
- `entityPath`: agregar `: type == 'settings' ? /databases/$(database)/documents/settings/$(id)` antes del caso de `users`.
- `validAudit`: lista suma `'settings'`.
- Bloque nuevo:

```
    // ─── Ajustes del espacio (lectura pública: el login muestra nombre, logo y colores) ───
    function validSettings(d) {
      return d.keys().hasOnly(['name', 'logo', 'palette', 'taskPrefix', 'updatedAt', 'updatedBy', 'rev'])
        && d.name is string && d.name.size() > 0 && d.name.size() <= 60
        && (d.logo == null || (d.logo is string && d.logo.size() <= 100000 && d.logo.matches('^data:image/png;base64,[A-Za-z0-9+/=]+$')))
        && d.palette is list && d.palette.size() == 5
        && d.palette[0].matches('^#[0-9A-Fa-f]{6}$') && d.palette[1].matches('^#[0-9A-Fa-f]{6}$')
        && d.palette[2].matches('^#[0-9A-Fa-f]{6}$') && d.palette[3].matches('^#[0-9A-Fa-f]{6}$')
        && d.palette[4].matches('^#[0-9A-Fa-f]{6}$')
        && d.taskPrefix is string && d.taskPrefix.matches('^[A-Z0-9]{1,5}$')
        && d.rev is int
        && d.updatedBy == request.auth.uid
        && d.updatedAt == request.time;
    }

    match /settings/workspace {
      allow read: if true;
      allow create: if isAdmin() && validSettings(request.resource.data) && request.resource.data.rev == 1
        && audited('settings', 'workspace', 1);
      allow update: if isAdmin() && validSettings(request.resource.data) && nextRev()
        && audited('settings', 'workspace', request.resource.data.rev);
    }
```

```ts
// src/services/audited/settings.ts
import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { WorkspaceSettings } from '@/features/settings/defaults';
import { auditEntry, auditRef } from './audit';

/** Guarda los ajustes (solo admin): crea el documento la primera vez y deja la auditoría. */
export async function saveSettings(db: Firestore, actorId: string, values: WorkspaceSettings): Promise<void> {
  const ref = doc(db, 'settings', 'workspace');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const before = snap.exists() ? snap.data() : null;
    const rev = before ? before.rev + 1 : 1;
    const after = {
      name: values.name.trim(), logo: values.logo, palette: values.palette.map((c) => c.toUpperCase()),
      taskPrefix: values.taskPrefix, updatedAt: serverTimestamp(), updatedBy: actorId, rev,
    };
    tx.set(ref, after);
    tx.set(
      auditRef(db, 'settings', 'workspace', rev),
      auditEntry({ type: 'settings', id: 'workspace', rev, action: before ? 'update' : 'create', actorId, before, after }),
    );
  });
}
```

```ts
// src/services/settings.service.ts
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_SETTINGS, type WorkspaceSettings } from '@/features/settings/defaults';
import * as audited from '@/services/audited/settings';
import { db } from './firebase';

/** Ajustes en tiempo real; sin documento, los valores por defecto. */
export function subscribeToSettings(onData: (s: WorkspaceSettings) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    doc(db, 'settings', 'workspace'),
    (snap) => {
      const d = snap.data();
      onData(d ? { name: d.name, logo: d.logo ?? null, palette: d.palette, taskPrefix: d.taskPrefix } : DEFAULT_SETTINGS);
    },
    onError,
  );
}

export const saveWorkspaceSettings = (actorId: string, values: WorkspaceSettings) => audited.saveSettings(db, actorId, values);
```

- [ ] **Step 4: Verificar, publicar reglas en dev y commit**

```bash
git add firestore.rules src/types/audit.ts src/services tests/rules/settings.rules.test.ts
git commit -m "feat(v2): ajustes del espacio con reglas y auditoría"
```

---

### Task 3: Tema en vivo, logo, nombre y prefijo en toda la app

**Files:** Create `src/hooks/useWorkspaceSettings.tsx`; Modify `src/App.tsx`, `src/components/layout/BrandMark.tsx` (+ css), `src/features/tasks/taskNumber.ts`, `src/features/tasks/searchTasks.ts`, los 8 componentes que usan `formatTaskNumber`, `src/components/tasks/TaskWorkspace.tsx`; Test `tests/components/WorkspaceSettings.test.tsx`, `tests/unit/taskNumber.test.ts`, `tests/unit/searchTasks.test.ts`

**Produces:**
```ts
export function WorkspaceSettingsProvider({ children }: { children: ReactNode }): JSX.Element;
export function useWorkspaceSettings(): WorkspaceSettings;     // fuera del proveedor: DEFAULT_SETTINGS
export function useTaskNumberFormat(): (n: number) => string;
export function applyPalette(palette: readonly string[], root?: HTMLElement): void;
export function formatTaskNumber(n: number, prefix?: string): string;  // prefijo por defecto 'MC'
export function searchTasks(tasks: readonly Task[], query: string, prefix?: string): Task[];
```

- [ ] **Step 1: Tests que fallan**

```tsx
// tests/components/WorkspaceSettings.test.tsx
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceSettings } from '@/features/settings/defaults';

const svc = vi.hoisted(() => ({ emit: (() => {}) as (s: WorkspaceSettings) => void }));
vi.mock('@/services/settings.service', () => ({
  subscribeToSettings: (onData: (s: WorkspaceSettings) => void) => {
    svc.emit = onData;
    return () => {};
  },
}));

import { BrandMark } from '@/components/layout/BrandMark';
import { applyPalette, useTaskNumberFormat, WorkspaceSettingsProvider } from '@/hooks/useWorkspaceSettings';

function Number12() {
  return <span>{useTaskNumberFormat()(12)}</span>;
}

describe('ajustes del espacio en la app', () => {
  it('applyPalette escribe las 5 variables', () => {
    const root = document.createElement('div');
    applyPalette(['#111111', '#222222', '#333333', '#444444', '#555555'], root);
    expect(root.style.getPropertyValue('--brand-1')).toBe('#111111');
    expect(root.style.getPropertyValue('--brand-5')).toBe('#555555');
  });

  it('sin ajustes guardados usa nombre, logo y prefijo por defecto', () => {
    render(<WorkspaceSettingsProvider><BrandMark /><Number12 /></WorkspaceSettingsProvider>);
    expect(screen.getByText('MateCode Tasks')).toBeInTheDocument();
    expect(screen.getByText('MC-12')).toBeInTheDocument();
  });

  it('con ajustes muestra logo, nombre y prefijo, y aplica la paleta', () => {
    render(<WorkspaceSettingsProvider><BrandMark /><Number12 /></WorkspaceSettingsProvider>);
    act(() => svc.emit({ name: 'Ferretería López', logo: 'data:image/png;base64,AA', palette: ['#111111', '#222222', '#333333', '#444444', '#555555'], taskPrefix: 'FL' }));
    expect(screen.getByRole('img', { name: 'Ferretería López' })).toHaveAttribute('src', 'data:image/png;base64,AA');
    expect(screen.getByText('FL-12')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--brand-1')).toBe('#111111');
  });
});
```

En `tests/unit/taskNumber.test.ts` agregar `it('acepta otro prefijo', () => expect(formatTaskNumber(5, 'FL')).toBe('FL-5'));` y en `searchTasks.test.ts`: `it('entiende el prefijo vigente', () => expect(ids(searchTasks(tasks, 'fl-109', 'FL'))).toEqual([109]));`.

- [ ] **Step 2: Correr y ver que fallan** → FAIL.

- [ ] **Step 3: Implementar**

`taskNumber.ts`: `export function formatTaskNumber(n: number, prefix = TASK_PREFIX): string { return \`${prefix}-${n}\`; }` (actualizar el comentario de `TASK_PREFIX`: "por defecto; el admin lo cambia en Ajustes").
`searchTasks.ts`: firma `searchTasks(tasks, query, prefix = TASK_PREFIX)` y usar `formatTaskNumber(t.number, prefix)`.

```tsx
// src/hooks/useWorkspaceSettings.tsx
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type WorkspaceSettings } from '@/features/settings/defaults';
import { formatTaskNumber } from '@/features/tasks/taskNumber';
import { subscribeToSettings } from '@/services/settings.service';

const SettingsContext = createContext<WorkspaceSettings>(DEFAULT_SETTINGS);

/** Escribe la paleta en las variables --brand-1…5: todo el CSS depende de ellas. */
// eslint-disable-next-line react/only-export-components
export function applyPalette(palette: readonly string[], root: HTMLElement = document.documentElement): void {
  palette.forEach((color, i) => root.style.setProperty(`--brand-${i + 1}`, color));
}

/** Ajustes del espacio en tiempo real (también sin sesión, para el login). */
export function WorkspaceSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS);

  useEffect(
    () =>
      subscribeToSettings(
        (next) => {
          setSettings(next);
          applyPalette(next.palette);
        },
        (err) => console.error('Error al leer los ajustes:', err),
      ),
    [],
  );

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useWorkspaceSettings(): WorkspaceSettings {
  return useContext(SettingsContext);
}

/** "MC-12" con el prefijo vigente. */
// eslint-disable-next-line react/only-export-components
export function useTaskNumberFormat(): (n: number) => string {
  const { taskPrefix } = useWorkspaceSettings();
  return useCallback((n: number) => formatTaskNumber(n, taskPrefix), [taskPrefix]);
}
```

`App.tsx`: envolver con `<WorkspaceSettingsProvider>` por fuera de `<AuthProvider>`.

`BrandMark.tsx`:

```tsx
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import styles from './BrandMark.module.css';

/** Logo y nombre del espacio (configurables en Ajustes). */
export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  const { name, logo } = useWorkspaceSettings();
  return (
    <span className={`${styles.brand} ${inverse ? styles.inverse : ''}`}>
      {logo ? <img className={styles.image} src={logo} alt={name} /> : <span className={styles.logo} aria-hidden="true" />}
      {(!logo || name) && <span aria-hidden={logo ? 'true' : undefined}>{name}</span>}
    </span>
  );
}
```

> Con logo, la imagen lleva el nombre como `alt` y el texto visible se marca `aria-hidden` para no leerlo dos veces. CSS: `.image { max-height: 32px; max-width: 120px; object-fit: contain; }`; quitar `.product`.

Componentes con número (`TodoItem`, `TaskDetailPanel`, `TaskTable`, `TaskBoard`, `AgendaView`, `CalendarItem` (TaskChip), `GanttView`): `const formatNumber = useTaskNumberFormat();` y reemplazar `formatTaskNumber(x)` por `formatNumber(x)`.
`TaskWorkspace.tsx`: `const { taskPrefix } = useWorkspaceSettings();` y `searchTasks(scoped, query, taskPrefix)`; placeholder del buscador: `` `Buscar por título, descripción o ${taskPrefix}-…` ``.

> Los tests existentes renderizan sin proveedor: el contexto por defecto devuelve "MC", así que siguen pasando. Ajustar los tests que buscaban el texto "MateCode" dividido (`MateCode <span>Tasks</span>`) si alguno falla: ahora es "MateCode Tasks" en un solo texto.

- [ ] **Step 4: Verificar y commit**

```bash
git add src tests
git commit -m "feat(v2): colores, logo, nombre y prefijo del espacio en toda la app"
```

---

### Task 4: Pie "Desarrollado por Imago Design"

**Files:** Create `src/components/layout/CreditsFooter.tsx` (+ css); Modify `AuthLayout.tsx`, `Sidebar.tsx`, `AppShell.tsx` (+ css); Test `tests/components/CreditsFooter.test.tsx`

**Produces:** `CreditsFooter({ variant?: 'light' | 'dark' })`.

- [ ] **Step 1: Test que falla**

```tsx
// tests/components/CreditsFooter.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthLayout } from '@/components/auth/AuthLayout';

describe('CreditsFooter', () => {
  it('el login muestra quién desarrolló el software', () => {
    render(<AuthLayout title="Iniciar sesión" subtitle="x"><p>Formulario</p></AuthLayout>);
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Desarrollado por Imago Design');
  });
});
```

- [ ] **Step 2–3: Implementar**

```tsx
// src/components/layout/CreditsFooter.tsx
import styles from './CreditsFooter.module.css';

/** Firma de la desarrolladora: fija, no se cambia desde Ajustes. (El logo de Imago Design se agrega cuando esté.) */
export function CreditsFooter({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  return (
    <footer className={`${styles.footer} ${variant === 'dark' ? styles.dark : ''}`}>
      Desarrollado por <strong>Imago Design</strong>
    </footer>
  );
}
```

```css
/* src/components/layout/CreditsFooter.module.css */
.footer { padding: var(--space-3) var(--space-4); font-size: var(--text-sm); text-align: center; color: var(--color-text-secondary); }
.dark { color: var(--color-nav-text-muted); padding: var(--space-2); }
```

- `AuthLayout`: `<CreditsFooter />` al final de `<main>` (después de la tarjeta).
- `Sidebar`: `<CreditsFooter variant="dark" />` debajo del bloque de usuario.
- `AppShell`: dentro de `.content`, después de `<Outlet />`, `<div className={styles.mobileCredits}><CreditsFooter /></div>` con CSS `.mobileCredits { display: block; } @media (min-width: 768px) { .mobileCredits { display: none; } }` (en escritorio ya está en el menú).

> Un `footer` dentro de `main`/`aside` no es el landmark `contentinfo`. En `AuthLayout` poner el `CreditsFooter` **fuera** de `<main>`, como hermano, para que lo sea (el test lo verifica).

- [ ] **Step 4: Verificar y commit**

```bash
git add src/components tests/components/CreditsFooter.test.tsx
git commit -m "feat(v2): pie con la firma de Imago Design"
```

---

### Task 5: Pantalla Ajustes (General)

**Files:** Create `src/features/settings/logoImage.ts`, `src/components/settings/PalettePreview.tsx` (+ css), `src/components/settings/GeneralSettings.tsx` (+ css), `src/pages/SettingsPage.tsx` (+ css); Modify `navItems.ts`, `AppRouter.tsx`; Test `tests/unit/logoImage.test.ts`, `tests/components/GeneralSettings.test.tsx`, `tests/unit/navItems.test.ts`, `tests/components/AppShell.test.tsx`, `tests/components/routes.test.tsx`

**Produces:**
```ts
export function fitWithin(width: number, height: number, maxW: number, maxH: number): { width: number; height: number };
export function imageToLogo(file: File): Promise<string>;   // PNG data URL
export function GeneralSettings(p: { actorId: string }): JSX.Element;
export function SettingsPage(): JSX.Element;               // /settings, solo admin
```

- [ ] **Step 1: Tests que fallan**

```ts
// tests/unit/logoImage.test.ts
import { describe, expect, it } from 'vitest';
import { fitWithin, imageToLogo } from '@/features/settings/logoImage';
import { AvatarImageError } from '@/features/team/avatarImage';

describe('fitWithin', () => {
  it('reduce sin deformar', () => {
    expect(fitWithin(1200, 400, 240, 64)).toEqual({ width: 192, height: 64 });
    expect(fitWithin(1000, 100, 240, 64)).toEqual({ width: 240, height: 24 });
  });
  it('no agranda imágenes chicas', () => {
    expect(fitWithin(100, 30, 240, 64)).toEqual({ width: 100, height: 30 });
  });
});

describe('imageToLogo', () => {
  it('rechaza lo que no es imagen', async () => {
    await expect(imageToLogo(new File(['x'], 'a.txt', { type: 'text/plain' }))).rejects.toBeInstanceOf(AvatarImageError);
  });
});
```

```tsx
// tests/components/GeneralSettings.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const svc = vi.hoisted(() => ({ saveWorkspaceSettings: vi.fn() }));
vi.mock('@/services/settings.service', () => ({ saveWorkspaceSettings: svc.saveWorkspaceSettings, subscribeToSettings: () => () => {} }));

import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { DEFAULT_SETTINGS } from '@/features/settings/defaults';

describe('GeneralSettings', () => {
  beforeEach(() => {
    svc.saveWorkspaceSettings.mockReset();
    svc.saveWorkspaceSettings.mockResolvedValue(undefined);
  });

  it('guarda nombre y prefijo', async () => {
    render(<GeneralSettings actorId="admin" />);
    await userEvent.clear(screen.getByLabelText('Nombre del espacio'));
    await userEvent.type(screen.getByLabelText('Nombre del espacio'), 'Ferretería López');
    await userEvent.clear(screen.getByLabelText('Prefijo de las tareas'));
    await userEvent.type(screen.getByLabelText('Prefijo de las tareas'), 'fl');
    expect(screen.getByText('Ejemplo: FL-12')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(svc.saveWorkspaceSettings).toHaveBeenCalledWith('admin', { ...DEFAULT_SETTINGS, name: 'Ferretería López', taskPrefix: 'FL' });
  });

  it('bloquea guardar si un color no tiene contraste, y restaura la paleta', async () => {
    render(<GeneralSettings actorId="admin" />);
    fireEvent.change(screen.getByLabelText('Color 1'), { target: { value: '#f5e663' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Texto blanco sobre el color 1');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar paleta original' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

Ajustes: `navItems.test.ts` → Ajustes `'/settings'` para admin y **no incluido** para miembro y lector (`navItems(profile('member')).map(i => i.key)` no contiene `'settings'`); quitar el caso "Próximamente". `AppShell.test.tsx`: con admin no hay "Próximamente" (`queryAllByText` longitud 0); el test de "pestaña pendiente" se elimina (ya no hay secciones pendientes) y el de miembro verifica que no aparece "Ajustes". `routes.test.tsx`: mock de `SettingsPage`; un miembro en `/settings` va a `/tasks`.

- [ ] **Step 2: Correr y ver que fallan** → FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/features/settings/logoImage.ts
import { AvatarImageError } from '@/features/team/avatarImage';

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const LOGO_MAX_WIDTH = 240;
export const LOGO_MAX_HEIGHT = 64;

/** Tamaño que entra en el máximo sin deformar ni agrandar. */
export function fitWithin(width: number, height: number, maxW: number, maxH: number): { width: number; height: number } {
  const scale = Math.min(1, maxW / width, maxH / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Logo como PNG (conserva la transparencia), achicado en el navegador para guardarlo en Firestore. */
export async function imageToLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    throw new AvatarImageError('Elige una imagen PNG, JPG o WebP.');
  }
  if (file.size > MAX_INPUT_BYTES) throw new AvatarImageError('La imagen pesa más de 5 MB. Elige una más liviana.');
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new AvatarImageError('Tu navegador no pudo procesar la imagen.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL('image/png');
}
```

```tsx
// src/components/settings/PalettePreview.tsx
import styles from './PalettePreview.module.css';

/** Vista previa en vivo: usa las variables --brand-* del contenedor (no toca el resto de la app hasta guardar). */
export function PalettePreview({ palette, name }: { palette: string[]; name: string }) {
  const vars = Object.fromEntries(palette.map((c, i) => [`--brand-${i + 1}`, c])) as React.CSSProperties;
  return (
    <div className={styles.preview} style={vars} aria-label="Vista previa de los colores" role="group">
      <div className={styles.nav}>
        <span className={styles.brand}>{name}</span>
        <span className={styles.active}>Mis tareas</span>
        <span className={styles.item}>Proyectos</span>
      </div>
      <div className={styles.body}>
        <span className={styles.title}>Título de página</span>
        <span className={styles.button}>Botón principal</span>
        <span className={styles.link}>Un enlace</span>
        <span className={styles.info}>En curso</span>
        <span className={styles.success}>Hecha</span>
      </div>
    </div>
  );
}
```

```css
/* src/components/settings/PalettePreview.module.css */
.preview { display: grid; grid-template-columns: 140px 1fr; border: 1px solid var(--color-border-default); border-radius: var(--radius-md); overflow: hidden; font-size: var(--text-md); }
.nav { display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-2); background: var(--color-nav-bg); color: var(--color-nav-text); }
.brand { font-weight: var(--weight-semibold); margin-bottom: var(--space-2); }
.active { padding: 2px var(--space-2); border-radius: var(--radius-sm); background: var(--color-nav-active-bg); color: var(--color-nav-active-text); font-weight: var(--weight-semibold); }
.item { padding: 2px var(--space-2); color: var(--color-nav-text-muted); }
.body { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding: var(--space-3); background: var(--color-surface-subtle); }
.title { width: 100%; font-weight: var(--weight-semibold); color: var(--color-text-heading); }
.button { padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); background: var(--color-action-primary); color: var(--color-text-inverse); }
.link { color: var(--color-text-link); text-decoration: underline; }
.info { padding: 1px var(--space-2); border-radius: var(--radius-pill); background: var(--color-status-info-surface); color: var(--color-status-info); }
.success { padding: 1px var(--space-2); border-radius: var(--radius-pill); background: var(--color-status-success-surface); color: var(--color-status-success); }
```

> Funciona porque los tokens semánticos (`--color-nav-bg`, etc.) se calculan a partir de `--brand-*` en cada elemento: redefinir `--brand-*` en el contenedor recolorea solo la vista previa. Si algún token no se recalcula (por estar definido solo en `:root`), redefinir también esos tokens en `.preview` copiando las fórmulas de `tokens.css`.

```tsx
// src/components/settings/GeneralSettings.tsx
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { DEFAULT_PALETTE, isValidPrefix, type WorkspaceSettings } from '@/features/settings/defaults';
import { imageToLogo } from '@/features/settings/logoImage';
import { paletteChecks } from '@/features/settings/paletteChecks';
import { formatTaskNumber } from '@/features/tasks/taskNumber';
import { AvatarImageError } from '@/features/team/avatarImage';
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import { saveWorkspaceSettings } from '@/services/settings.service';
import { PalettePreview } from './PalettePreview';
import styles from './GeneralSettings.module.css';

/** Identidad, colores y numeración del espacio (solo admin). */
export function GeneralSettings({ actorId }: { actorId: string }) {
  const current = useWorkspaceSettings();
  const [draft, setDraft] = useState<WorkspaceSettings>(current);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (change: Partial<WorkspaceSettings>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, ...change }));
  };
  const problems = paletteChecks(draft.palette).filter((c) => !c.ok);
  const prefixOk = isValidPrefix(draft.taskPrefix);
  const nameOk = draft.name.trim().length > 0;

  async function pickLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      set({ logo: await imageToLogo(file) });
      setError(null);
    } catch (err) {
      if (!(err instanceof AvatarImageError)) console.error('Error al procesar el logo:', err);
      setError(err instanceof AvatarImageError ? err.message : 'No pudimos leer la imagen. Prueba con otra.');
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (problems.length || !prefixOk || !nameOk) return;
    setSaving(true);
    setError(null);
    try {
      await saveWorkspaceSettings(actorId, { ...draft, name: draft.name.trim() });
      setSaved(true);
    } catch (err) {
      console.error('Error al guardar los ajustes:', err);
      setError('No pudimos guardar los ajustes. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={save} noValidate>
      {error && <Alert kind="error">{error}</Alert>}
      {saved && <Alert kind="success">Ajustes guardados. Toda la app ya los usa.</Alert>}

      <section aria-labelledby="identity-title" className={styles.section}>
        <h2 id="identity-title" className={styles.title}>Identidad</h2>
        <Field id="settings-name" label="Nombre del espacio" error={nameOk ? undefined : 'Ingresa un nombre.'}>
          <input id="settings-name" className={fieldInputClass} maxLength={60} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <div className={styles.logoRow}>
          <div className={styles.logoBox}>
            {draft.logo ? <img src={draft.logo} alt="Logo actual" className={styles.logo} /> : <span className={styles.noLogo}>Sin logo</span>}
          </div>
          <label className={styles.upload}>
            Subir logo
            <input type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden" onChange={(e) => void pickLogo(e)} />
          </label>
          {draft.logo && <Button size="sm" variant="ghost" onClick={() => set({ logo: null })}>Quitar logo</Button>}
        </div>
      </section>

      <section aria-labelledby="colors-title" className={styles.section}>
        <h2 id="colors-title" className={styles.title}>Colores</h2>
        <div className={styles.swatches}>
          {draft.palette.map((color, i) => (
            <label key={i} className={styles.swatch}>
              <input
                type="color" aria-label={`Color ${i + 1}`} value={color}
                onChange={(e) => set({ palette: draft.palette.map((c, j) => (j === i ? e.target.value.toUpperCase() : c)) })}
              />
              <span>Color {i + 1}</span>
            </label>
          ))}
          <Button size="sm" variant="secondary" onClick={() => set({ palette: [...DEFAULT_PALETTE] })}>Restaurar paleta original</Button>
        </div>
        <PalettePreview palette={draft.palette} name={draft.name} />
        {problems.length > 0 && (
          <Alert kind="error">
            Estos textos no se leerían bien (mínimo 4.5:1):{' '}
            {problems.map((p) => `${p.label} (${p.ratio.toFixed(1)}:1)`).join('; ')}.
          </Alert>
        )}
      </section>

      <section aria-labelledby="numbers-title" className={styles.section}>
        <h2 id="numbers-title" className={styles.title}>Numeración</h2>
        <Field id="settings-prefix" label="Prefijo de las tareas" error={prefixOk ? undefined : 'De 1 a 5 letras o números.'}>
          <input
            id="settings-prefix" className={fieldInputClass} maxLength={5} value={draft.taskPrefix}
            onChange={(e) => set({ taskPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
          />
        </Field>
        {prefixOk && <p className={styles.hint}>Ejemplo: {formatTaskNumber(12, draft.taskPrefix)}</p>}
      </section>

      <div className={styles.actions}>
        <Button type="submit" loading={saving} disabled={problems.length > 0 || !prefixOk || !nameOk}>Guardar cambios</Button>
      </div>
    </form>
  );
}
```

```css
/* src/components/settings/GeneralSettings.module.css */
.form { display: flex; flex-direction: column; gap: var(--space-6); }
.section { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); background: var(--color-surface-default); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); }
.title { font-size: var(--text-xl); font-weight: var(--weight-semibold); color: var(--color-text-heading); }
.logoRow { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.logoBox { display: grid; place-items: center; min-width: 120px; height: 72px; padding: var(--space-2); border: 1px dashed var(--color-border-strong); border-radius: var(--radius-md); background: var(--color-nav-bg); }
.logo { max-height: 64px; max-width: 240px; }
.noLogo { font-size: var(--text-md); color: var(--color-nav-text-muted); }
.upload { display: inline-flex; align-items: center; min-height: 32px; padding: 0 var(--space-3); border: 1px solid var(--color-action-secondary-border); border-radius: var(--radius-md); font-weight: var(--weight-medium); cursor: pointer; }
.upload:has(input:focus-visible) { outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset); }
.swatches { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.swatch { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); font-size: var(--text-sm); color: var(--color-text-secondary); }
.swatch input { width: 44px; height: 36px; padding: 0; border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); background: none; cursor: pointer; }
.hint { font-size: var(--text-md); color: var(--color-text-secondary); }
.actions { display: flex; justify-content: flex-end; }
```

```tsx
// src/pages/SettingsPage.tsx
import { Navigate } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { can } from '@/features/auth/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/types/auth';
import styles from './SettingsPage.module.css';

/** Ajustes del espacio (solo admin; las reglas también lo exigen). */
export function SettingsPage() {
  const { profile } = useAuth();
  const me = profile as UserProfile;
  if (!can(me, 'team:manage')) return <Navigate to="/tasks" replace />;
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Nombre, logo, colores y numeración del espacio." />
      <main className={styles.page}>
        <GeneralSettings actorId={me.uid} />
      </main>
    </>
  );
}
```

```css
/* src/pages/SettingsPage.module.css */
.page { padding: var(--space-5) var(--space-4) var(--space-12); }

@media (min-width: 640px) {
  .page { max-width: 880px; margin: 0 auto; padding: var(--space-8); }
}
```

`navItems.ts`: Ajustes con `to: '/settings'` y la función devuelve la lista **filtrada**: `return items.filter((item) => item.key !== 'settings' || can(profile, 'team:manage'));` (renombrar `_profile` a `profile` e importar `can`). `AppRouter.tsx`: `<Route path="/settings" element={<SettingsPage />} />` en el marco.

- [ ] **Step 4: Verificar y commit**

```bash
git add -A src tests
git commit -m "feat(v2): pantalla de ajustes con identidad, colores y numeración"
```

---

### Task 6: Encabezados y filtros fijos

**Files:** Modify `src/components/layout/AppShell.module.css`, `src/components/tasks/TaskWorkspace.tsx` (+ css), `src/pages/ProjectsPage.tsx` (+ css), `src/pages/CalendarPage.tsx` (+ css), `src/pages/SettingsPage.tsx` (+ css), `src/pages/TeamPage.tsx` (+ css)

- [ ] **Step 1: Variable de alto de la barra del celular**

`AppShell.module.css`: en `.shell` agregar `--topbar-height: 56px;` y en `@media (min-width: 768px)` `--topbar-height: 0px;`.

- [ ] **Step 2: Contenedor fijo**

En cada página, envolver el encabezado y las barras de filtros en `<div className={styles.sticky}>…</div>` con:

```css
.sticky {
  position: sticky; top: var(--topbar-height, 0px); z-index: 5;
  background: var(--color-surface-subtle); box-shadow: 0 1px 0 var(--color-border-default);
}
```

- `TaskWorkspace`: `{renderHeader(…)}` + `.filters` + `.toolbar` dentro de `.sticky` (mover estos dos bloques fuera de `<section aria-label="Tareas">` hacia el contenedor; las tarjetas `TaskStats` quedan fuera, dentro del contenido que se desplaza). Para que el `.sticky` se vea bien, darle `padding` a las barras igual que `.main` (`var(--space-3) var(--space-4)`; en ≥ 640px `var(--space-3) var(--space-8)`).
- `ProjectsPage`: `PageHeader` + `SegmentedControl`.
- `CalendarPage`: `PageHeader` + `.toolbar`.
- `TeamPage` y `SettingsPage`: `PageHeader`.

- [ ] **Step 3: Verificar**

Run: `npm test && npm run build && npm run lint`. Probar en el navegador (computadora y celular) que al desplazar quedan fijos el encabezado y los filtros, y que nada queda tapado.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat(v2): encabezados y filtros fijos al desplazar"
```

---

### Task 7: Preview 8A

- [ ] Publicar reglas en dev (script temporal), preview (`vercel --yes` + alias), producción 200, push.
- [ ] Prueba de la usuaria: Ajustes solo visible para admin; cambiar nombre y subir logo (se ven en el menú, la barra del celular y el login); cambiar colores con vista previa, aviso de contraste que bloquea, "Restaurar paleta original"; guardar recolorea toda la app (y en otra pestaña abierta); prefijo FL (lista, tabla, tablero, panel, calendario, buscador); pie "Desarrollado por Imago Design" en login y app; encabezados y filtros fijos al desplazar.

---

## Autorrevisión del plan

- **Cobertura (8A):** acceso solo admin y menú (T5); colores con contraste, vista previa y restaurar (T1, T5); logo y nombre en app y login con lectura pública (T2, T3); pie fijo (T4); prefijo solo visual y buscador (T3); encabezados fijos (T6); correcciones de contraste existentes (T1). La auditoría (8B) tiene su propio plan.
- **Ajuste:** se acepta PNG, JPG y WebP para el logo (no SVG) y siempre se guarda como PNG para conservar la transparencia.
- **Nombres:** `mixColors`, `DEFAULT_PALETTE`, `DEFAULT_SETTINGS`, `WorkspaceSettings`, `isValidPrefix`, `paletteChecks`, `PaletteCheck`, `saveSettings`, `subscribeToSettings`, `saveWorkspaceSettings`, `WorkspaceSettingsProvider`, `useWorkspaceSettings`, `useTaskNumberFormat`, `applyPalette`, `formatTaskNumber(n, prefix)`, `searchTasks(tasks, query, prefix)`, `CreditsFooter`, `fitWithin`, `imageToLogo`, `PalettePreview`, `GeneralSettings`, `SettingsPage`.
