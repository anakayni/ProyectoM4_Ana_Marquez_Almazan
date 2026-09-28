# MateCode Tasks — Plan 1: Núcleo obligatorio

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** SPA de tareas con auth (email + Google), CRUD por usuario en Firestore, email de resumen vía Vercel Function + AWS SES, tests y deploy público en Vercel.

**Arquitectura:** React + TS con capas `component → hook → service`. Firebase Auth/Firestore desde el cliente, protegido por Security Rules. Una Vercel Function (`/api/send-summary`) verifica el ID token con `firebase-admin`, lee las tareas del usuario y envía el email con SES. La lógica del servidor usa inyección de dependencias para testearla sin servicios reales.

**Stack:** Vite 8, React 19, React Router 8 (`react-router`), TypeScript, Firebase 12, firebase-admin 14, `@aws-sdk/client-sesv2`, Vitest 5, React Testing Library, jsdom, CSS Modules.

**Spec:** `docs/specs/2026-09-28-matecode-tasks-design.md`

**Plan 2 (extras: filtros, vencimiento/prioridad, drag & drop)** se escribe al terminar este.

## Restricciones globales

- Directorio del proyecto: `/Users/anamarquez/Documents/Soy Henry/M4-Ana-Marquez/matecode-tasks`. Todos los comandos corren ahí.
- Los componentes NUNCA importan de `firebase/*`. Solo `src/services/*` lo hace.
- Ningún secreto lleva prefijo `VITE_`. Los secretos nunca se escriben en el chat, en código ni en commits: solo en `.env` (ignorado) y en Vercel.
- Título 1–80 caracteres; descripción 0–500.
- Mensajes de UI y commits en español. Commits con Conventional Commits y trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Antes de cada commit: mostrar a la autora el diff/resumen y explicar qué cambió. Correr `npm test` y `npm run build` si el paso toca código.
- Imports de React Router desde `react-router` (no `react-router-dom`).
- Versiones: usar las que instale `@latest`. Si una API del plan no coincide con la versión instalada, consultar la doc (context7) y adaptar; anotar la diferencia en `AI_LOG.md`.
- Estilos: CSS Modules + variables de `src/styles/tokens.css`. Mobile first: estilos base para móvil, `@media (min-width: 640px)` para pantallas mayores.
- Al cerrar cada fase, agregar una entrada en `AI_LOG.md` (plantilla en Tarea 1).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/main.tsx` | Monta `<App/>` |
| `src/App.tsx` | `AuthProvider` + `AppRouter` |
| `src/styles/tokens.css`, `global.css` | Tokens de diseño y reset |
| `src/types/auth.ts`, `task.ts`, `api.ts` | Tipos compartidos |
| `src/utils/validators.ts` | Validación pura de formularios |
| `src/features/auth/mapAuthError.ts` | Códigos Firebase → mensajes |
| `src/services/firebase.ts` | Inicializa app, auth, db |
| `src/services/auth.service.ts` | Wrappers de Firebase Auth |
| `src/services/tasks.service.ts` | Wrappers de Firestore |
| `src/api/summary.api.ts` | `POST /api/send-summary` |
| `src/hooks/useAuth.tsx` | Contexto de sesión |
| `src/hooks/useTasks.ts` | Suscripción + acciones CRUD |
| `src/routes/AppRouter.tsx`, `ProtectedRoute.tsx`, `PublicOnlyRoute.tsx` | Navegación |
| `src/components/ui/*` | Button, Field, Alert, Spinner, Modal, Toast |
| `src/components/auth/AuthLayout.tsx`, `GoogleButton.tsx` | Layout de login/registro |
| `src/components/tasks/TodoForm.tsx`, `TodoList.tsx`, `TodoItem.tsx` | UI de tareas |
| `src/pages/LoginPage.tsx`, `RegisterPage.tsx`, `TasksPage.tsx` | Vistas |
| `functions/env.ts` | `requireEnv()` |
| `functions/summaryEmail.ts` | `buildSummary`, `renderSummaryEmail` (puras) |
| `functions/sendSummary.ts` | Handler con dependencias inyectadas |
| `functions/firebaseAdmin.ts` | `verifyIdToken`, `getTasksForUser` |
| `functions/ses.ts` | `sendEmail` |
| `api/send-summary.ts` | Entrada Vercel: conecta dependencias reales |
| `tests/**` | Tests |
| `firestore.rules`, `vercel.json`, `.env.example`, `README.md`, `AI_LOG.md` | Config y docs |

---

## FASE 0 — Setup

### Tarea 1: Proyecto Vite + TypeScript + Vitest

**Files:**
- Create: scaffold de Vite, `vite.config.ts` (modificado), `tsconfig.app.json` (modificado), `tsconfig.server.json`, `tsconfig.json` (modificado), `tests/setup.ts`, `tests/smoke.test.ts`, `.gitignore`, `.env.example`, `AI_LOG.md`

**Interfaces:**
- Produces: alias `@/` → `src/`; scripts `dev`, `build`, `test`, `test:watch`; entorno jsdom con matchers de jest-dom.

- [ ] **Paso 1: Scaffold en carpeta temporal y copiar** (create-vite no acepta carpetas con archivos)

```bash
cd "/Users/anamarquez/Documents/Soy Henry/M4-Ana-Marquez"
npm create vite@latest vite-tmp -- --template react-ts --no-interactive
rsync -a vite-tmp/ matecode-tasks/ && rm -rf vite-tmp
cd matecode-tasks && npm install
```

Si `--no-interactive` no existe en la versión instalada, correr sin esa bandera y elegir React + TypeScript.

- [ ] **Paso 2: Limpiar el demo de Vite**

Borrar `src/App.css`, `src/assets/`, `public/vite.svg` (y cualquier otro asset de demo). Reemplazar `src/index.css` más adelante (Tarea 2). Dejar `src/App.tsx` temporalmente como:

```tsx
export default function App() {
  return <h1>MateCode Tasks</h1>;
}
```

Y en `src/main.tsx` quitar el import de `./index.css` si ya se borró.

- [ ] **Paso 3: Instalar dependencias**

```bash
npm install firebase react-router
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/node
```

- [ ] **Paso 4: Configurar Vite + Vitest** — reemplazar `vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
```

- [ ] **Paso 5: tsconfig** — en `tsconfig.app.json`, dentro de `compilerOptions` agregar:

```json
"paths": { "@/*": ["./src/*"] },
"types": ["vite/client", "@testing-library/jest-dom"]
```

y cambiar `"include"` a `["src", "tests"]`.

Crear `tsconfig.server.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023", "DOM"],
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["api", "functions"]
}
```

En `tsconfig.json` agregar `{ "path": "./tsconfig.server.json" }` al array `references`. (Si `tsc -b` exige `"composite": true` en referencias, agregarlo y cambiar `noEmit` por `"emitDeclarationOnly": true` + `"outDir": "node_modules/.tmp/server"`, igual que hace `tsconfig.node.json`.)

- [ ] **Paso 6: Setup de tests** — `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

- [ ] **Paso 7: Test de humo** — `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('entorno de tests', () => {
  it('ejecuta Vitest con jsdom', () => {
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement);
  });
});
```

- [ ] **Paso 8: Scripts** — en `package.json`, `scripts`:

```json
"dev": "vite",
"build": "tsc -b && vite build",
"preview": "vite preview",
"lint": "eslint .",
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Paso 9: Verificar**

Run: `npm test` → Expected: 1 passed.
Run: `npm run build` → Expected: sin errores, genera `dist/`.

- [ ] **Paso 10: `.gitignore`** — asegurar que contiene (agregar lo que falte al generado por Vite):

```
node_modules
dist
coverage
.vercel

# Variables de entorno: nunca se suben
.env
.env.*
!.env.example
```

- [ ] **Paso 11: `.env.example`**

```
# ─── Firebase (cliente) ─── solo VITE_* llega al navegador
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# ─── Firebase Admin (servidor) ───
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
# Entre comillas dobles, con los saltos de línea como \n
FIREBASE_ADMIN_PRIVATE_KEY=

# ─── AWS SES (servidor) ─── prefijo SES_ porque Vercel reserva AWS_*
SES_AWS_REGION=
SES_AWS_ACCESS_KEY_ID=
SES_AWS_SECRET_ACCESS_KEY=
SES_FROM_EMAIL=

# URL pública de la app (botón del email)
APP_URL=
```

- [ ] **Paso 12: `AI_LOG.md`**

```markdown
# Registro de uso de IA

Registro de cómo usé IA (Claude Code) durante el desarrollo. Base para la sección de IA del README.

## Plantilla por fase

### Fase N — nombre
- **Qué pedí:**
- **Qué generó / propuso:**
- **Qué revisé o cambié yo:**
- **Qué aprendí:**
- **Qué no funcionó o tuve que corregir:**

---

## Fase 0 — Diseño y setup
- **Qué pedí:** analizar el enunciado y hacerme preguntas antes de programar.
- **Qué generó / propuso:** documento de diseño con alternativas (p. ej. servidor lee las tareas vs. cliente las envía) y plan por fases.
- **Qué revisé o cambié yo:** elegí empezar desde cero, auth con Google, CSS propio.
- **Qué aprendí:** 
- **Qué no funcionó o tuve que corregir:** 
```

(La autora completa "Qué aprendí" con sus palabras.)

- [ ] **Paso 13: Commit**

```bash
git add -A
git status   # confirmar que NO aparece .env
git commit -m "chore: inicializar proyecto con Vite, React, TypeScript y Vitest" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 2: Estilos base y componentes UI

**Files:**
- Create: `src/styles/tokens.css` (copia de `../tokens.css`), `src/styles/global.css`, `src/components/ui/Button.tsx`, `Button.module.css`, `Field.tsx`, `Field.module.css`, `Alert.tsx`, `Alert.module.css`, `Spinner.tsx`, `Spinner.module.css`
- Modify: `src/main.tsx`, `index.html`
- Test: `tests/components/ui.test.tsx`

**Interfaces:**
- Produces:
  - `Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'md' | 'sm'; loading?: boolean })`
  - `Field({ id, label, error?, children }: { id: string; label: string; error?: string; children: ReactNode })` — el hijo debe usar `id`, `aria-invalid` y `aria-describedby={error ? \`${id}-error\` : undefined}`. Exporta también la clase `fieldInputClass` (string) para inputs/textarea.
  - `Alert({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode })` con `role="alert"` si `kind==='error'`, si no `role="status"`.
  - `Spinner({ label }: { label: string })` con `role="status"` y texto accesible.

- [ ] **Paso 1: Copiar tokens**

```bash
mkdir -p src/styles && cp ../tokens.css src/styles/tokens.css
```

- [ ] **Paso 2: `src/styles/global.css`**

```css
@import './tokens.css';

*, *::before, *::after { box-sizing: border-box; }

html, body { margin: 0; }

body {
  font-family: var(--font-sans);
  font-size: var(--text-lg);
  line-height: var(--leading-normal);
  color: var(--color-text-primary);
  background: var(--color-surface-subtle);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, p { margin: 0; }

button, input, textarea, select { font: inherit; color: inherit; }

:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

.visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
```

- [ ] **Paso 3: Fuentes y título** — en `index.html`: `<html lang="es">`, `<title>MateCode Tasks</title>` y en `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
```

En `src/main.tsx` importar `import './styles/global.css';`.

- [ ] **Paso 4: Test que falla** — `tests/components/ui.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';

describe('Button', () => {
  it('queda deshabilitado y anuncia carga cuando loading=true', () => {
    render(<Button loading>Guardar</Button>);
    const button = screen.getByRole('button', { name: /guardar/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Field', () => {
  it('asocia label y mensaje de error al input', () => {
    render(
      <Field id="email" label="Email" error="Email inválido">
        <input id="email" className={fieldInputClass} aria-invalid aria-describedby="email-error" />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('Email inválido');
  });
});

describe('Alert', () => {
  it('usa role=alert para errores', () => {
    render(<Alert kind="error">Falló</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Falló');
  });
});
```

Run: `npm test` → Expected: FAIL (módulos no existen).

- [ ] **Paso 5: `src/components/ui/Button.tsx` + CSS**

```tsx
import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}
```

`Button.module.css`:

```css
.button {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  min-height: 44px; padding: 0 var(--space-4);
  border: 1px solid transparent; border-radius: var(--radius-md);
  font-weight: var(--weight-medium); cursor: pointer;
  transition: background var(--motion-duration-fast) var(--motion-easing-standard);
}
.button:disabled { cursor: not-allowed; opacity: 0.6; }
.sm { min-height: 36px; padding: 0 var(--space-3); font-size: var(--text-md); }
.primary { background: var(--color-action-primary); color: var(--color-text-inverse); }
.primary:hover:not(:disabled) { background: var(--color-action-primary-hover); }
.secondary { background: var(--color-surface-default); border-color: var(--color-action-secondary-border); }
.secondary:hover:not(:disabled) { background: var(--color-action-secondary-hover); }
.ghost { background: transparent; color: var(--color-text-secondary); }
.ghost:hover:not(:disabled) { background: var(--color-surface-sunken); color: var(--color-text-primary); }
.danger { background: var(--color-action-danger); color: var(--color-gray-0); }
.danger:hover:not(:disabled) { background: var(--color-action-danger-hover); }
.spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid currentColor; border-right-color: transparent;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

- [ ] **Paso 6: `Field.tsx` + CSS**

```tsx
import type { ReactNode } from 'react';
import styles from './Field.module.css';

export const fieldInputClass = styles.input;

type FieldProps = { id: string; label: string; error?: string; children: ReactNode };

export function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      {children}
      {error && <p id={`${id}-error`} className={styles.error}>{error}</p>}
    </div>
  );
}
```

`Field.module.css`:

```css
.field { display: flex; flex-direction: column; gap: var(--space-1); }
.label { font-size: var(--text-md); font-weight: var(--weight-medium); color: var(--color-text-secondary); }
.input {
  width: 100%; min-height: 44px; padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong); border-radius: var(--radius-md);
  background: var(--color-surface-default);
}
textarea.input { min-height: 96px; resize: vertical; }
.input[aria-invalid='true'] { border-color: var(--color-status-danger); }
.error { font-size: var(--text-sm); color: var(--color-status-danger); }
```

- [ ] **Paso 7: `Alert.tsx` + CSS**

```tsx
import type { ReactNode } from 'react';
import styles from './Alert.module.css';

type AlertProps = { kind: 'error' | 'success' | 'info'; children: ReactNode };

export function Alert({ kind, children }: AlertProps) {
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`${styles.alert} ${styles[kind]}`}>
      {children}
    </div>
  );
}
```

```css
.alert { padding: var(--space-3); border: 1px solid; border-radius: var(--radius-md); font-size: var(--text-md); }
.error { background: var(--color-status-danger-surface); border-color: var(--color-status-danger-border); color: var(--color-status-danger); }
.success { background: var(--color-status-success-surface); border-color: var(--color-status-success-border); color: var(--color-status-success); }
.info { background: var(--color-status-info-surface); border-color: var(--color-status-info-border); color: var(--color-status-info); }
```

- [ ] **Paso 8: `Spinner.tsx` + CSS**

```tsx
import styles from './Spinner.module.css';

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className={styles.wrapper}>
      <span className={styles.spinner} aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
```

```css
.wrapper { display: flex; justify-content: center; padding: var(--space-10); }
.spinner {
  width: 28px; height: 28px; border-radius: 50%;
  border: 3px solid var(--color-border-default); border-top-color: var(--color-action-primary);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

- [ ] **Paso 9: Verificar** — `npm test` → Expected: todos PASS. `npm run build` → OK.

- [ ] **Paso 10: Commit**

```bash
git add -A
git commit -m "style: agregar tokens de diseño y componentes UI base" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 3: Validadores y mapeo de errores de auth (TDD)

**Files:**
- Create: `src/utils/validators.ts`, `src/types/auth.ts`, `src/features/auth/mapAuthError.ts`
- Test: `tests/unit/validators.test.ts`, `tests/unit/mapAuthError.test.ts`

**Interfaces:**
- Produces:
  - `type FieldErrors<K extends string> = Partial<Record<K, string>>`
  - `TITLE_MAX = 80`, `DESCRIPTION_MAX = 500`, `PASSWORD_MIN = 6`
  - `validateLogin(v: { email: string; password: string }): FieldErrors<'email' | 'password'>`
  - `validateRegister(v: RegisterFormValues): FieldErrors<'name' | 'email' | 'password' | 'confirmPassword'>`
  - `validateTask(v: { title: string; description: string }): FieldErrors<'title' | 'description'>`
  - `hasErrors(e: object): boolean`
  - `mapAuthError(error: unknown): string`, `DEFAULT_AUTH_ERROR: string`
  - Tipos: `AppUser { uid; email; displayName }`, `RegisterInput { name; email; password }`, `RegisterFormValues = RegisterInput & { confirmPassword }`, `AuthContextValue`.

- [ ] **Paso 1: Tipos** — `src/types/auth.ts`:

```ts
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterFormValues extends RegisterInput {
  confirmPassword: string;
}

export interface AuthContextValue {
  user: AppUser | null;
  /** true mientras Firebase resuelve si ya había una sesión */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}
```

- [ ] **Paso 2: Test que falla** — `tests/unit/validators.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hasErrors, validateLogin, validateRegister, validateTask } from '@/utils/validators';

describe('validateLogin', () => {
  it('pide email y contraseña', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Ingresa tu email.',
      password: 'Ingresa tu contraseña.',
    });
  });

  it('rechaza emails mal formados', () => {
    expect(validateLogin({ email: 'ana@', password: 'secreto' }).email).toBe('El email no tiene un formato válido.');
  });

  it('acepta datos válidos (recortando espacios del email)', () => {
    expect(validateLogin({ email: '  ana@mail.com ', password: 'secreto' })).toEqual({});
  });
});

describe('validateRegister', () => {
  const valid = { name: 'Ana', email: 'ana@mail.com', password: 'secreto', confirmPassword: 'secreto' };

  it('acepta datos válidos', () => {
    expect(validateRegister(valid)).toEqual({});
  });

  it('exige nombre', () => {
    expect(validateRegister({ ...valid, name: '  ' }).name).toBe('Ingresa tu nombre.');
  });

  it('exige contraseña de al menos 6 caracteres', () => {
    expect(validateRegister({ ...valid, password: '123', confirmPassword: '123' }).password).toBe(
      'La contraseña debe tener al menos 6 caracteres.',
    );
  });

  it('exige que las contraseñas coincidan', () => {
    expect(validateRegister({ ...valid, confirmPassword: 'otra' }).confirmPassword).toBe('Las contraseñas no coinciden.');
  });
});

describe('validateTask', () => {
  it('exige título', () => {
    expect(validateTask({ title: '   ', description: '' }).title).toBe('El título es obligatorio.');
  });

  it('limita el título a 80 caracteres', () => {
    expect(validateTask({ title: 'a'.repeat(81), description: '' }).title).toBe('Máximo 80 caracteres.');
  });

  it('limita la descripción a 500 caracteres', () => {
    expect(validateTask({ title: 'Tarea', description: 'a'.repeat(501) }).description).toBe('Máximo 500 caracteres.');
  });

  it('acepta título válido y descripción vacía', () => {
    expect(validateTask({ title: 'Tarea', description: '' })).toEqual({});
  });
});

describe('hasErrors', () => {
  it('detecta si hay al menos un error', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ title: 'x' })).toBe(true);
  });
});
```

Run: `npm test -- validators` → Expected: FAIL (módulo no existe).

- [ ] **Paso 3: Implementar** — `src/utils/validators.ts`:

```ts
import type { RegisterFormValues } from '@/types/auth';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 500;
export const PASSWORD_MIN = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Ingresa tu email.';
  if (!EMAIL_PATTERN.test(value)) return 'El email no tiene un formato válido.';
  return undefined;
}

/** Elimina las claves sin error para que `{}` signifique "todo válido". */
function compact<K extends string>(errors: Record<K, string | undefined>): FieldErrors<K> {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as FieldErrors<K>;
}

export function validateLogin(values: { email: string; password: string }): FieldErrors<'email' | 'password'> {
  return compact({
    email: validateEmail(values.email),
    password: values.password ? undefined : 'Ingresa tu contraseña.',
  });
}

export function validateRegister(
  values: RegisterFormValues,
): FieldErrors<'name' | 'email' | 'password' | 'confirmPassword'> {
  return compact({
    name: values.name.trim() ? undefined : 'Ingresa tu nombre.',
    email: validateEmail(values.email),
    password:
      values.password.length >= PASSWORD_MIN
        ? undefined
        : `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
    confirmPassword: values.confirmPassword === values.password ? undefined : 'Las contraseñas no coinciden.',
  });
}

export function validateTask(values: { title: string; description: string }): FieldErrors<'title' | 'description'> {
  const title = values.title.trim();
  return compact({
    title: !title ? 'El título es obligatorio.' : title.length > TITLE_MAX ? `Máximo ${TITLE_MAX} caracteres.` : undefined,
    description: values.description.length > DESCRIPTION_MAX ? `Máximo ${DESCRIPTION_MAX} caracteres.` : undefined,
  });
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
```

Run: `npm test -- validators` → Expected: PASS.

- [ ] **Paso 4: Test que falla** — `tests/unit/mapAuthError.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTH_ERROR, mapAuthError } from '@/features/auth/mapAuthError';

describe('mapAuthError', () => {
  it('traduce credenciales inválidas', () => {
    expect(mapAuthError({ code: 'auth/invalid-credential' })).toBe(
      'Email o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.',
    );
  });

  it('traduce email ya registrado', () => {
    expect(mapAuthError({ code: 'auth/email-already-in-use' })).toMatch(/ya existe una cuenta/i);
  });

  it('traduce popup de Google cerrado', () => {
    expect(mapAuthError({ code: 'auth/popup-closed-by-user' })).toMatch(/cerraste la ventana de google/i);
  });

  it('usa un mensaje genérico para códigos desconocidos o valores raros', () => {
    expect(mapAuthError({ code: 'auth/algo-nuevo' })).toBe(DEFAULT_AUTH_ERROR);
    expect(mapAuthError(new Error('x'))).toBe(DEFAULT_AUTH_ERROR);
    expect(mapAuthError(null)).toBe(DEFAULT_AUTH_ERROR);
  });
});
```

Run: `npm test -- mapAuthError` → Expected: FAIL.

- [ ] **Paso 5: Implementar** — `src/features/auth/mapAuthError.ts`:

```ts
const INVALID_CREDENTIALS = 'Email o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': INVALID_CREDENTIALS,
  'auth/wrong-password': INVALID_CREDENTIALS,
  'auth/user-not-found': INVALID_CREDENTIALS,
  'auth/invalid-email': 'El email no tiene un formato válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con este email. Inicia sesión o usa otro email.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada. Contacta al administrador.',
  'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar. Inténtalo de nuevo.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes e inténtalo de nuevo.',
  'auth/account-exists-with-different-credential':
    'Ya existe una cuenta con este email usando otro método. Inicia sesión con email y contraseña.',
};

export const DEFAULT_AUTH_ERROR = 'Ocurrió un error inesperado. Inténtalo de nuevo.';

function getErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String(error.code);
  }
  return '';
}

/** Traduce un error de Firebase Auth a un mensaje claro para el usuario. */
export function mapAuthError(error: unknown): string {
  return MESSAGES[getErrorCode(error)] ?? DEFAULT_AUTH_ERROR;
}
```

Run: `npm test` → Expected: todos PASS.

- [ ] **Paso 6: Commit**

```bash
git add -A
git commit -m "feat(auth): validadores de formularios y mensajes de error en español" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## FASE 1 — Firebase

### Tarea 4: Proyecto Firebase y cliente web

**Files:**
- Create: `src/services/firebase.ts`, `.env` (local, NO se versiona)
- Modify: `src/vite-env.d.ts`

**Interfaces:**
- Produces: `auth: Auth`, `db: Firestore`, `googleProvider: GoogleAuthProvider` exportados desde `@/services/firebase`.

- [ ] **Paso 1 (manual, autora): Crear el proyecto Firebase**

1. https://console.firebase.google.com → **Agregar proyecto** → nombre `matecode-tasks` → Google Analytics desactivado.
2. **Build → Authentication → Comenzar → Sign-in method:** habilitar **Correo electrónico/contraseña** y **Google** (elegir email de soporte).
3. **Build → Firestore Database → Crear base de datos** → ubicación cercana (p. ej. `nam5` o `southamerica-east1`) → **modo producción**.
4. **Configuración del proyecto (⚙️) → Tus apps → Web (`</>`)** → apodo `matecode-web`, sin Hosting → copiar los valores de `firebaseConfig`.
5. `cp .env.example .env` y pegar esos valores en las variables `VITE_FIREBASE_*` de `.env`. **No pegarlos en el chat.**

- [ ] **Paso 2: Tipar las variables** — agregar a `src/vite-env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Paso 3: `src/services/firebase.ts`**

```ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// La config web de Firebase no es secreta (identifica el proyecto);
// la seguridad real la dan las Security Rules. Igual se maneja por variables de entorno.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
```

- [ ] **Paso 4: Verificar** — `npm run build` → OK. `git status` → `.env` NO aparece.

- [ ] **Paso 5: Commit**

```bash
git add src/services/firebase.ts src/vite-env.d.ts
git commit -m "feat(firebase): inicializar Firebase con variables de entorno" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## FASE 2 — Autenticación y rutas

### Tarea 5: Servicio de auth y contexto `useAuth`

**Files:**
- Create: `src/services/auth.service.ts`, `src/hooks/useAuth.tsx`
- Test: `tests/unit/useAuth.test.tsx`

**Interfaces:**
- Consumes: `auth`, `googleProvider` (Tarea 4); tipos de `@/types/auth` (Tarea 3).
- Produces:
  - `registerWithEmail(input: RegisterInput): Promise<AppUser>`
  - `loginWithEmail(email: string, password: string): Promise<void>`
  - `loginWithGoogle(): Promise<void>`
  - `logout(): Promise<void>`
  - `subscribeToAuth(cb: (user: AppUser | null) => void): () => void`
  - `getIdToken(): Promise<string>` (lanza si no hay sesión)
  - `AuthProvider({ children })`, `useAuth(): AuthContextValue`

- [ ] **Paso 1: `src/services/auth.service.ts`**

```ts
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import type { AppUser, RegisterInput } from '@/types/auth';
import { auth, googleProvider } from './firebase';

function toAppUser(user: User): AppUser {
  return { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? '' };
}

export async function registerWithEmail({ name, email, password }: RegisterInput): Promise<AppUser> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  // onAuthStateChanged se dispara antes de updateProfile, por eso devolvemos el nombre acá.
  return { ...toAppUser(credential.user), displayName: name.trim() };
}

export async function loginWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function loginWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export function logout(): Promise<void> {
  return signOut(auth);
}

export function subscribeToAuth(callback: (user: AppUser | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => callback(user ? toAppUser(user) : null));
}

export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay una sesión activa.');
  return user.getIdToken();
}
```

- [ ] **Paso 2: Test que falla** — `tests/unit/useAuth.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUser } from '@/types/auth';

let emitAuth: (user: AppUser | null) => void = () => {};

vi.mock('@/services/auth.service', () => ({
  subscribeToAuth: vi.fn((cb: (user: AppUser | null) => void) => {
    emitAuth = cb;
    return () => {};
  }),
  loginWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  registerWithEmail: vi.fn(),
  logout: vi.fn(),
}));

import { AuthProvider, useAuth } from '@/hooks/useAuth';

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <p>cargando</p>;
  return <p>{user ? `hola ${user.displayName}` : 'sin sesión'}</p>;
}

describe('useAuth', () => {
  beforeEach(() => {
    emitAuth = () => {};
  });

  it('empieza cargando y luego refleja el usuario de Firebase', () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText('cargando')).toBeInTheDocument();

    act(() => emitAuth({ uid: '1', email: 'ana@mail.com', displayName: 'Ana' }));
    expect(screen.getByText('hola Ana')).toBeInTheDocument();

    act(() => emitAuth(null));
    expect(screen.getByText('sin sesión')).toBeInTheDocument();
  });

  it('lanza un error claro si se usa fuera del provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useAuth debe usarse dentro de <AuthProvider>');
  });
});
```

Run: `npm test -- useAuth` → Expected: FAIL.

- [ ] **Paso 3: `src/hooks/useAuth.tsx`**

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authService from '@/services/auth.service';
import type { AppUser, AuthContextValue } from '@/types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Devuelve la función de desuscripción: React la llama al desmontar.
    return authService.subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: authService.loginWithEmail,
      loginWithGoogle: authService.loginWithGoogle,
      register: async (input) => {
        setUser(await authService.registerWithEmail(input));
      },
      logout: authService.logout,
    }),
    [user, loading],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Paso 4: Commit**

```bash
git add -A
git commit -m "feat(auth): servicio de Firebase Auth y contexto useAuth" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 6: Rutas protegidas (TDD)

**Files:**
- Create: `src/routes/ProtectedRoute.tsx`, `src/routes/PublicOnlyRoute.tsx`
- Test: `tests/components/routes.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Tarea 5), `Spinner` (Tarea 2).
- Produces: `ProtectedRoute({ children })` → redirige a `/login` sin sesión; `PublicOnlyRoute({ children })` → redirige a `/tasks` con sesión.

- [ ] **Paso 1: Test que falla** — `tests/components/routes.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextValue } from '@/types/auth';

const authState: Pick<AuthContextValue, 'user' | 'loading'> = { user: null, loading: false };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => authState }));

import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicOnlyRoute } from '@/routes/PublicOnlyRoute';

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute><h1>Login</h1></PublicOnlyRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><h1>Mis tareas</h1></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('rutas guardianas', () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
  });

  it('muestra un spinner mientras se resuelve la sesión', () => {
    authState.loading = true;
    renderAt('/tasks');
    expect(screen.getByRole('status')).toHaveTextContent(/cargando/i);
    expect(screen.queryByText('Mis tareas')).not.toBeInTheDocument();
  });

  it('redirige a /login si no hay sesión', () => {
    renderAt('/tasks');
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('muestra las tareas si hay sesión', () => {
    authState.user = { uid: '1', email: 'ana@mail.com', displayName: 'Ana' };
    renderAt('/tasks');
    expect(screen.getByRole('heading', { name: 'Mis tareas' })).toBeInTheDocument();
  });

  it('redirige de /login a /tasks si ya hay sesión', () => {
    authState.user = { uid: '1', email: 'ana@mail.com', displayName: 'Ana' };
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Mis tareas' })).toBeInTheDocument();
  });
});
```

Run: `npm test -- routes` → Expected: FAIL.

- [ ] **Paso 2: `src/routes/ProtectedRoute.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Cargando sesión…" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

- [ ] **Paso 3: `src/routes/PublicOnlyRoute.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Cargando sesión…" />;
  if (user) return <Navigate to="/tasks" replace />;
  return children;
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Paso 4: Commit**

```bash
git add -A
git commit -m "feat(routes): rutas protegidas y rutas solo para visitantes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 7: Páginas de Login y Registro + router

**Files:**
- Create: `src/components/auth/AuthLayout.tsx`, `AuthLayout.module.css`, `GoogleButton.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`, `src/pages/TasksPage.tsx` (placeholder), `src/routes/AppRouter.tsx`
- Modify: `src/App.tsx`
- Test: `tests/components/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `validateLogin`, `validateRegister`, `hasErrors`, `mapAuthError`, `Button`, `Field`, `fieldInputClass`, `Alert`, rutas guardianas.
- Produces: `AuthLayout({ title, subtitle, children, footer })`, `GoogleButton({ onClick, disabled })`, `AppRouter()`.

- [ ] **Paso 1: Test que falla** — `tests/components/LoginPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const login = vi.fn();
const loginWithGoogle = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login, loginWithGoogle }) }));

import { LoginPage } from '@/pages/LoginPage';

function renderPage() {
  render(<MemoryRouter><LoginPage /></MemoryRouter>);
}

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset();
    loginWithGoogle.mockReset();
  });

  it('valida los campos antes de llamar a Firebase', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(screen.getByText('Ingresa tu email.')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('muestra el error traducido cuando el login falla', async () => {
    login.mockRejectedValue({ code: 'auth/invalid-credential' });
    renderPage();
    await userEvent.type(screen.getByLabelText('Email'), 'ana@mail.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await userEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos');
    expect(login).toHaveBeenCalledWith('ana@mail.com', 'incorrecta');
  });

  it('permite entrar con Google', async () => {
    loginWithGoogle.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /continuar con google/i }));
    expect(loginWithGoogle).toHaveBeenCalled();
  });
});
```

Run: `npm test -- LoginPage` → Expected: FAIL.

- [ ] **Paso 2: `src/components/auth/AuthLayout.tsx` + CSS**

```tsx
import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

type AuthLayoutProps = { title: string; subtitle: string; children: ReactNode; footer: ReactNode };

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">M</span>
          <span>MateCode <span className={styles.muted}>Tasks</span></span>
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
        <p className={styles.footer}>{footer}</p>
      </div>
    </main>
  );
}
```

```css
.page { min-height: 100dvh; display: flex; align-items: flex-start; justify-content: center; padding: var(--space-6) var(--space-4); }
.card {
  width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: var(--space-4);
  padding: var(--space-6); background: var(--color-surface-default);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-md);
}
.brand { display: flex; align-items: center; gap: var(--space-2); font-weight: var(--weight-semibold); }
.logo {
  width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--radius-sm);
  background: var(--color-action-primary); color: var(--color-text-inverse); font-family: var(--font-mono);
}
.muted { font-weight: var(--weight-regular); color: var(--color-text-secondary); }
.title { font-size: var(--text-3xl); font-weight: var(--weight-semibold); }
.subtitle { color: var(--color-text-secondary); margin-top: calc(-1 * var(--space-3)); }
.form { display: flex; flex-direction: column; gap: var(--space-4); }
.divider { display: flex; align-items: center; gap: var(--space-3); color: var(--color-text-muted); font-size: var(--text-sm); }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--color-border-default); }
.footer { text-align: center; font-size: var(--text-md); color: var(--color-text-secondary); }
.footer a { color: var(--color-text-link); }

@media (min-width: 640px) {
  .page { align-items: center; }
  .card { padding: var(--space-8); }
}
```

Exportar las clases `form` y `divider` para las páginas: agregar al final de `AuthLayout.tsx`:

```tsx
export const authFormClass = styles.form;
export const authDividerClass = styles.divider;
```

- [ ] **Paso 3: `src/components/auth/GoogleButton.tsx`**

```tsx
import { Button } from '@/components/ui/Button';

type GoogleButtonProps = { onClick: () => void; disabled?: boolean };

export function GoogleButton({ onClick, disabled }: GoogleButtonProps) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
      </svg>
      Continuar con Google
    </Button>
  );
}
```

- [ ] **Paso 4: `src/pages/LoginPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthLayout, authDividerClass, authFormClass } from '@/components/auth/AuthLayout';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { mapAuthError } from '@/features/auth/mapAuthError';
import { useAuth } from '@/hooks/useAuth';
import { hasErrors, validateLogin, type FieldErrors } from '@/utils/validators';

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si el login funciona, PublicOnlyRoute redirige solo a /tasks.
  async function run(action: () => Promise<void>) {
    setError(null);
    setSubmitting(true);
    try {
      await action();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    void run(() => login(email, password));
  }

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Organiza tus tareas del día."
      footer={<>¿No tienes cuenta? <Link to="/register">Regístrate</Link></>}
    >
      {error && <Alert kind="error">{error}</Alert>}
      <form className={authFormClass} onSubmit={handleSubmit} noValidate>
        <Field id="email" label="Email" error={fieldErrors.email}>
          <input
            id="email" type="email" autoComplete="email" className={fieldInputClass}
            value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
        </Field>
        <Field id="password" label="Contraseña" error={fieldErrors.password}>
          <input
            id="password" type="password" autoComplete="current-password" className={fieldInputClass}
            value={password} onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          />
        </Field>
        <Button type="submit" loading={submitting}>Iniciar sesión</Button>
      </form>
      <div className={authDividerClass}>o</div>
      <GoogleButton onClick={() => void run(loginWithGoogle)} disabled={submitting} />
    </AuthLayout>
  );
}
```

- [ ] **Paso 5: `src/pages/RegisterPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthLayout, authDividerClass, authFormClass } from '@/components/auth/AuthLayout';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { mapAuthError } from '@/features/auth/mapAuthError';
import { useAuth } from '@/hooks/useAuth';
import type { RegisterFormValues } from '@/types/auth';
import { hasErrors, validateRegister, type FieldErrors } from '@/utils/validators';

type RegisterField = keyof RegisterFormValues;

const FIELDS: { name: RegisterField; label: string; type: string; autoComplete: string }[] = [
  { name: 'name', label: 'Nombre', type: 'text', autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { name: 'password', label: 'Contraseña', type: 'password', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Repetir contraseña', type: 'password', autoComplete: 'new-password' },
];

export function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const [values, setValues] = useState<RegisterFormValues>({ name: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterField>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function run(action: () => Promise<void>) {
    setError(null);
    setSubmitting(true);
    try {
      await action();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateRegister(values);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    void run(() => register({ name: values.name, email: values.email, password: values.password }));
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Tus tareas, guardadas en la nube."
      footer={<>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></>}
    >
      {error && <Alert kind="error">{error}</Alert>}
      <form className={authFormClass} onSubmit={handleSubmit} noValidate>
        {FIELDS.map((field) => (
          <Field key={field.name} id={field.name} label={field.label} error={fieldErrors[field.name]}>
            <input
              id={field.name} type={field.type} autoComplete={field.autoComplete} className={fieldInputClass}
              value={values[field.name]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
              aria-invalid={Boolean(fieldErrors[field.name])}
              aria-describedby={fieldErrors[field.name] ? `${field.name}-error` : undefined}
            />
          </Field>
        ))}
        <Button type="submit" loading={submitting}>Crear cuenta</Button>
      </form>
      <div className={authDividerClass}>o</div>
      <GoogleButton onClick={() => void run(loginWithGoogle)} disabled={submitting} />
    </AuthLayout>
  );
}
```

- [ ] **Paso 6: Placeholder `src/pages/TasksPage.tsx`** (se completa en Tarea 11)

```tsx
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export function TasksPage() {
  const { user, logout } = useAuth();
  return (
    <main style={{ padding: 'var(--space-6)' }}>
      <h1>Hola, {user?.displayName || user?.email}</h1>
      <Button variant="secondary" onClick={() => void logout()}>Cerrar sesión</Button>
    </main>
  );
}
```

- [ ] **Paso 7: `src/routes/AppRouter.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { TasksPage } from '@/pages/TasksPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Paso 8: `src/App.tsx`**

```tsx
import { AuthProvider } from '@/hooks/useAuth';
import { AppRouter } from '@/routes/AppRouter';

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
```

- [ ] **Paso 9: Verificar** — `npm test` → PASS. `npm run build` → OK.

- [ ] **Paso 10: Prueba manual** — `npm run dev`, abrir http://localhost:5173:
  - `/tasks` sin sesión → redirige a `/login`.
  - Registrarse con email → llega a `/tasks` con el nombre.
  - Cerrar sesión → vuelve a `/login`.
  - Login con contraseña incorrecta → mensaje en español.
  - Login con Google → funciona (`localhost` ya es dominio autorizado por defecto).
  - Mirar en el celular o con DevTools en modo móvil (375px).

- [ ] **Paso 11: Commit**

```bash
git add -A
git commit -m "feat(auth): páginas de login y registro con email y Google" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Paso 12: AI_LOG** — agregar entrada "Fase 1–2 — Firebase y autenticación" y commitear `docs: registrar uso de IA en autenticación`.

---

## FASE 3 — CRUD de tareas

### Tarea 8: Tipos, servicio de tareas, `useTasks` y Security Rules

**Files:**
- Create: `src/types/task.ts`, `src/services/tasks.service.ts`, `src/hooks/useTasks.ts`, `firestore.rules`
- Test: `tests/unit/useTasks.test.tsx`

**Interfaces:**
- Produces:
  - `Task { id; userId; title; description; completed; createdAt: number }` (millis)
  - `TaskInput { title; description }`, `TaskPatch = Partial<TaskInput & { completed: boolean }>`
  - `subscribeToTasks(uid, onData: (t: Task[]) => void, onError: (e: Error) => void): () => void` — ordenado por `createdAt` desc
  - `createTask(uid, input): Promise<void>`, `updateTask(id, patch): Promise<void>`, `deleteTask(id): Promise<void>`
  - `useTasks(uid: string): { tasks; loading; error: string | null; retry(); create(input); update(id, patch); remove(id); toggle(id, completed) }`

- [ ] **Paso 1: `src/types/task.ts`**

```ts
export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  /** Fecha de creación en milisegundos (convertida desde el Timestamp de Firestore) */
  createdAt: number;
}

/** Campos que el usuario completa en el formulario */
export type TaskInput = Pick<Task, 'title' | 'description'>;

export type TaskPatch = Partial<TaskInput & Pick<Task, 'completed'>>;
```

- [ ] **Paso 2: `src/services/tasks.service.ts`**

```ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import type { Task, TaskInput, TaskPatch } from '@/types/task';
import { db } from './firebase';

const tasksCollection = collection(db, 'tasks');

function toTask(snapshot: QueryDocumentSnapshot): Task {
  // 'estimate': mientras el servidor no confirma, createdAt usa la hora local en vez de null.
  const data = snapshot.data({ serverTimestamps: 'estimate' });
  return {
    id: snapshot.id,
    userId: data.userId,
    title: data.title,
    description: data.description,
    completed: data.completed,
    createdAt: (data.createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
  };
}

/**
 * Escucha en tiempo real las tareas del usuario.
 * Se ordena en el cliente para no necesitar un índice compuesto (where + orderBy).
 */
export function subscribeToTasks(
  uid: string,
  onData: (tasks: Task[]) => void,
  onError: (error: Error) => void,
): () => void {
  const userTasks = query(tasksCollection, where('userId', '==', uid));
  return onSnapshot(
    userTasks,
    (snapshot) => onData(snapshot.docs.map(toTask).sort((a, b) => b.createdAt - a.createdAt)),
    onError,
  );
}

export async function createTask(uid: string, input: TaskInput): Promise<void> {
  await addDoc(tasksCollection, {
    userId: uid,
    title: input.title.trim(),
    description: input.description.trim(),
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const cleaned: TaskPatch = { ...patch };
  if (cleaned.title !== undefined) cleaned.title = cleaned.title.trim();
  if (cleaned.description !== undefined) cleaned.description = cleaned.description.trim();
  await updateDoc(doc(db, 'tasks', id), { ...cleaned, updatedAt: serverTimestamp() });
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', id));
}
```

- [ ] **Paso 3: Test que falla** — `tests/unit/useTasks.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@/types/task';

let emitData: (tasks: Task[]) => void = () => {};
let emitError: (error: Error) => void = () => {};
const unsubscribe = vi.fn();

vi.mock('@/services/tasks.service', () => ({
  subscribeToTasks: vi.fn((_uid: string, onData: typeof emitData, onError: typeof emitError) => {
    emitData = onData;
    emitError = onError;
    return unsubscribe;
  }),
  createTask: vi.fn().mockResolvedValue(undefined),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
}));

import * as service from '@/services/tasks.service';
import { useTasks } from '@/hooks/useTasks';

const task: Task = { id: 't1', userId: 'u1', title: 'Comprar yerba', description: '', completed: false, createdAt: 1 };

describe('useTasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('se suscribe con el uid y expone las tareas', () => {
    const { result } = renderHook(() => useTasks('u1'));
    expect(result.current.loading).toBe(true);
    expect(service.subscribeToTasks).toHaveBeenCalledWith('u1', expect.any(Function), expect.any(Function));

    act(() => emitData([task]));
    expect(result.current.loading).toBe(false);
    expect(result.current.tasks).toEqual([task]);
  });

  it('expone un mensaje de error si la suscripción falla', () => {
    const { result } = renderHook(() => useTasks('u1'));
    act(() => emitError(new Error('permission-denied')));
    expect(result.current.error).toBe('No pudimos cargar tus tareas. Revisa tu conexión e inténtalo de nuevo.');
    expect(result.current.loading).toBe(false);
  });

  it('delega las acciones CRUD al servicio', async () => {
    const { result } = renderHook(() => useTasks('u1'));
    await result.current.create({ title: 'Nueva', description: '' });
    await result.current.toggle('t1', true);
    await result.current.remove('t1');
    expect(service.createTask).toHaveBeenCalledWith('u1', { title: 'Nueva', description: '' });
    expect(service.updateTask).toHaveBeenCalledWith('t1', { completed: true });
    expect(service.deleteTask).toHaveBeenCalledWith('t1');
  });

  it('se desuscribe al desmontar', () => {
    const { unmount } = renderHook(() => useTasks('u1'));
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
```

Run: `npm test -- useTasks` → Expected: FAIL.

- [ ] **Paso 4: `src/hooks/useTasks.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { createTask, deleteTask, subscribeToTasks, updateTask } from '@/services/tasks.service';
import type { Task, TaskInput, TaskPatch } from '@/types/task';

export const LOAD_ERROR = 'No pudimos cargar tus tareas. Revisa tu conexión e inténtalo de nuevo.';

export function useTasks(uid: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    return subscribeToTasks(
      uid,
      (next) => {
        setTasks(next);
        setLoading(false);
      },
      () => {
        setError(LOAD_ERROR);
        setLoading(false);
      },
    );
  }, [uid, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const create = useCallback((input: TaskInput) => createTask(uid, input), [uid]);
  const update = useCallback((id: string, patch: TaskPatch) => updateTask(id, patch), []);
  const remove = useCallback((id: string) => deleteTask(id), []);
  const toggle = useCallback((id: string, completed: boolean) => updateTask(id, { completed }), []);

  return { tasks, loading, error, retry, create, update, remove, toggle };
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Paso 5: `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function ownsExisting() {
      return signedIn() && resource.data.userId == request.auth.uid;
    }

    function validTask(data) {
      return data.keys().hasOnly(['userId', 'title', 'description', 'completed', 'createdAt', 'updatedAt'])
        && data.title is string && data.title.size() > 0 && data.title.size() <= 80
        && data.description is string && data.description.size() <= 500
        && data.completed is bool;
    }

    match /tasks/{taskId} {
      allow read, delete: if ownsExisting();
      allow create: if signedIn()
        && request.resource.data.userId == request.auth.uid
        && validTask(request.resource.data);
      allow update: if ownsExisting()
        && request.resource.data.userId == resource.data.userId
        && validTask(request.resource.data);
    }
  }
}
```

- [ ] **Paso 6 (manual, autora): Publicar las reglas** — Firebase Console → Firestore → **Reglas** → pegar el contenido de `firestore.rules` → **Publicar**.

- [ ] **Paso 7: Commit**

```bash
git add -A
git commit -m "feat(tasks): servicio de Firestore, hook useTasks y reglas de seguridad" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 9: `TodoForm` (TDD)

**Files:**
- Create: `src/components/tasks/TodoForm.tsx`, `TodoForm.module.css`
- Test: `tests/components/TodoForm.test.tsx`

**Interfaces:**
- Consumes: `validateTask`, `hasErrors`, `TITLE_MAX`, `DESCRIPTION_MAX`, `Button`, `Field`, `fieldInputClass`, `Alert`, `TaskInput`.
- Produces: `TodoForm({ initialValues?, submitLabel?, onSubmit: (v: TaskInput) => Promise<void>, onCancel? })`. Si no hay `initialValues`, se limpia tras enviar con éxito. Si `onSubmit` rechaza, muestra "No pudimos guardar la tarea. Inténtalo de nuevo." y conserva lo escrito.

- [ ] **Paso 1: Test que falla** — `tests/components/TodoForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TodoForm } from '@/components/tasks/TodoForm';

describe('TodoForm', () => {
  it('no envía si el título está vacío y muestra el error', async () => {
    const onSubmit = vi.fn();
    render(<TodoForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía título y descripción y limpia el formulario', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TodoForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Llamar al proveedor');
    await userEvent.type(screen.getByLabelText('Descripción'), 'Pedir cotización');
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Llamar al proveedor', description: 'Pedir cotización' });
    expect(screen.getByLabelText('Título')).toHaveValue('');
  });

  it('en modo edición precarga valores y no se limpia', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TodoForm initialValues={{ title: 'Original', description: '' }} submitLabel="Guardar cambios" onSubmit={onSubmit} />);
    const title = screen.getByLabelText('Título');
    expect(title).toHaveValue('Original');
    await userEvent.clear(title);
    await userEvent.type(title, 'Editada');
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Editada', description: '' });
    expect(title).toHaveValue('Editada');
  });

  it('muestra un error y conserva lo escrito si falla el guardado', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('offline'));
    render(<TodoForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Tarea');
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar la tarea');
    expect(screen.getByLabelText('Título')).toHaveValue('Tarea');
  });
});
```

Run: `npm test -- TodoForm` → Expected: FAIL.

- [ ] **Paso 2: `src/components/tasks/TodoForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import type { TaskInput } from '@/types/task';
import { DESCRIPTION_MAX, TITLE_MAX, hasErrors, validateTask, type FieldErrors } from '@/utils/validators';
import styles from './TodoForm.module.css';

type TodoFormProps = {
  initialValues?: TaskInput;
  submitLabel?: string;
  onSubmit: (values: TaskInput) => Promise<void>;
  onCancel?: () => void;
};

const EMPTY: TaskInput = { title: '', description: '' };

export function TodoForm({ initialValues, submitLabel = 'Agregar tarea', onSubmit, onCancel }: TodoFormProps) {
  const [values, setValues] = useState<TaskInput>(initialValues ?? EMPTY);
  const [errors, setErrors] = useState<FieldErrors<'title' | 'description'>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateTask(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit({ title: values.title.trim(), description: values.description.trim() });
      if (!initialValues) setValues(EMPTY);
    } catch {
      setSubmitError('No pudimos guardar la tarea. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {submitError && <Alert kind="error">{submitError}</Alert>}
      <Field id="task-title" label="Título" error={errors.title}>
        <input
          id="task-title" className={fieldInputClass} maxLength={TITLE_MAX + 20}
          value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'task-title-error' : undefined}
        />
      </Field>
      <Field id="task-description" label="Descripción" error={errors.description}>
        <textarea
          id="task-description" className={fieldInputClass}
          value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'task-description-error' : undefined}
        />
      </Field>
      <p className={styles.counter}>{values.description.length}/{DESCRIPTION_MAX}</p>
      <div className={styles.actions}>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
```

`TodoForm.module.css`:

```css
.form { display: flex; flex-direction: column; gap: var(--space-3); }
.counter { align-self: flex-end; margin-top: calc(-1 * var(--space-2)); font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text-muted); }
.actions { display: flex; flex-direction: column-reverse; gap: var(--space-2); }

@media (min-width: 640px) {
  .actions { flex-direction: row; justify-content: flex-end; }
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Paso 3: Commit**

```bash
git add -A
git commit -m "feat(tasks): formulario TodoForm para crear y editar tareas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 10: `TodoList` y `TodoItem` (TDD)

**Files:**
- Create: `src/components/tasks/TodoItem.tsx`, `TodoItem.module.css`, `TodoList.tsx`, `TodoList.module.css`
- Test: `tests/components/TodoList.test.tsx`

**Interfaces:**
- Consumes: `Task`, `Button`.
- Produces:
  - `TodoItem({ task, onToggle(id, completed), onEdit(task), onDelete(id) })` — eliminar pide confirmación inline.
  - `TodoList({ tasks, onToggle, onEdit, onDelete })` — muestra "Todavía no tienes tareas" si está vacía.

- [ ] **Paso 1: Test que falla** — `tests/components/TodoList.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TodoList } from '@/components/tasks/TodoList';
import type { Task } from '@/types/task';

const tasks: Task[] = [
  { id: '1', userId: 'u', title: 'Comprar yerba', description: 'Dos kilos', completed: false, createdAt: 2 },
  { id: '2', userId: 'u', title: 'Pagar luz', description: '', completed: true, createdAt: 1 },
];

function setup(list: Task[] = tasks) {
  const handlers = { onToggle: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  render(<TodoList tasks={list} {...handlers} />);
  return handlers;
}

describe('TodoList', () => {
  it('muestra cada tarea con su estado', () => {
    setup();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Dos kilos')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /completar "pagar luz"/i })).toBeChecked();
  });

  it('muestra un estado vacío', () => {
    setup([]);
    expect(screen.getByText('Todavía no tienes tareas')).toBeInTheDocument();
  });

  it('marca una tarea como completada', async () => {
    const { onToggle } = setup();
    await userEvent.click(screen.getByRole('checkbox', { name: /completar "comprar yerba"/i }));
    expect(onToggle).toHaveBeenCalledWith('1', true);
  });

  it('pide editar la tarea', async () => {
    const { onEdit } = setup();
    await userEvent.click(screen.getByRole('button', { name: /editar "comprar yerba"/i }));
    expect(onEdit).toHaveBeenCalledWith(tasks[0]);
  });

  it('pide confirmación antes de eliminar', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: /eliminar "comprar yerba"/i }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /sí, eliminar/i }));
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('permite cancelar la eliminación', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: /eliminar "comprar yerba"/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /eliminar "comprar yerba"/i })).toBeInTheDocument();
  });
});
```

Run: `npm test -- TodoList` → Expected: FAIL.

- [ ] **Paso 2: `src/components/tasks/TodoItem.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Task } from '@/types/task';
import styles from './TodoItem.module.css';

export type TodoItemHandlers = {
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
};

type TodoItemProps = TodoItemHandlers & { task: Task };

export function TodoItem({ task, onToggle, onEdit, onDelete }: TodoItemProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className={`${styles.item} ${task.completed ? styles.completed : ''}`}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={task.completed}
        onChange={(e) => onToggle(task.id, e.target.checked)}
        aria-label={`Completar "${task.title}"`}
      />
      <div className={styles.body}>
        <h3 className={styles.title}>{task.title}</h3>
        {task.description && <p className={styles.description}>{task.description}</p>}
      </div>
      <div className={styles.actions}>
        {confirming ? (
          <>
            <span className={styles.confirmText}>¿Eliminar?</span>
            <Button size="sm" variant="danger" onClick={() => onDelete(task.id)}>Sí, eliminar</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => onEdit(task)} aria-label={`Editar "${task.title}"`}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label={`Eliminar "${task.title}"`}>Eliminar</Button>
          </>
        )}
      </div>
    </li>
  );
}
```

`TodoItem.module.css`:

```css
.item {
  display: grid; grid-template-columns: auto 1fr; gap: var(--space-2) var(--space-3);
  padding: var(--space-4); background: var(--color-surface-default);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-lg);
}
.checkbox { width: 20px; height: 20px; margin-top: 2px; accent-color: var(--color-status-success); cursor: pointer; }
.body { min-width: 0; }
.title { font-size: var(--text-xl); font-weight: var(--weight-medium); overflow-wrap: anywhere; }
.description { margin-top: var(--space-1); color: var(--color-text-secondary); white-space: pre-wrap; overflow-wrap: anywhere; }
.completed .title { text-decoration: line-through; color: var(--color-text-muted); }
.completed .description { color: var(--color-text-muted); }
.actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--space-1); }
.confirmText { margin-right: auto; font-size: var(--text-md); color: var(--color-status-danger); }

@media (min-width: 640px) {
  .item { grid-template-columns: auto 1fr auto; align-items: start; }
  .actions { grid-column: auto; }
}
```

- [ ] **Paso 3: `src/components/tasks/TodoList.tsx`**

```tsx
import type { Task } from '@/types/task';
import { TodoItem, type TodoItemHandlers } from './TodoItem';
import styles from './TodoList.module.css';

type TodoListProps = TodoItemHandlers & { tasks: Task[] };

export function TodoList({ tasks, ...handlers }: TodoListProps) {
  if (tasks.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Todavía no tienes tareas</p>
        <p>Crea la primera con el formulario.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {tasks.map((task) => (
        <TodoItem key={task.id} task={task} {...handlers} />
      ))}
    </ul>
  );
}
```

`TodoList.module.css`:

```css
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.empty {
  padding: var(--space-10) var(--space-4); text-align: center; color: var(--color-text-secondary);
  border: 1px dashed var(--color-border-strong); border-radius: var(--radius-lg);
}
.emptyTitle { font-weight: var(--weight-semibold); color: var(--color-text-primary); }
```

Run: `npm test` → Expected: PASS.

- [ ] **Paso 4: Commit**

```bash
git add -A
git commit -m "feat(tasks): lista de tareas con completar, editar y eliminar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 11: `TasksPage` con Modal y Toast

**Files:**
- Create: `src/components/ui/Modal.tsx`, `Modal.module.css`, `Toast.tsx`, `Toast.module.css`, `src/pages/TasksPage.module.css`
- Modify: `src/pages/TasksPage.tsx`
- Test: `tests/components/Toast.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useTasks`, `TodoForm`, `TodoList`, `Spinner`, `Alert`, `Button`.
- Produces:
  - `Modal({ title, onClose, children })` — usa `<dialog>` nativo, cierra con Escape.
  - `type ToastMessage = { kind: 'success' | 'error'; message: string; action?: { label: string; onClick: () => void } }`
  - `Toast({ toast, onDismiss })` — se oculta solo a los 5 s.
  - `TasksPage` expone un slot en el header para el botón de email (Tarea 16).

- [ ] **Paso 1: Test que falla** — `tests/components/Toast.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toast } from '@/components/ui/Toast';

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('se oculta solo después de 5 segundos', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast toast={{ kind: 'success', message: 'Listo' }} onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toHaveTextContent('Listo');
    act(() => vi.advanceTimersByTime(5000));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('ejecuta la acción opcional (p. ej. reintentar)', async () => {
    const onClick = vi.fn();
    render(<Toast toast={{ kind: 'error', message: 'Falló', action: { label: 'Reintentar', onClick } }} onDismiss={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onClick).toHaveBeenCalled();
  });
});
```

Run: `npm test -- Toast` → Expected: FAIL.

- [ ] **Paso 2: `src/components/ui/Toast.tsx` + CSS**

```tsx
import { useEffect } from 'react';
import styles from './Toast.module.css';

export type ToastMessage = {
  kind: 'success' | 'error';
  message: string;
  action?: { label: string; onClick: () => void };
};

const DURATION_MS = 5000;

export function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div role={toast.kind === 'error' ? 'alert' : 'status'} className={`${styles.toast} ${styles[toast.kind]}`}>
      <span>{toast.message}</span>
      {toast.action && (
        <button type="button" className={styles.action} onClick={toast.action.onClick}>{toast.action.label}</button>
      )}
      <button type="button" className={styles.close} onClick={onDismiss} aria-label="Cerrar aviso">×</button>
    </div>
  );
}
```

Nota: el test usa `role="status"` para `success`; para `error` se usa `alert` y el test busca el botón por nombre, así que ambos casos quedan cubiertos.

```css
.toast {
  position: fixed; left: var(--space-4); right: var(--space-4); bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
  display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
  background: var(--color-surface-inverse); color: var(--color-text-inverse); z-index: 20;
}
.error { background: var(--color-status-danger); }
.action { margin-left: auto; background: none; border: 0; color: inherit; font-weight: var(--weight-semibold); text-decoration: underline; cursor: pointer; }
.close { background: none; border: 0; color: inherit; font-size: var(--text-3xl); line-height: 1; cursor: pointer; }
.toast > span { flex: 1; }

@media (min-width: 640px) {
  .toast { left: auto; max-width: 420px; }
}
```

- [ ] **Paso 3: `src/components/ui/Modal.tsx` + CSS**

```tsx
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

type ModalProps = { title: string; onClose: () => void; children: ReactNode };

export function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal?.();
  }, []);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="modal-title" onClose={onClose} onCancel={onClose}>
      <header className={styles.header}>
        <h2 id="modal-title" className={styles.title}>{title}</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      {children}
    </dialog>
  );
}
```

(`showModal?.()` porque jsdom no implementa `showModal`.)

```css
.dialog {
  width: calc(100% - var(--space-8)); max-width: 520px; padding: var(--space-6);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
}
.dialog::backdrop { background: rgba(20, 21, 26, 0.45); }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
.title { font-size: var(--text-3xl); font-weight: var(--weight-semibold); }
.close { background: none; border: 0; font-size: var(--text-4xl); line-height: 1; cursor: pointer; color: var(--color-text-secondary); }
```

- [ ] **Paso 4: `src/pages/TasksPage.tsx` (versión completa)**

```tsx
import { useCallback, useState } from 'react';
import { TodoForm } from '@/components/tasks/TodoForm';
import { TodoList } from '@/components/tasks/TodoList';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import type { AppUser } from '@/types/auth';
import type { Task, TaskInput } from '@/types/task';
import styles from './TasksPage.module.css';

export function TasksPage() {
  const { user, logout } = useAuth();
  // ProtectedRoute garantiza que hay usuario.
  return <TasksView user={user as AppUser} onLogout={logout} />;
}

function TasksView({ user, onLogout }: { user: AppUser; onLogout: () => Promise<void> }) {
  const { tasks, loading, error, retry, create, update, remove, toggle } = useTasks(user.uid);
  const [editing, setEditing] = useState<Task | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const pending = tasks.filter((t) => !t.completed).length;

  async function safely(action: () => Promise<void>, success?: string) {
    try {
      await action();
      if (success) setToast({ kind: 'success', message: success });
    } catch {
      setToast({ kind: 'error', message: 'No pudimos guardar el cambio. Inténtalo de nuevo.' });
    }
  }

  async function handleEdit(values: TaskInput) {
    if (!editing) return;
    await update(editing.id, values); // si falla, TodoForm muestra el error
    setEditing(null);
    setToast({ kind: 'success', message: 'Tarea actualizada.' });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>MateCode <span>Tasks</span></p>
          <h1 className={styles.greeting}>Hola, {user.displayName || user.email}</h1>
          {!loading && !error && (
            <p className={styles.summary}>{pending} pendientes · {tasks.length - pending} completadas</p>
          )}
        </div>
        <div className={styles.headerActions}>
          {/* Tarea 16: SendSummaryButton va acá */}
          <Button variant="secondary" size="sm" onClick={() => void onLogout()}>Cerrar sesión</Button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="new-task-title">
          <h2 id="new-task-title" className={styles.sectionTitle}>Nueva tarea</h2>
          <TodoForm onSubmit={async (values) => {
            await create(values);
            setToast({ kind: 'success', message: 'Tarea creada.' });
          }} />
        </section>

        <section aria-labelledby="list-title">
          <h2 id="list-title" className={styles.sectionTitle}>Mis tareas</h2>
          {loading && <Spinner label="Cargando tareas…" />}
          {error && (
            <Alert kind="error">
              {error} <Button size="sm" variant="ghost" onClick={retry}>Reintentar</Button>
            </Alert>
          )}
          {!loading && !error && (
            <TodoList
              tasks={tasks}
              onToggle={(id, completed) => void safely(() => toggle(id, completed))}
              onEdit={setEditing}
              onDelete={(id) => void safely(() => remove(id), 'Tarea eliminada.')}
            />
          )}
        </section>
      </main>

      {editing && (
        <Modal title="Editar tarea" onClose={() => setEditing(null)}>
          <TodoForm
            initialValues={{ title: editing.title, description: editing.description }}
            submitLabel="Guardar cambios"
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </div>
  );
}
```

`src/pages/TasksPage.module.css`:

```css
.page { min-height: 100dvh; }
.header {
  display: flex; flex-direction: column; gap: var(--space-4);
  padding: var(--space-5) var(--space-4); background: var(--color-surface-default);
  border-bottom: 1px solid var(--color-border-default);
}
.brand { font-size: var(--text-md); font-weight: var(--weight-semibold); }
.brand span { font-weight: var(--weight-regular); color: var(--color-text-secondary); }
.greeting { margin-top: var(--space-2); font-size: var(--text-3xl); font-weight: var(--weight-semibold); }
.summary { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-text-secondary); }
.headerActions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.main { display: flex; flex-direction: column; gap: var(--space-6); padding: var(--space-5) var(--space-4) var(--space-12); }
.card { padding: var(--space-4); background: var(--color-surface-default); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg); }
.sectionTitle { margin-bottom: var(--space-3); font-size: var(--text-sm); font-weight: var(--weight-semibold); letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-text-muted); }

@media (min-width: 640px) {
  .header { flex-direction: row; justify-content: space-between; align-items: flex-end; padding: var(--space-6) var(--space-8); }
  .main { max-width: 760px; margin: 0 auto; padding: var(--space-8); }
}

@media (min-width: 1024px) {
  .main { max-width: 1080px; display: grid; grid-template-columns: 360px 1fr; align-items: start; }
  .card { position: sticky; top: var(--space-6); }
}
```

- [ ] **Paso 5: Verificar** — `npm test` → PASS. `npm run build` → OK.

- [ ] **Paso 6: Prueba manual** (`npm run dev`)
  - Crear, editar, completar y eliminar una tarea; la lista se actualiza sola.
  - Abrir la app en otra pestaña: los cambios aparecen en ambas (onSnapshot).
  - Crear otra cuenta: no ve las tareas de la primera.
  - Vista móvil (375px) y escritorio.

- [ ] **Paso 7: Commit**

```bash
git add -A
git commit -m "feat(tasks): página de tareas con edición en modal y avisos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Paso 8: AI_LOG** — entrada "Fase 3 — CRUD" y commit `docs: registrar uso de IA en el CRUD`.

---

## FASE 4 — Deploy temprano

### Tarea 12: Deploy a Vercel

**Files:**
- Create: `vercel.json`

- [ ] **Paso 1: `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

(Sin esto, recargar en `/tasks` da 404: Vercel busca un archivo `/tasks` que no existe.)

- [ ] **Paso 2: Commit**

```bash
git add vercel.json
git commit -m "chore(deploy): configurar rewrites de SPA para Vercel" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Paso 3: Vincular el proyecto** — `vercel link` → crear proyecto nuevo `matecode-tasks` (framework Vite detectado).

- [ ] **Paso 4 (autora): Variables en Vercel** — por cada `VITE_FIREBASE_*` de `.env`:

```bash
vercel env add VITE_FIREBASE_API_KEY production
```

(o en el dashboard: Project → Settings → Environment Variables, entornos Production y Preview). La autora pega los valores; no pasan por el chat.

- [ ] **Paso 5: Deploy** — `vercel --prod`. Anotar la URL (p. ej. `https://matecode-tasks.vercel.app`).

- [ ] **Paso 6 (autora): Dominio autorizado** — Firebase Console → Authentication → **Settings → Authorized domains** → agregar el dominio de Vercel (sin `https://`).

- [ ] **Paso 7: Probar en producción** — registrarse, login con Google, CRUD, recargar en `/tasks`, probar desde el celular.

---

## FASE 5 — Email con AWS SES

### Tarea 13 (manual, autora): Configurar AWS SES y la service account

Hacerlo lo antes posible (idealmente el día 1).

- [ ] **Paso 1: SES** — Consola AWS → región `us-east-1` (o la elegida; debe coincidir con `SES_AWS_REGION`) → **Amazon SES → Identities → Create identity → Email address** → tu email → confirmar el link recibido. En sandbox, esta identidad sirve como remitente y destinatario.
- [ ] **Paso 2: IAM** — **IAM → Users → Create user** `matecode-ses-sender` (sin acceso a consola) → **Attach policies directly → Create policy** (JSON):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": "ses:SendEmail", "Resource": "*" }
  ]
}
```

Nombre `MateCodeSesSendOnly`. Luego el usuario → **Security credentials → Create access key → Application running outside AWS** → guardar `Access key ID` y `Secret` en `.env` (`SES_AWS_ACCESS_KEY_ID`, `SES_AWS_SECRET_ACCESS_KEY`), `SES_AWS_REGION`, `SES_FROM_EMAIL`.
- [ ] **Paso 3: Service account de Firebase** — Firebase Console → ⚙️ → **Cuentas de servicio → Generar nueva clave privada** → descarga un JSON. Copiar `project_id`, `client_email` y `private_key` a `FIREBASE_ADMIN_*` en `.env` (la clave entre comillas dobles, tal como está con `\n`). **Borrar el JSON descargado** o guardarlo fuera del proyecto. `APP_URL` = URL de producción.
- [ ] **Paso 4:** Confirmar `git status` → `.env` no aparece.

---

### Tarea 14: Plantilla del email (TDD)

**Files:**
- Create: `functions/summaryEmail.ts`, `src/types/api.ts`
- Test: `tests/server/summaryEmail.test.ts`

**Interfaces:**
- Produces:
  - `type SummaryTask = { title: string; description: string; completed: boolean }`
  - `type Summary = { total: number; pending: number; completed: number }`
  - `buildSummary(tasks: SummaryTask[]): Summary`
  - `escapeHtml(value: string): string`
  - `renderSummaryEmail(input: { name: string; tasks: SummaryTask[]; date: Date; appUrl: string }): { subject: string; html: string; text: string }`
  - `src/types/api.ts`: `SendSummaryErrorCode`, `SendSummaryResponse`

- [ ] **Paso 1: `src/types/api.ts`**

```ts
export type SendSummaryErrorCode =
  | 'method_not_allowed'
  | 'unauthorized'
  | 'missing_email'
  | 'email_failed'
  | 'internal_error';

export type SendSummaryResponse =
  | { ok: true; messageId: string; to: string }
  | { ok: false; code: SendSummaryErrorCode; message: string };
```

- [ ] **Paso 2: Test que falla** — `tests/server/summaryEmail.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildSummary, escapeHtml, renderSummaryEmail } from '../../functions/summaryEmail';

const tasks = [
  { title: 'Llamar al proveedor', description: '', completed: false },
  { title: 'Ordenar facturas', description: 'Agosto', completed: true },
  { title: 'Cotizar <b>envío</b>', description: '', completed: false },
];

describe('buildSummary', () => {
  it('cuenta total, pendientes y completadas', () => {
    expect(buildSummary(tasks)).toEqual({ total: 3, pending: 2, completed: 1 });
  });

  it('funciona con lista vacía', () => {
    expect(buildSummary([])).toEqual({ total: 0, pending: 0, completed: 0 });
  });
});

describe('escapeHtml', () => {
  it('escapa caracteres peligrosos', () => {
    expect(escapeHtml(`<script>"a" & 'b'</script>`)).toBe('&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;');
  });
});

describe('renderSummaryEmail', () => {
  const email = renderSummaryEmail({
    name: 'Ana',
    tasks,
    date: new Date('2026-09-28T18:00:00Z'),
    appUrl: 'https://matecode-tasks.vercel.app',
  });

  it('arma el asunto con los totales', () => {
    expect(email.subject).toBe('Tu resumen de tareas: 2 pendientes, 1 completada');
  });

  it('incluye saludo, totales, tareas y link en el HTML', () => {
    expect(email.html).toContain('Hola Ana');
    expect(email.html).toContain('Llamar al proveedor');
    expect(email.html).toContain('Ordenar facturas');
    expect(email.html).toContain('https://matecode-tasks.vercel.app/tasks');
  });

  it('escapa el contenido escrito por el usuario', () => {
    expect(email.html).toContain('Cotizar &lt;b&gt;envío&lt;/b&gt;');
    expect(email.html).not.toContain('<b>envío</b>');
  });

  it('genera versión de texto plano', () => {
    expect(email.text).toContain('Pendientes (2)');
    expect(email.text).toContain('- Llamar al proveedor');
    expect(email.text).toContain('Completadas (1)');
  });

  it('muestra un mensaje si no hay tareas', () => {
    const empty = renderSummaryEmail({ name: 'Ana', tasks: [], date: new Date(), appUrl: 'https://x.app' });
    expect(empty.html).toContain('No tienes tareas todavía');
  });
});
```

Run: `npm test -- summaryEmail` → Expected: FAIL.

- [ ] **Paso 3: `functions/summaryEmail.ts`** (HTML basado en `../email-resumen.html`, versión núcleo sin "vencidas")

```ts
export type SummaryTask = { title: string; description: string; completed: boolean };
export type Summary = { total: number; pending: number; completed: number };

/** Zona horaria para la fecha del email (la función corre en UTC). */
const TIME_ZONE = 'America/Mexico_City';

const FONT = "'IBM Plex Sans',Arial,sans-serif";

export function buildSummary(tasks: SummaryTask[]): Summary {
  const completed = tasks.filter((t) => t.completed).length;
  return { total: tasks.length, pending: tasks.length - completed, completed };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plural(n: number, singular: string, pluralWord: string): string {
  return `${n} ${n === 1 ? singular : pluralWord}`;
}

function statCell(value: number, label: string, color: string, first = false): string {
  const border = first ? '' : 'border-left:1px solid #EDEDE9;';
  return `<td width="33%" style="padding:14px 16px;${border}"><div style="font-size:22px;font-weight:600;color:${color};">${value}</div><div style="font-size:12px;color:#55554E;">${label}</div></td>`;
}

function sectionTitle(label: string): string {
  return `<tr><td style="padding:28px 32px 8px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8A8A81;">${label}</td></tr>`;
}

function taskRows(tasks: SummaryTask[], done: boolean): string {
  const rows = tasks
    .map((t) => {
      const title = escapeHtml(t.title);
      return done
        ? `<tr><td style="padding:10px 0;border-top:1px solid #EDEDE9;font-size:14px;color:#8A8A81;text-decoration:line-through;">${title}</td><td align="right" style="padding:10px 0;border-top:1px solid #EDEDE9;font-size:12px;color:#157F4A;">✓</td></tr>`
        : `<tr><td colspan="2" style="padding:12px 0;border-top:1px solid #EDEDE9;font-size:14px;color:#14151A;">${title}${t.description ? `<br><span style="font-size:12px;color:#8A8A81;">${escapeHtml(t.description)}</span>` : ''}</td></tr>`;
    })
    .join('');
  return `<tr><td style="padding:0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT};">${rows}</table></td></tr>`;
}

export function renderSummaryEmail(input: {
  name: string;
  tasks: SummaryTask[];
  date: Date;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { name, tasks, date, appUrl } = input;
  const summary = buildSummary(tasks);
  const pendingTasks = tasks.filter((t) => !t.completed);
  const doneTasks = tasks.filter((t) => t.completed);
  const dateLabel = new Intl.DateTimeFormat('es', { dateStyle: 'long', timeZone: TIME_ZONE }).format(date);
  const tasksUrl = `${appUrl.replace(/\/$/, '')}/tasks`;
  const safeName = escapeHtml(name);

  const subject = `Tu resumen de tareas: ${plural(summary.pending, 'pendiente', 'pendientes')}, ${plural(summary.completed, 'completada', 'completadas')}`;

  const body =
    summary.total === 0
      ? `<tr><td style="padding:24px 32px 0;font-family:${FONT};font-size:14px;color:#55554E;">No tienes tareas todavía. ¡Crea la primera desde la app!</td></tr>`
      : [
          pendingTasks.length ? sectionTitle('Pendientes') + taskRows(pendingTasks, false) : '',
          doneTasks.length ? sectionTitle('Completadas') + taskRows(doneTasks, true) : '',
        ].join('');

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Resumen de tareas</title></head>
<body style="margin:0;padding:0;background:#F6F6F4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F6F4;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E3E3DE;border-radius:12px;">
<tr><td style="padding:28px 32px 8px;font-family:${FONT};font-size:14px;font-weight:600;color:#14151A;">MateCode <span style="font-weight:400;color:#55554E;">Tasks</span></td></tr>
<tr><td style="padding:20px 32px 0;font-family:${FONT};"><h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;font-weight:600;color:#14151A;">Hola ${safeName}, este es tu resumen</h1><p style="margin:0;font-size:14px;line-height:1.55;color:#55554E;">Estado de tus tareas al ${dateLabel}.</p></td></tr>
<tr><td style="padding:24px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E3E3DE;border-radius:8px;font-family:${FONT};"><tr>${statCell(summary.total, 'Total', '#14151A', true)}${statCell(summary.pending, 'Pendientes', '#14151A')}${statCell(summary.completed, 'Completadas', '#157F4A')}</tr></table></td></tr>
${body}
<tr><td style="padding:28px 32px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#14151A;border-radius:8px;"><a href="${escapeHtml(tasksUrl)}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:14px;font-weight:500;color:#F6F6F4;text-decoration:none;">Abrir mis tareas</a></td></tr></table></td></tr>
</table>
<p style="max-width:560px;padding:16px 32px;margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:#8A8A81;">Recibiste este email porque lo solicitaste desde MateCode Tasks. Enviado con AWS SES.</p>
</td></tr></table>
</body></html>`;

  const text = [
    `Hola ${name}, este es tu resumen de tareas al ${dateLabel}.`,
    '',
    `Total: ${summary.total} · Pendientes: ${summary.pending} · Completadas: ${summary.completed}`,
    '',
    ...(summary.total === 0 ? ['No tienes tareas todavía.'] : []),
    ...(pendingTasks.length ? [`Pendientes (${pendingTasks.length})`, ...pendingTasks.map((t) => `- ${t.title}`), ''] : []),
    ...(doneTasks.length ? [`Completadas (${doneTasks.length})`, ...doneTasks.map((t) => `- ${t.title}`), ''] : []),
    `Abrir mis tareas: ${tasksUrl}`,
  ].join('\n');

  return { subject, html, text };
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Paso 4: Verificar tipos del servidor** — `npx tsc -p tsconfig.server.json` → sin errores.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat(email): plantilla HTML y texto del resumen de tareas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 15: Handler `send-summary` con dependencias inyectadas (TDD) + conexión real

**Files:**
- Create: `functions/sendSummary.ts`, `functions/env.ts`, `functions/firebaseAdmin.ts`, `functions/ses.ts`, `api/send-summary.ts`
- Test: `tests/server/sendSummary.test.ts`

**Interfaces:**
- Consumes: `renderSummaryEmail`, `SummaryTask` (Tarea 14), `SendSummaryResponse` (Tarea 14).
- Produces:
  - `type SendSummaryDeps = { verifyIdToken(token: string): Promise<{ uid: string; email?: string; name?: string }>; getTasksForUser(uid: string): Promise<SummaryTask[]>; sendEmail(msg: EmailMessage): Promise<string>; appUrl: string; now?: () => Date }`
  - `type EmailMessage = { to: string; subject: string; html: string; text: string }`
  - `createSendSummaryHandler(deps): (request: Request) => Promise<Response>`
  - Endpoint `POST /api/send-summary` → `SendSummaryResponse`

- [ ] **Paso 1: Instalar dependencias del servidor**

```bash
npm install firebase-admin @aws-sdk/client-sesv2
```

- [ ] **Paso 2: Test que falla** — `tests/server/sendSummary.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createSendSummaryHandler, type SendSummaryDeps } from '../../functions/sendSummary';

function makeDeps(overrides: Partial<SendSummaryDeps> = {}): SendSummaryDeps {
  return {
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1', email: 'ana@mail.com', name: 'Ana' }),
    getTasksForUser: vi.fn().mockResolvedValue([{ title: 'Tarea', description: '', completed: false }]),
    sendEmail: vi.fn().mockResolvedValue('msg-123'),
    appUrl: 'https://app.test',
    now: () => new Date('2026-09-28T18:00:00Z'),
    ...overrides,
  };
}

function post(token?: string) {
  return new Request('https://app.test/api/send-summary', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe('send-summary handler', () => {
  it('rechaza métodos distintos de POST con 405', async () => {
    const handler = createSendSummaryHandler(makeDeps());
    const res = await handler(new Request('https://app.test/api/send-summary', { method: 'GET' }));
    expect(res.status).toBe(405);
    expect(await res.json()).toMatchObject({ ok: false, code: 'method_not_allowed' });
  });

  it('responde 401 sin token', async () => {
    const deps = makeDeps();
    const res = await createSendSummaryHandler(deps)(post());
    expect(res.status).toBe(401);
    expect(deps.verifyIdToken).not.toHaveBeenCalled();
  });

  it('responde 401 si el token es inválido', async () => {
    const deps = makeDeps({ verifyIdToken: vi.fn().mockRejectedValue(new Error('expired')) });
    const res = await createSendSummaryHandler(deps)(post('malo'));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, code: 'unauthorized' });
  });

  it('responde 400 si el usuario no tiene email', async () => {
    const deps = makeDeps({ verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1' }) });
    const res = await createSendSummaryHandler(deps)(post('ok'));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'missing_email' });
  });

  it('lee las tareas del uid del token y envía el email a su dirección', async () => {
    const deps = makeDeps();
    const res = await createSendSummaryHandler(deps)(post('ok'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, messageId: 'msg-123', to: 'ana@mail.com' });
    expect(deps.verifyIdToken).toHaveBeenCalledWith('ok');
    expect(deps.getTasksForUser).toHaveBeenCalledWith('u1');
    expect(deps.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ana@mail.com', subject: expect.stringContaining('1 pendiente') }),
    );
  });

  it('responde 502 si SES falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = makeDeps({ sendEmail: vi.fn().mockRejectedValue(new Error('MessageRejected')) });
    const res = await createSendSummaryHandler(deps)(post('ok'));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: 'email_failed' });
  });

  it('responde 500 si falla la lectura de tareas', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = makeDeps({ getTasksForUser: vi.fn().mockRejectedValue(new Error('firestore down')) });
    const res = await createSendSummaryHandler(deps)(post('ok'));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ code: 'internal_error' });
  });
});
```

Run: `npm test -- sendSummary` → Expected: FAIL.

- [ ] **Paso 3: `functions/sendSummary.ts`**

```ts
import type { SendSummaryErrorCode, SendSummaryResponse } from '../src/types/api';
import { renderSummaryEmail, type SummaryTask } from './summaryEmail';

export type EmailMessage = { to: string; subject: string; html: string; text: string };

/**
 * Las dependencias se inyectan para poder testear el handler sin Firebase ni AWS reales.
 * api/send-summary.ts le pasa las implementaciones reales.
 */
export type SendSummaryDeps = {
  verifyIdToken: (token: string) => Promise<{ uid: string; email?: string; name?: string }>;
  getTasksForUser: (uid: string) => Promise<SummaryTask[]>;
  sendEmail: (message: EmailMessage) => Promise<string>;
  appUrl: string;
  now?: () => Date;
};

function json(status: number, body: SendSummaryResponse): Response {
  return Response.json(body, { status });
}

function fail(status: number, code: SendSummaryErrorCode, message: string): Response {
  return json(status, { ok: false, code, message });
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

export function createSendSummaryHandler(deps: SendSummaryDeps) {
  const now = deps.now ?? (() => new Date());

  return async function handleSendSummary(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return fail(405, 'method_not_allowed', 'Método no permitido.');
    }

    const token = readBearerToken(request);
    if (!token) return fail(401, 'unauthorized', 'Inicia sesión para enviar el resumen.');

    let user: Awaited<ReturnType<SendSummaryDeps['verifyIdToken']>>;
    try {
      user = await deps.verifyIdToken(token);
    } catch {
      return fail(401, 'unauthorized', 'Tu sesión expiró. Vuelve a iniciar sesión.');
    }

    if (!user.email) return fail(400, 'missing_email', 'Tu cuenta no tiene un email asociado.');

    let tasks: SummaryTask[];
    try {
      tasks = await deps.getTasksForUser(user.uid);
    } catch (error) {
      console.error('send-summary: error leyendo tareas', error);
      return fail(500, 'internal_error', 'No pudimos leer tus tareas. Inténtalo de nuevo.');
    }

    const email = renderSummaryEmail({ name: user.name || user.email, tasks, date: now(), appUrl: deps.appUrl });

    try {
      const messageId = await deps.sendEmail({ to: user.email, ...email });
      return json(200, { ok: true, messageId, to: user.email });
    } catch (error) {
      console.error('send-summary: error de SES', error);
      return fail(502, 'email_failed', 'No pudimos enviar el email. Inténtalo más tarde.');
    }
  };
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Paso 4: `functions/env.ts`**

```ts
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}
```

- [ ] **Paso 5: `functions/firebaseAdmin.ts`**

```ts
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireEnv } from './env';
import type { SummaryTask } from './summaryEmail';

function getAdminApp(): App {
  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: requireEnv('FIREBASE_ADMIN_PROJECT_ID'),
        clientEmail: requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL'),
        // Las variables de entorno guardan los saltos de línea como "\n" literales.
        privateKey: requireEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    })
  );
}

export async function verifyIdToken(token: string) {
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email, name: decoded.name as string | undefined };
}

export async function getTasksForUser(uid: string): Promise<SummaryTask[]> {
  const snapshot = await getFirestore(getAdminApp()).collection('tasks').where('userId', '==', uid).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { title: String(data.title), description: String(data.description ?? ''), completed: Boolean(data.completed) };
  });
}
```

- [ ] **Paso 6: `functions/ses.ts`**

```ts
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { requireEnv } from './env';
import type { EmailMessage } from './sendSummary';

let client: SESv2Client | undefined;

function getClient(): SESv2Client {
  client ??= new SESv2Client({
    region: requireEnv('SES_AWS_REGION'),
    credentials: {
      accessKeyId: requireEnv('SES_AWS_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('SES_AWS_SECRET_ACCESS_KEY'),
    },
  });
  return client;
}

export async function sendEmail({ to, subject, html, text }: EmailMessage): Promise<string> {
  const result = await getClient().send(
    new SendEmailCommand({
      FromEmailAddress: requireEnv('SES_FROM_EMAIL'),
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: html, Charset: 'UTF-8' }, Text: { Data: text, Charset: 'UTF-8' } },
        },
      },
    }),
  );
  return result.MessageId ?? '';
}
```

- [ ] **Paso 7: `api/send-summary.ts`**

```ts
import { getTasksForUser, verifyIdToken } from '../functions/firebaseAdmin';
import { createSendSummaryHandler } from '../functions/sendSummary';
import { sendEmail } from '../functions/ses';

const handler = createSendSummaryHandler({
  verifyIdToken,
  getTasksForUser,
  sendEmail,
  appUrl: process.env.APP_URL ?? '',
});

// Vercel Functions (runtime Node) aceptan exports por método HTTP con Request/Response web estándar.
// Otros métodos reciben 405 automáticamente.
export function POST(request: Request): Promise<Response> {
  return handler(request);
}
```

Si la versión de Vercel no reconoce exports por método, consultar la doc de Vercel Functions (context7) y usar el formato que indique (p. ej. `export default { fetch: handler }`); anotar en `AI_LOG.md`.

- [ ] **Paso 8: Verificar** — `npm test` → PASS. `npx tsc -p tsconfig.server.json` → OK. `npm run build` → OK.

- [ ] **Paso 9: Prueba local de la función** — `vercel dev` (sirve Vite + `/api` en http://localhost:3000) y en otra terminal:

```bash
curl -i -X POST http://localhost:3000/api/send-summary
```

Expected: `401` con `{"ok":false,"code":"unauthorized",...}` (confirma que la función responde). El envío real se prueba con el botón en la Tarea 16.

- [ ] **Paso 10: Commit**

```bash
git add -A
git commit -m "feat(api): función send-summary con firebase-admin y AWS SES" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 16: Cliente de la API y botón "Enviar resumen" (TDD)

**Files:**
- Create: `src/api/summary.api.ts`, `src/components/tasks/SendSummaryButton.tsx`
- Modify: `src/pages/TasksPage.tsx`
- Test: `tests/unit/summary.api.test.ts`

**Interfaces:**
- Consumes: `getIdToken()` (Tarea 5), `SendSummaryResponse` (Tarea 14), `Button`, `ToastMessage`.
- Produces:
  - `sendSummary(): Promise<{ to: string }>` — lanza `SummaryError(message)` con mensaje para mostrar.
  - `SendSummaryButton({ onResult: (toast: ToastMessage) => void })`

- [ ] **Paso 1: Test que falla** — `tests/unit/summary.api.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/auth.service', () => ({ getIdToken: vi.fn().mockResolvedValue('token-123') }));

import { SummaryError, sendSummary } from '@/api/summary.api';

describe('sendSummary', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('hace POST con el token y devuelve el destinatario', async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true, messageId: 'm1', to: 'ana@mail.com' }));
    await expect(sendSummary()).resolves.toEqual({ to: 'ana@mail.com' });
    expect(fetchMock).toHaveBeenCalledWith('/api/send-summary', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-123' },
    });
  });

  it('lanza el mensaje del servidor si responde con error', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ok: false, code: 'email_failed', message: 'No pudimos enviar el email.' }, { status: 502 }),
    );
    await expect(sendSummary()).rejects.toEqual(new SummaryError('No pudimos enviar el email.'));
  });

  it('lanza un mensaje genérico si no hay red', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(sendSummary()).rejects.toEqual(new SummaryError('No pudimos conectar con el servidor. Revisa tu conexión.'));
  });
});
```

Run: `npm test -- summary.api` → Expected: FAIL.

- [ ] **Paso 2: `src/api/summary.api.ts`**

```ts
import { getIdToken } from '@/services/auth.service';
import type { SendSummaryResponse } from '@/types/api';

export class SummaryError extends Error {}

const NETWORK_ERROR = 'No pudimos conectar con el servidor. Revisa tu conexión.';
const UNKNOWN_ERROR = 'No pudimos enviar el resumen. Inténtalo de nuevo.';

export async function sendSummary(): Promise<{ to: string }> {
  const token = await getIdToken();

  let response: Response;
  try {
    response = await fetch('/api/send-summary', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new SummaryError(NETWORK_ERROR);
  }

  const body = (await response.json().catch(() => null)) as SendSummaryResponse | null;
  if (!body) throw new SummaryError(UNKNOWN_ERROR);
  if (!body.ok) throw new SummaryError(body.message);
  return { to: body.to };
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Paso 3: `src/components/tasks/SendSummaryButton.tsx`**

```tsx
import { useState } from 'react';
import { SummaryError, sendSummary } from '@/api/summary.api';
import { Button } from '@/components/ui/Button';
import type { ToastMessage } from '@/components/ui/Toast';

export function SendSummaryButton({ onResult }: { onResult: (toast: ToastMessage) => void }) {
  const [sending, setSending] = useState(false);

  async function handleClick() {
    setSending(true);
    try {
      const { to } = await sendSummary();
      onResult({ kind: 'success', message: `Resumen enviado a ${to}.` });
    } catch (error) {
      onResult({
        kind: 'error',
        message: error instanceof SummaryError ? error.message : 'No pudimos enviar el resumen.',
        action: { label: 'Reintentar', onClick: () => void handleClick() },
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Button size="sm" onClick={() => void handleClick()} loading={sending}>
      {sending ? 'Enviando…' : 'Enviar resumen por email'}
    </Button>
  );
}
```

- [ ] **Paso 4: Conectar en `TasksPage.tsx`** — importar `SendSummaryButton` y reemplazar el comentario `{/* Tarea 16: ... */}` por:

```tsx
<SendSummaryButton onResult={setToast} />
```

- [ ] **Paso 5: Verificar** — `npm test` → PASS. `npm run build` → OK.

- [ ] **Paso 6: Prueba local** — `vercel dev` → login con el email verificado en SES → **Enviar resumen** → llega el email (revisar spam). Probar también con otra cuenta no verificada: debe mostrar el error de SES (sandbox) con "Reintentar".

- [ ] **Paso 7: Commit**

```bash
git add -A
git commit -m "feat(email): botón para enviar el resumen de tareas por email" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Paso 8 (autora): Variables del servidor en Vercel** — agregar en Production y Preview: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`, `SES_AWS_REGION`, `SES_AWS_ACCESS_KEY_ID`, `SES_AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL`, `APP_URL`. Luego `vercel --prod` y probar el botón en producción.

- [ ] **Paso 9: AI_LOG** — entrada "Fases 4–5 — Deploy y email" y commit `docs: registrar uso de IA en deploy y email`.

---

## FASE 6 — Documentación y publicación

### Tarea 17: README, repo público en GitHub y verificación final

**Files:**
- Create: `README.md` (reemplaza el de Vite)

- [ ] **Paso 1: `README.md`** con estas secciones (contenido real del proyecto; tomar como base `../README.md` y ajustar a lo que se construyó):
  1. **MateCode Tasks** — descripción (2–3 líneas) + **URL de producción** real.
  2. **Funcionalidades** — lista.
  3. **Stack** — tabla.
  4. **Decisiones arquitectónicas** — BaaS + Security Rules; colección `tasks` con `userId`; `onSnapshot`; capas `component → hook → service`; servidor lee tareas y envía solo al email del token; inyección de dependencias en el handler; `firebase-admin` + service account; orden en cliente para evitar índice compuesto; `<dialog>` nativo; CSS Modules + tokens.
  5. **Estructura del proyecto** — árbol.
  6. **Instalación** — `git clone`, `npm install`, `cp .env.example .env`, `npm run dev` (solo frontend) y `vercel dev` (con `/api`), `npm test`.
  7. **Variables de entorno** — tabla (cliente/servidor, uso), nota sobre `VITE_` y prefijo `SES_`.
  8. **Flujo de envío de emails** — diagrama de pasos (de la spec, sección 7) + nota del sandbox de SES.
  9. **Seguridad** — reglas, IAM mínimo, `.env` ignorado, escape de HTML en el email.
  10. **Testing** — qué se testea y cómo correrlo.
  11. **Uso de IA en el proceso** — resumen redactado por la autora a partir de `AI_LOG.md`: dónde fue más efectiva, patrones y buenas prácticas descubiertas.
  12. **Mejoras futuras** — rate limit, salida del sandbox, recuperación de contraseña.

- [ ] **Paso 2: Commit**

```bash
git add README.md
git commit -m "docs: README con arquitectura, instalación, variables y flujo de email" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Paso 3: Revisión de secretos antes de publicar**

```bash
git log --all --name-only --format='' | sort -u | grep -Ei '(^|/)\.env$|serviceAccount|\.pem$' || echo "OK: sin archivos de secretos en el historial"
git grep -nE 'AKIA[0-9A-Z]{16}|BEGIN PRIVATE KEY' $(git rev-list --all) || echo "OK: sin claves en el historial"
```

Expected: ambos "OK". Si algo aparece, NO publicar: avisar y limpiar primero.

- [ ] **Paso 4: Crear repo público y subir** (confirmar con la autora antes: es público)

```bash
gh repo create matecode-tasks --public --source=. --remote=origin --push
```

- [ ] **Paso 5: Conectar Vercel con GitHub** (opcional, recomendado) — Vercel dashboard → Project → Settings → Git → conectar `anakayni/matecode-tasks`, para que cada push despliegue.

- [ ] **Paso 6: Verificación final contra el enunciado**
  - [ ] Registro/login con email y Google, logout, rutas protegidas, errores claros.
  - [ ] CRUD completo, persistente, cada usuario ve solo lo suyo.
  - [ ] Estados de carga/error; UI se actualiza sola.
  - [ ] Email real vía SES desde Vercel Function; sin secretos en el frontend (buscar en `dist/`: `grep -r "SES_\|PRIVATE" dist` → vacío).
  - [ ] `npm test` todo verde; `npm run build` OK.
  - [ ] URL pública funcionando desde el celular.
  - [ ] `.env` ignorado; `.env.example` versionado.
  - [ ] README completo con URL real.

---

**Siguiente:** Plan 2 — extras (filtros, fecha de vencimiento + prioridad + orden, drag & drop con dnd-kit).
