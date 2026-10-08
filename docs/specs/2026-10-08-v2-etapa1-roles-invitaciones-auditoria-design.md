# MateCode Tasks v2 — Etapa 1: roles, invitaciones y auditoría

- **Fecha:** 2026-10-08
- **Rama:** `v2` (la versión entregada del M4 queda en `main` y en la etiqueta `v1.0-entrega`)
- **Estado:** aprobado por secciones en conversación; pendiente revisión final

## 0. Contexto de la v2

Proyecto de portafolio, sin fecha de entrega. Objetivo: pasar de una app de tareas personales a un **espacio de trabajo de una pyme** con equipo, roles, proyectos, calendario y ajustes de marca.

### Decisiones generales

| Tema | Decisión |
|---|---|
| Alcance | Un solo espacio de trabajo (una empresa). Multi-empresa queda fuera. |
| Roles | `admin`, `member`, `viewer` |
| Visibilidad | Todo el equipo ve todas las tareas. "Mis Tareas" filtra por defecto las asignadas a mí. |
| Auditoría | Obligatoria, impuesta por Security Rules (sin Cloud Functions ni plan Blaze). Registro de solo agregar. |
| Invitaciones | Solo por link para copiar y compartir; el envío por SES queda preparado pero desactivado (sandbox, costo $0). |
| Costos | $0 hasta tener un cliente: Firebase Spark, Vercel Hobby, SES en sandbox. Sin Firebase Storage (exige Blaze); el logo se guarda en Firestore. |
| Datos de los mockups | Solo se construye lo que tenga datos reales. Fuera: SLA, almacenamiento, "PRO", facturación, SOC2, despliegues, latencia, carga de sprint. |
| Paleta | `#1B4079`, `#4D7C8A`, `#7F9C96`, `#8FAD88`, `#CBDF90` (configurable en Ajustes). |
| Entornos | Producción: rama `main` + Firebase `matecode-tasks-dc1e1`. Desarrollo: rama `v2` + Firebase nuevo `matecode-tasks-dev` + preview de Vercel. |

### Etapas

| # | Etapa |
|---|---|
| **1** | **Roles, invitaciones y auditoría** (este documento) |
| 2 | Estructura y diseño nuevo: menú lateral, barra superior, paleta, login en pantalla dividida |
| 3 | Mis Tareas v2: estado de 3 valores, proyecto, responsable, tarjetas con números reales, panel con historial |
| 4 | Equipo: integrantes, invitar, cambiar rol, desactivar, invitaciones pendientes |
| 5 | Proyectos: CRUD, archivar, progreso real, fechas de inicio y fin |
| 6 | Calendario: vista Mes (agenda en móvil) |
| 7 | Calendario: Gantt por proyecto |
| 8 | Ajustes: logo, colores, página de auditoría para el admin |

Cada etapa tiene su diseño, plan, tests, commits y deploy de preview. Al terminar la v2 se integra a `main` con una migración única de los datos de producción.

## 1. Modelo de datos

### `users/{uid}`

| Campo | Tipo | Nota |
|---|---|---|
| `email` | string | En minúsculas |
| `displayName` | string | |
| `role` | `'admin' \| 'member' \| 'viewer'` | Solo un admin lo cambia |
| `active` | bool | Desactivar en vez de borrar (el historial conserva sentido) |
| `invitedBy` | string \| null | UID del admin; `null` para el admin inicial |
| `joinedAt` | timestamp | |
| `rev` | number | Contador para auditoría |

### `invitations/{email}`

El ID es el email en minúsculas: no se puede invitar dos veces al mismo email.

| Campo | Tipo |
|---|---|
| `email` | string |
| `role` | `'member' \| 'viewer'` (y `'admin'` si lo elige un admin) |
| `status` | `'pending' \| 'accepted' \| 'revoked'` |
| `invitedBy` | string (UID) |
| `createdAt` | timestamp |
| `acceptedBy`, `acceptedAt` | string \| null, timestamp \| null |
| `rev` | number |

### `tasks/{id}` (cambios respecto a v1)

| Campo | Cambio |
|---|---|
| `userId` | **Se reemplaza por `createdBy`** ("quién la creó", ya no "dueño") |
| `rev` | Nuevo. Empieza en 1 y sube de a 1 en cada cambio |
| `updatedBy` | Nuevo. UID de quien hizo el último cambio |
| `updatedAt` | Igual que antes, pero las reglas exigen `== request.time` |

Se conservan `title`, `description`, `completed`, `priority`, `dueDate`, `createdAt`. Estado de 3 valores, responsable y proyecto llegan en las etapas 3 y 5.

### `auditLog/{entityType}_{entityId}_{rev}`

ID predecible para que las reglas puedan exigir su existencia.

| Campo | Tipo | Garantía |
|---|---|---|
| `entityType` | `'task' \| 'invitation' \| 'user'` (luego `'project'`, `'settings'`) | |
| `entityId` | string | |
| `rev` | number | Coincide con el `rev` del documento auditado |
| `action` | `'create' \| 'update' \| 'delete'` | Coherente con `before`/`after` |
| `actorId` | string | `== request.auth.uid` |
| `at` | timestamp | `== request.time` |
| `before` | map \| null | `== get(documento).data` (estado previo real); `null` en create |
| `after` | map \| null | `== getAfter(documento).data` (estado final real); `null` en delete |

El detalle "qué campo cambió de qué a qué" se calcula en el cliente comparando `before` y `after`.

## 2. Flujo de invitación y registro

1. **Admin invita** (pantalla mínima en esta etapa; la definitiva en la etapa 4): email + rol → batch con `invitations/{email}` + `auditLog/invitation_{email}_1`. Se muestra el link `https://<app>/register?email=<email>` para copiar. El link solo prellena el email; no es un secreto.
2. **Registro:**
   - Google: `email_verified` ya es `true`.
   - Email/contraseña: se crea la cuenta y se llama a `sendEmailVerification` (Firebase, gratis). Pantalla "Confirma tu email" con botón "Ya lo confirmé" (recarga el usuario con `user.reload()` y renueva el token).
3. **Reclamo automático** al detectar sesión verificada sin perfil: batch con `users/{uid}` (rol de la invitación, `active: true`, `rev: 1`), `invitations/{email}` → `accepted` (rev + 1) y las dos entradas de auditoría.
4. **Estados de acceso** (resueltos en `AuthProvider`):

| Situación | Resultado |
|---|---|
| Sin sesión | `/login` |
| Sesión con email sin verificar | `/verify-email` |
| Verificada, sin perfil, con invitación pendiente | Reclamo automático → app |
| Verificada, sin perfil, sin invitación | `/no-access` ("No tienes invitación a este espacio") + cerrar sesión |
| Perfil con `active: false` | `/no-access` ("Tu acceso fue desactivado") + cerrar sesión |
| Perfil activo | App según rol |

5. **Acciones del admin** (todas auditadas): cancelar invitación (`revoked`), desactivar/reactivar usuario, cambiar rol. Un admin no puede cambiar su propio rol ni desactivarse.
6. **Admin inicial:** script de servidor (`scripts/bootstrap-admin.mjs`, con `firebase-admin`) que crea `users/{uid}` con `role: 'admin'` y su entrada de auditoría (`actorId: 'system'`). Se corre una vez por entorno.

Limitación conocida: en el plan Spark no se puede impedir que alguien cree una cuenta en Firebase Auth; sin invitación esa cuenta no accede a ningún dato.

## 3. Permisos y reglas

### Matriz

| Acción | admin | member | viewer |
|---|:-:|:-:|:-:|
| Leer tareas y usuarios | ✅ | ✅ | ✅ |
| Crear / editar cualquier tarea | ✅ | ✅ | ❌ |
| Eliminar tarea | ✅ todas | ✅ solo `createdBy == uid` | ❌ |
| Leer historial de tareas (`auditLog` con `entityType == 'task'`) | ✅ | ✅ | ✅ |
| Leer auditoría completa | ✅ | ❌ | ❌ |
| Leer / crear / cancelar invitaciones | ✅ | ❌ | ❌ |
| Cambiar rol / desactivar usuarios | ✅ (no a sí mismo) | ❌ | ❌ |
| Editar el propio `displayName` | ✅ | ✅ | ✅ |

Toda regla de lectura/escritura de datos exige además un perfil **activo** (`users/{uid}.active == true`).

### Auditoría obligatoria (patrón para cada entidad auditada)

- **Create:** `rev == 1` y `existsAfter(auditLog/{tipo}_{id}_1)`.
- **Update:** `request.resource.data.rev == resource.data.rev + 1` y `existsAfter(auditLog/{tipo}_{id}_{rev nuevo})`.
- **Delete:** `existsAfter(auditLog/{tipo}_{id}_{resource.data.rev + 1})`.
- **auditLog create:** el ID coincide con `{entityType}_{entityId}_{rev}`; `actorId == request.auth.uid`; `at == request.time`; `before == get(doc).data` (o `null` si no existía); `after == getAfter(doc).data` (o `null` si se borra); `action` coherente.
- **auditLog update / delete:** prohibidos para todos.

Consecuencia: dos ediciones simultáneas de la misma tarea → la segunda falla por `rev` y la UI muestra "Otra persona modificó esta tarea. Recarga para ver los cambios."

## 4. Tests y orden de trabajo

### Tests

- **Reglas (emulador de Firestore + `@firebase/rules-unit-testing`):** lector no escribe; nadie edita sin auditoría; `before`/`after` falsos se rechazan; `actorId` ajeno se rechaza; auditoría inmutable; reclamo de invitación ajena o con email sin verificar se rechaza; rol distinto al de la invitación se rechaza; admin no cambia su propio rol; usuario desactivado no lee; miembro no borra tarea ajena; miembro no lee auditoría de invitaciones.
- **Unitarios:** armado de batches con auditoría, diff `before`/`after`, helpers de permisos (`can(role, action)`), normalización de email.
- **Componentes:** pantallas "Confirma tu email", "Sin acceso" e "Invitar".

### Orden

1. Firebase `matecode-tasks-dev`, variables de Preview en Vercel, emulador.
2. Tests de reglas → reglas.
3. Lógica de auditoría y servicio de tareas con `rev`.
4. Perfil de usuario y estados de acceso.
5. Invitaciones: pantalla mínima, link, reclamo automático.
6. Script del admin inicial, deploy de preview y prueba de punta a punta.
7. README y AI_LOG.

## 5. Fuera de alcance de esta etapa

- Diseño visual nuevo (etapa 2) y pantalla definitiva de Equipo (etapa 4).
- Envío de invitaciones por SES (preparado, desactivado).
- Auditoría de inicios de sesión (no garantizable con Security Rules).
- Migración de producción (se hace al integrar la v2 a `main`).
