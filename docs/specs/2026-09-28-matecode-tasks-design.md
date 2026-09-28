# MateCode Tasks — Documento de diseño

- **Fecha:** 2026-09-28
- **Entrega:** 2026-09-30
- **Estado:** aprobado por secciones en conversación; pendiente revisión final

## 1. Objetivo

SPA de gestión de tareas para empleados de una pyme. Cada usuario se registra, gestiona sus propias tareas persistidas en la nube y puede enviarse por email un resumen del estado de sus tareas. Desplegada públicamente en Vercel.

## 2. Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + Vite (últimas versiones estables) |
| Navegación | React Router |
| Estilos | CSS propio con CSS Modules + variables (`tokens.css` del prototipo) — mobile first |
| Auth | Firebase Authentication (email/password + Google) |
| Datos | Cloud Firestore |
| Backend | Vercel Functions (`/api`) |
| Email | AWS SES v2 (`@aws-sdk/client-sesv2`) |
| Verificación server | `firebase-admin` |
| Tests | Vitest + React Testing Library + jsdom |
| Deploy | Vercel |

Referencia visual: `../TaskAppV2.dc.html`, `../tokens.css`, `../email-resumen.html`. Código previo en `../_referencia/` solo como consulta (no se copia sin entenderlo).

## 3. Estructura

```
matecode-tasks/
├─ api/send-summary.ts          # Entrada de la Vercel Function (reexporta functions/)
├─ functions/
│  ├─ sendSummary.ts            # Handler: método → token → tareas → SES
│  ├─ firebaseAdmin.ts          # Inicialización de firebase-admin
│  ├─ ses.ts                    # Cliente SES + sendEmail()
│  └─ summaryEmail.ts           # buildSummary() + renderSummaryEmail() (puras)
├─ src/
│  ├─ pages/                    # LoginPage, RegisterPage, TasksPage
│  ├─ components/               # TodoForm, TodoList, TodoItem, TaskFilters, Modal, Toast, Button…
│  ├─ features/auth/            # mapAuthError
│  ├─ features/tasks/           # filterTasks, sortTasks (extras)
│  ├─ services/                 # firebase.ts, auth.service.ts, tasks.service.ts
│  ├─ api/                      # summary.api.ts
│  ├─ routes/                   # AppRouter, ProtectedRoute, PublicOnlyRoute
│  ├─ hooks/                    # useAuth (Context), useTasks
│  ├─ types/                    # task.ts, auth.ts, api.ts
│  ├─ utils/                    # validators.ts, formatDate.ts
│  └─ styles/                   # tokens.css, global.css
├─ tests/                       # unit/, components/, server/, mocks/
├─ docs/specs/                  # este documento
├─ firestore.rules
├─ vercel.json
├─ .env / .env.example / .gitignore
├─ AI_LOG.md                    # Registro de uso de IA durante el desarrollo
└─ README.md
```

**Regla de capas:** los componentes nunca importan Firebase. Flujo: `component → hook → service`. Los tests mockean `services/`.

## 4. Modelo de datos (Firestore)

Colección raíz `tasks`, un documento por tarea:

| Campo | Tipo | Fase |
|---|---|---|
| `userId` | string | núcleo |
| `title` | string, 1–80 | núcleo |
| `description` | string, 0–500 | núcleo |
| `completed` | boolean | núcleo |
| `createdAt`, `updatedAt` | server Timestamp | núcleo |
| `priority` | `'alta' \| 'media' \| 'baja'` | extra 3 |
| `dueDate` | `'YYYY-MM-DD' \| null` | extra 3 |
| `order` | number | extra 2 |

Los campos extra se agregan (tipos + reglas + UI) en el commit de su funcionalidad.

**Security Rules:** lectura/borrado si `resource.data.userId == request.auth.uid`; creación si `request.resource.data.userId == request.auth.uid` y los datos son válidos; actualización si es dueño, no cambia `userId` y los datos son válidos.

**Consulta:** `where('userId', '==', uid)`.

Alternativa descartada: subcolección `users/{uid}/tasks` — el enunciado pide explícitamente "filtrado por userId".

## 5. Autenticación y rutas

### Servicio y estado
- `auth.service.ts`: `registerWithEmail(name, email, password)` (+ `updateProfile`), `loginWithEmail`, `loginWithGoogle` (`signInWithPopup` + `GoogleAuthProvider`), `logout`, `subscribeToAuth` (`onAuthStateChanged`).
- `useAuth`: `AuthProvider` (Context) expone `{ user, loading, login, loginWithGoogle, register, logout }`. `loading` es `true` hasta que Firebase resuelve la sesión inicial.

### Errores
- `mapAuthError(error)` traduce códigos de Firebase a mensajes en español (incluye `auth/invalid-credential`, `auth/email-already-in-use`, `auth/weak-password`, `auth/popup-closed-by-user`, `auth/too-many-requests`, `auth/network-request-failed`); código desconocido → mensaje genérico.
- Validación cliente antes de llamar a Firebase: email con formato válido, contraseña ≥ 6, confirmación igual, nombre obligatorio en registro. Errores por campo.

### Rutas
| Ruta | Acceso | Si no cumple |
|---|---|---|
| `/login`, `/register` | sin sesión (`PublicOnlyRoute`) | → `/tasks` |
| `/tasks` | con sesión (`ProtectedRoute`) | → `/login` |
| `/`, `*` | — | → `/tasks` |

Mientras `loading`, ambas rutas guardianas muestran un spinner.

`vercel.json` reescribe todo lo que no sea `/api/*` a `/index.html`.

## 6. Tareas (CRUD)

- `tasks.service.ts`: `subscribeToTasks(uid, onData, onError)` (`onSnapshot`), `createTask(uid, input)`, `updateTask(id, patch)`, `deleteTask(id)`, `toggleTask(id, completed)`.
- `useTasks(uid)`: `{ tasks, loading, error, create, update, remove, toggle }`. La UI se actualiza vía `onSnapshot` (sin refetch manual).
- Estados de UI: carga (skeleton), error (mensaje + reintentar), vacío ("Todavía no tienes tareas").
- Componentes:
  - `TodoForm` — crear y editar (`initialValues` opcional), validación con `validateTask` (título obligatorio ≤ 80, descripción ≤ 500).
  - `TodoList` — lista + estado vacío.
  - `TodoItem` — checkbox completar, editar, eliminar con confirmación en la UI (no `window.confirm`).
- Operaciones en curso deshabilitan el botón correspondiente. Errores de Firestore → Toast.

## 7. Envío de email

### Flujo
1. Usuario pulsa **Enviar resumen**.
2. `summary.api.ts` obtiene `await user.getIdToken()` y hace `POST /api/send-summary` con `Authorization: Bearer <token>` y sin body.
3. `functions/sendSummary.ts`:
   1. Método distinto de POST → `405`.
   2. Falta token o `verifyIdToken` falla → `401`.
   3. Obtiene `uid` y `email` del token.
   4. Lee `tasks where userId == uid` con firebase-admin.
   5. `buildSummary(tasks)` → `{ total, pending, completed }` (+ `overdue` en extra 3).
   6. `renderSummaryEmail(summary, tasks, userName)` → `{ subject, html, text }` (HTML basado en `email-resumen.html`).
   7. `SendEmailCommand` de SES v2 al email del token, desde `SES_FROM_EMAIL`.
   8. `200 { ok: true, messageId }`; fallo de SES → `502`; error inesperado → `500`. Cuerpo de error: `{ ok: false, code, message }`.
4. UI muestra Toast de éxito ("Resumen enviado a …") o error con opción de reintento.

### Decisiones
- El servidor lee las tareas; el cliente no envía contenido del email. Nadie puede usar la función para enviar contenido arbitrario ni a otros destinatarios.
- Destinatario: siempre el email del usuario autenticado.
- Rate limit por usuario: fuera de alcance (SES sandbox limita destinatarios); se documenta como mejora futura.
- SES sandbox: solo destinatarios verificados. Para la demo se verifica el email propio.

## 8. Variables de entorno

| Variable | Dónde |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Cliente |
| `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Servidor |
| `SES_AWS_REGION`, `SES_AWS_ACCESS_KEY_ID`, `SES_AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL` | Servidor |

- Solo `VITE_*` llega al bundle; ningún secreto lleva ese prefijo.
- Prefijo `SES_` porque Vercel reserva `AWS_REGION` / `AWS_ACCESS_KEY_ID`.
- `.env` en `.gitignore`; `.env.example` versionado sin valores.
- Usuario IAM con permiso mínimo (`ses:SendEmail`).
- Secretos nunca se pegan en el chat con la IA.

## 9. Testing

- **Unit:** `validateTask`, validadores de auth, `mapAuthError`, `buildSummary`, `renderSummaryEmail`; extras: `filterTasks`, `sortTasks`.
- **Componentes:** `TodoForm`, `TodoList`, `ProtectedRoute`, `LoginPage`.
- **Servidor:** `sendSummary` con `firebase-admin` y SES mockeados (405, 401, 200, 502).
- **Mocks:** `vi.mock` de `src/services/*`, `firebase-admin`, `@aws-sdk/client-sesv2`, `fetch`. Ningún test llama servicios reales.
- TDD donde aplique (funciones puras y componentes con lógica).

## 10. Commits y documentación del proceso

- Conventional Commits en español, un commit por paso pequeño y funcional (`feat(scope)`, `fix`, `test`, `docs`, `chore`, `style`, `refactor`).
- Cada commit se muestra y explica antes de hacerlo.
- Identidad git configurada con el nombre y email de la autora; trailer `Co-Authored-By: Claude` salvo que la autora indique lo contrario.
- `AI_LOG.md` se actualiza al cerrar cada fase: qué se pidió, qué funcionó, qué se aprendió. Base para la sección de IA del README.

## 11. Fases

| # | Fase | Configuración manual de la autora |
|---|---|---|
| 0 | Setup: Vite + TS, git, estructura, estilos base, Vitest | identidad git |
| 1 | Firebase: proyecto, `.env`, `services/firebase.ts` | crear proyecto Firebase |
| 2 | Auth + rutas + tests | activar Email/Password y Google |
| 3 | CRUD + reglas + tests | publicar Security Rules |
| 4 | Deploy temprano a Vercel | env vars en Vercel, authorized domain en Firebase |
| 5 | Email: función + SES + botón + tests | SES (identidad verificada), IAM, service account Firebase |
| 6 | README, AI_LOG, repo GitHub | — |
| ⭐ | **Núcleo completo y desplegado** | |
| 7 | Extra: filtros (todas/pendientes/completadas) | — |
| 8 | Extra: vencimiento + prioridad + ordenar | actualizar reglas |
| 9 | Extra: drag & drop con dnd-kit (`order`) | actualizar reglas |

**Acción temprana:** crear cuenta AWS y verificar email en SES el día 1, aunque la fase 5 venga después.

## 12. Fuera de alcance

- Rate limiting del endpoint de email.
- Salida del sandbox de SES.
- Recuperación de contraseña, verificación de email, perfiles de usuario.
- Modo offline / PWA.
