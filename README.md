# MateCode Tasks

SPA de gestión de tareas para los empleados de una pyme. Cada persona se registra (email y contraseña o Google), gestiona sus propias tareas guardadas en la nube y puede enviarse por email un resumen del estado de sus tareas.

**Producción:** https://matecode-tasks-sandy.vercel.app

**Repositorio:** https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan

## Funcionalidades

- Registro e inicio de sesión con email/contraseña y con Google; cierre de sesión.
- Rutas protegidas: `/tasks` solo es accesible con sesión; `/login` y `/register` redirigen si ya hay sesión.
- Errores de autenticación traducidos a mensajes claros en español.
- CRUD de tareas (título + descripción): crear, listar, editar (modal), eliminar (con confirmación) y marcar como completada.
- Cada usuario solo ve y modifica sus propias tareas (filtro por `userId` + Security Rules).
- Actualización en tiempo real de la lista tras cualquier cambio (`onSnapshot`), estados de carga, error con reintento y lista vacía.
- Botón **Enviar resumen por email**: una Vercel Function envía, vía AWS SES, un email con el total de tareas pendientes y completadas.
- **Extras:** filtros (todas / pendientes / completadas) con contador, prioridad (alta / media / baja), fecha de vencimiento con aviso de "Vencida" / "Vence hoy", y orden por más recientes, vencimiento o prioridad.
- Diseño responsive mobile first con CSS propio.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Navegación | React Router (`react-router`) |
| Estilos | CSS Modules + variables de diseño (`src/styles/tokens.css`) |
| Íconos (v2) | lucide-react |
| Autenticación | Firebase Authentication (email/password + Google) |
| Base de datos | Cloud Firestore |
| Backend | Vercel Functions (`/api/send-summary`) |
| Email | AWS SES v2 (`@aws-sdk/client-sesv2`) |
| Verificación en el servidor | `firebase-admin` |
| Testing | Vitest + React Testing Library + jsdom |
| Lint | oxlint |
| Deploy | Vercel |

## Decisiones arquitectónicas

1. **BaaS para auth y datos.** Firebase Auth y Firestore evitan mantener un backend propio. La config web de Firebase no es secreta; la seguridad real está en las **Security Rules** (`firestore.rules`), que solo permiten leer/escribir una tarea si `userId == request.auth.uid` y validan campos, tipos y largos.
2. **Colección `tasks` con campo `userId`.** Se eligió una colección raíz filtrada con `where('userId', '==', uid)` (en vez de subcolecciones por usuario) porque el enunciado pide explícitamente filtrar por `userId`. El orden por fecha se hace en el cliente para no requerir un índice compuesto.
3. **Capas `component → hook → service`.** Los componentes nunca importan Firebase: usan hooks (`useAuth`, `useTasks`) que llaman a `services/`. Así los tests mockean los servicios sin tocar Firebase.
4. **Tiempo real.** `onSnapshot` mantiene la lista sincronizada: tras crear/editar/eliminar no hay que volver a pedir datos.
5. **El servidor decide el contenido del email.** El frontend solo envía su ID token de Firebase. La función lo verifica con `firebase-admin`, lee las tareas de ese `uid` y envía el email **al email del token**. Nadie puede usar el endpoint para mandar contenido arbitrario ni a otros destinatarios.
6. **Lógica del servidor testeable.** `api/send-summary.ts` sigue el estilo `handler(request: VercelRequest, response: VercelResponse)` y delega en `processSendSummary(deps, { method, authorization })`, que recibe sus dependencias (verificar token, leer tareas, enviar email). Los tests le pasan funciones falsas en vez de Firebase y AWS reales.
7. **Errores útiles para usuario y desarrollador.** La UI muestra mensajes amigables; el error real queda en la consola (cliente) o en los logs de Vercel (servidor). Un token inválido responde 401, pero un error de configuración responde 500 para no confundirlo con "sesión expirada".
8. **Componentes UI propios y accesibles.** `Button`, `Field`, `Alert`, `Spinner`, `Toast` y `Modal` (con `<dialog>` nativo). Labels asociados, `aria-invalid`, `role="alert"`, foco visible.

## Estructura

```
├─ api/send-summary.ts          # Vercel Function (VercelRequest/VercelResponse)
├─ functions/
│  ├─ sendSummary.ts            # processSendSummary: método → token → tareas → SES
│  ├─ summaryEmail.ts           # buildSummary, renderSummaryEmail, escapeHtml (puras)
│  ├─ firebaseAdmin.ts          # verifyIdToken, getTasksForUser
│  ├─ ses.ts                    # sendEmail con SES v2
│  └─ env.ts                    # requireEnv
├─ src/
│  ├─ pages/                    # LoginPage, RegisterPage, TasksPage
│  ├─ components/
│  │  ├─ ui/                    # Button, Field, Alert, Spinner, Toast, Modal
│  │  ├─ auth/                  # AuthLayout, GoogleButton
│  │  └─ tasks/                 # TodoForm, TodoList, TodoItem, SendSummaryButton
│  ├─ features/auth/            # mapAuthError
│  ├─ services/                 # firebase.ts, auth.service.ts, tasks.service.ts
│  ├─ api/                      # summary.api.ts → POST /api/send-summary
│  ├─ routes/                   # AppRouter, ProtectedRoute, PublicOnlyRoute
│  ├─ hooks/                    # useAuth, useAuthAction, useTasks
│  ├─ types/                    # auth.ts, task.ts, api.ts
│  ├─ utils/                    # validators.ts
│  └─ styles/                   # tokens.css, global.css
├─ tests/
│  ├─ unit/                     # validadores, mapAuthError, hooks, cliente de la API
│  ├─ components/               # TodoForm, TodoList, LoginPage, rutas, UI, Toast
│  └─ server/                   # plantilla del email y lógica de send-summary
├─ docs/                        # documento de diseño y plan de implementación
├─ firestore.rules
├─ vercel.json
├─ .env.example
└─ AI_LOG.md                    # registro detallado del uso de IA por fase
```

## Instalación

Requisitos: Node.js 22+ y la CLI de Vercel (`npm i -g vercel`) para correr la función de email en local.

```bash
git clone https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan.git
cd ProyectoM4_Ana_Marquez_Almazan
npm install
cp .env.example .env      # completar valores (ver tabla abajo)
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Solo el frontend (Vite) en http://localhost:5173 |
| `vercel dev` | Frontend + Vercel Functions (`/api`) en http://localhost:3000 |
| `npm test` | Ejecuta todos los tests con Vitest |
| `npm run test:watch` | Tests en modo observación |
| `npm run build` | Chequeo de tipos (cliente y servidor) + build de producción |
| `npm run lint` | oxlint |

**Configuración de Firebase:** crear proyecto, habilitar Authentication (Email/Password y Google), crear Firestore en modo producción, publicar `firestore.rules` y agregar el dominio de Vercel en *Authentication → Settings → Authorized domains*.

**Configuración de AWS SES:** verificar el email remitente en SES (región `us-east-1`) y crear un usuario IAM con una política que solo permita `ses:SendEmail`.

## Variables de entorno

| Variable | Dónde | Uso |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Cliente | Config web de Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Cliente | |
| `VITE_FIREBASE_PROJECT_ID` | Cliente | |
| `VITE_FIREBASE_STORAGE_BUCKET` | Cliente | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cliente | |
| `VITE_FIREBASE_APP_ID` | Cliente | |
| `FIREBASE_ADMIN_PROJECT_ID` | Servidor | Cuenta de servicio de Firebase |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Servidor | |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Servidor | Entre comillas dobles, con saltos de línea como `\n` |
| `SES_AWS_REGION` | Servidor | Ej. `us-east-1` |
| `SES_AWS_ACCESS_KEY_ID` | Servidor | Usuario IAM con permiso `ses:SendEmail` |
| `SES_AWS_SECRET_ACCESS_KEY` | Servidor | |
| `SES_FROM_EMAIL` | Servidor | Remitente verificado en SES |
| `APP_URL` | Servidor | URL pública (botón "Abrir mis tareas" del email) |

- Solo las variables con prefijo `VITE_` llegan al navegador. **Ningún secreto lleva ese prefijo.**
- Se usa el prefijo `SES_` porque Vercel reserva nombres como `AWS_REGION` y `AWS_ACCESS_KEY_ID`.
- `.env` está en `.gitignore`; `.env.example` se versiona con las mismas claves y sin valores.
- En Vercel las variables se cargan en *Settings → Environment Variables* (las secretas como *sensitive*).

## Flujo de envío de emails

```
[TasksPage] botón "Enviar resumen por email"
   │
   ▼
src/api/summary.api.ts
   token = await auth.currentUser.getIdToken()
   POST /api/send-summary   Authorization: Bearer <token>   (sin body)
   │
   ▼
api/send-summary.ts  →  functions/sendSummary.ts (processSendSummary)
   1. Método distinto de POST            → 405 (header Allow: POST)
   2. Sin token                          → 401
   3. verifyIdToken (firebase-admin)     → uid + email   (token inválido → 401)
   4. Firestore: tasks where userId == uid               (error → 500)
   5. renderSummaryEmail → asunto + HTML + texto plano   (títulos escapados)
   6. SES v2 SendEmailCommand → al email del token       (error → 502)
   7. 200 { ok: true, messageId, to }
   │
   ▼
[UI] Toast "Resumen enviado a …" o mensaje de error con "Reintentar"
```

**SES en sandbox:** mientras la cuenta de AWS esté en sandbox, SES solo envía a direcciones verificadas. Para producción real se debe solicitar la salida del sandbox en la consola de AWS.

## Seguridad

- Security Rules: cada usuario solo lee, crea, edita y borra sus tareas; se valida que no cambie el `userId` y que los campos tengan el tipo y largo correctos.
- Usuario IAM con mínimo privilegio (solo `ses:SendEmail`).
- Secretos solo en `.env` (ignorado por git) y en las variables de Vercel; nunca en el código ni en el bundle.
- El HTML del email escapa el texto escrito por el usuario (evita inyección de HTML).
- La función ignora cualquier dato del cliente salvo el token: el destinatario sale del token verificado.

## Testing

82 tests con Vitest + React Testing Library (`npm test`):

- **Unitarios:** validadores de formularios, `mapAuthError`, `useAuth`, `useTasks`, `filterTasks`, `sortTasks`, fechas de vencimiento (`formatDate`) y cliente de la API (`fetch` mockeado).
- **Componentes:** `TodoForm` (validación, envío, prioridad y fecha, edición, error), `TodoList` (render, prioridad y vencimiento, completar, editar, eliminar con confirmación, estado vacío), `TaskFilters`, `LoginPage` (validación, error traducido, Google), `ProtectedRoute`/`PublicOnlyRoute`, `Toast` y componentes UI.
- **Servidor:** plantilla del email (conteos, escape de HTML, texto plano) y `processSendSummary` (405, 401, 400, 500, 502 y 200) con dependencias falsas.
- **Mocks:** `vi.mock` de `services/*` y `hooks/useAuth`; ningún test llama a Firebase ni a AWS reales.

## Problemas encontrados y cómo se resolvieron

| Problema | Causa | Solución |
|---|---|---|
| "No pudimos guardar la tarea" | Se habían publicado reglas de Firestore de otro proyecto | Registrar el error real en consola, aislarlo con una prueba mínima y publicar `firestore.rules` |
| La app no cargaba con `vercel dev` | El rewrite de SPA mandaba `/src/main.tsx` a `index.html` | Reescribir solo rutas sin extensión y excluir `/api`, `/@*`, `/src`, `/node_modules` |
| `not authorized to perform ses:SendEmail` | La política IAM no estaba asignada al usuario | Asignar la política con `ses:SendEmail` |
| La función fallaba en Vercel (`ERR_REQUIRE_ESM`) | `firebase-admin` 14 depende de `jose` 6 (solo ESM) | Usar `firebase-admin` 13 |

## Uso de IA en el proceso

Usé **Claude Code** como asistente durante todo el proyecto. El detalle por fase está en [`AI_LOG.md`](AI_LOG.md).

**Cómo la integré:**
- **Antes de programar:** le pedí que analizara el enunciado y me hiciera preguntas. Así definimos el alcance (auth con Google, CSS propio, extras al final) y un documento de diseño con alternativas y sus trade-offs (`docs/specs/`).
- **Plan por fases:** con el diseño aprobado se armó un plan con tareas pequeñas, cada una con sus tests y su commit (`docs/plans/`).
- **Implementación con TDD:** en cada tarea primero se escribió el test, se verificó que fallara y después se implementó el código.
- **Depuración:** ante cada error se buscó primero la causa real (consola, logs de Vercel, pruebas mínimas contra la API) antes de cambiar código.

**Dónde fue más efectiva:**
- Generar tests a partir de un comportamiento definido y detectar casos borde (token inválido vs. error de configuración, escape de HTML).
- Diagnosticar errores de configuración: reglas de Firestore equivocadas, permisos IAM, incompatibilidades ESM/CommonJS en Vercel.
- Explicar conceptos a medida que aparecían: Context, `onSnapshot`, Security Rules, inyección de dependencias, `.gitignore`.

**Dónde tuve que intervenir:**
- Toda la configuración de Firebase, AWS y Vercel (consolas y credenciales) la hice yo; nunca compartí secretos en el chat.
- Las pruebas manuales en navegador y celular.
- Decisiones como adaptar la función al estilo de clase (`VercelRequest`/`VercelResponse`).

**Patrones y buenas prácticas que descubrí:**
- Pedir primero preguntas y un diseño, y recién después código.
- Una tarea chica por vez, con test y commit: el historial documenta el proceso.
- No "tragarse" errores: mensaje amigable para el usuario y error real en consola o logs.
- Aislar la causa con una prueba mínima antes de tocar código.
- Revisar y entender cada cambio antes de aceptarlo, y verificar siempre con tests, build y prueba manual.
- Nunca pegar secretos en el prompt; cargarlos directo en `.env` o en Vercel.

## v2 en desarrollo (rama `v2`)

Después de la entrega sigo el proyecto como portafolio: un espacio de equipo con administrador, invitaciones, menú lateral (Mis tareas, Proyectos, Calendario, Equipo, Ajustes) y paleta y logo configurables. Se construye por etapas, cada una con su diseño y plan en `docs/specs/` y `docs/plans/`. **Etapa 1 (lista):** roles, invitaciones y auditoría obligatoria. **Etapa 2 (lista):** menú lateral, paleta y login en pantalla dividida.

### Entornos

| | Producción | Desarrollo |
|---|---|---|
| Rama | `main` | `v2` |
| Firebase | `matecode-tasks-dc1e1` | `matecode-tasks-dev` |
| URL | https://matecode-tasks-sandy.vercel.app | https://matecode-tasks-dev.vercel.app (preview protegida por Vercel) |
| Variables en Vercel | *Production* | *Preview* |

Todo funciona en planes gratuitos (Firebase Spark, Vercel Hobby, SES en sandbox) y no se usa Firebase Storage.

### Roles y permisos

| Acción | Administrador | Miembro | Lector |
|---|---|---|---|
| Ver todas las tareas del equipo y su historial | ✓ | ✓ | ✓ |
| Crear y editar cualquier tarea | ✓ | ✓ | |
| Eliminar tareas | todas | solo las que creó | |
| Invitar personas, cambiar roles, desactivar | ✓ | | |
| Ver el registro de auditoría completo | ✓ | | |

Un administrador no puede cambiar su propio rol ni desactivarse (así el espacio nunca queda sin admin).

### Flujo de invitación

1. El admin invita un email con un rol → se crea `invitations/{email}` y la app muestra un link `/register?email=…` para compartir.
2. La persona se registra **con ese mismo email**. Si usa contraseña, primero debe confirmar su email.
3. Al entrar, la app "reclama" la invitación: crea `users/{uid}` con el rol invitado y marca la invitación como aceptada.
4. Quien no tiene invitación ve "No tienes invitación a este espacio"; quien fue desactivado tampoco entra.

El primer administrador se crea una sola vez por entorno con `npm run bootstrap-admin -- email@ejemplo.com` (usa la cuenta de servicio del `.env`).

### Auditoría obligatoria

Cada cambio a una tarea, invitación o usuario se guarda en la misma escritura (batch o transacción) que una entrada en `auditLog`:

```js
// auditLog/task_abc123_3
{
  entityType: 'task', entityId: 'abc123', rev: 3,
  action: 'update', actorId: '<uid de quien cambió>', at: <hora del servidor>,
  before: { title: 'Revisar factura', completed: false, … },
  after:  { title: 'Revisar factura', completed: true,  … },
}
```

No depende de que la app "se acuerde" de auditar: las **Security Rules** rechazan cualquier cambio que no venga acompañado de su entrada, y verifican que `before` y `after` coincidan con el documento real, que `actorId` sea quien hace el cambio y que `at` sea la hora del servidor. Las entradas no se pueden editar ni borrar.

### Estructura y paleta (etapa 2)

- **Marco común (`AppShell`):** las páginas internas comparten un menú lateral en la computadora y, en el celular, una barra superior (logo y menú de cuenta) con 5 pestañas abajo. Es una *layout route* de React Router: el menú se dibuja una vez y solo cambia el contenido (`<Outlet />`).
- **Secciones:** salen de la función `navItems(perfil)`. Mis tareas y Equipo (solo admin) funcionan; Proyectos, Calendario y Ajustes se ven como "Próximamente" hasta su etapa.
- **Paleta:** 5 variables en `tokens.css` (`--brand-1` … `--brand-5`: `#1B4079`, `#4D7C8A`, `#7F9C96`, `#8FAD88`, `#CBDF90`). Los componentes usan nombres por función (botón principal, fondo, menú) que apuntan a esas variables, y los tonos claros se calculan con `color-mix()`. En la etapa 8 el admin podrá cambiarlas desde Ajustes sin tocar componentes.
- **Login:** pantalla dividida con panel de marca y el aviso "Acceso solo con invitación del administrador".

### Comandos nuevos

| Script | Qué hace |
|---|---|
| `npm run test:rules` | Tests de las Security Rules contra el emulador de Firestore (requiere **Java 21**) |
| `npm run bootstrap-admin -- email` | Crea la invitación del primer administrador en el Firebase del `.env` |

Tests en la rama `v2`: 161 de la app (`npm test`) y 32 de reglas (`npm run test:rules`). Los tests de reglas usan las mismas funciones de escritura que la app e incluyen intentos de "hacer trampa" (auditoría falsa, actor ajeno, entrada suelta) que deben ser rechazados.

## Mejoras futuras

- Reordenar tareas con drag & drop (dnd-kit), guardando el orden manual en Firestore.
- Mostrar prioridad, vencimiento y cantidad de tareas vencidas en el email de resumen.
- Mejorar el diseño visual.
- Límite de envíos de email por usuario (rate limit).
- Salida del sandbox de SES.
- Recuperación de contraseña y verificación de email.
