# MateCode Tasks v2 — Etapa 9: Invitados por proyecto

- **Fecha:** 2026-10-13
- **Rama:** `v2`
- **Depende de:** etapas 1 (roles, invitaciones, auditoría), 4 (Equipo, foto en el perfil), 5 (proyectos, número de tarea), 8 (auditoría para el admin)
- **Estado:** aprobado por partes en conversación; pendiente revisión final

## 0. Objetivo

Que el admin pueda sumar personas externas (un cliente, un proveedor) que **solo vean y trabajen en los proyectos a los que las agrega**, sin ver al resto del equipo ni otros proyectos. Para admin, miembro y lector nada cambia.

## 1. Decisiones

| Tema | Decisión |
|---|---|
| Quién queda limitado | Un rol nuevo, **Invitado** (`guest`). Admin, Miembro y Lector siguen viendo todo. |
| Qué hace el Invitado | Como un Miembro, **pero solo dentro de sus proyectos**: ve, crea, edita, asigna, cambia estado y subtareas, elimina las tareas que creó. **No** crea proyectos ni cambia sus datos (nombre, fechas, color, responsable, archivar). |
| Qué ve del equipo | Solo a las personas de sus proyectos (nombre, foto, si está activa). No ve Equipo, emails ni roles. |
| Personas del proyecto | Una lista explícita por proyecto, **solo el admin** la cambia. El responsable cuenta siempre como persona del proyecto. |
| Cómo entra | Se invita como hoy con el rol Invitado; cuando crea su cuenta, el admin lo agrega a proyectos. Sin proyectos ve un mensaje. |
| Asignar | Admin y miembros asignan a cualquiera del equipo, como hoy (a un Invitado solo si está en ese proyecto). El Invitado asigna solo a personas del proyecto. Si el responsable de una tarea no está en la lista, el Invitado ve **"Alguien del equipo"**. |
| Enfoque | Lista en el proyecto (`memberIds`, auditada) + **tarjetas** `projects/{id}/people/{uid}` (nombre, foto, activo), validadas por las reglas contra el perfil real. Sin Cloud Functions (costo $0). |

## 2. Datos

### `projects/{id}` (cambia)

| Campo | Regla |
|---|---|
| `memberIds` | **opcional**; lista de uids (≤ 50). Sin el campo = lista vacía (los proyectos existentes no se migran). Solo un admin puede cambiarla. |

- Personas del proyecto = `memberIds` ∪ `{ownerId}`.
- El Invitado nunca es responsable (`ownerId` sigue exigiendo admin o miembro activo).

### `projects/{id}/people/{uid}` (nuevo: tarjeta)

| Campo | Regla |
|---|---|
| `uid` | igual al ID del documento (para buscar las tarjetas de una persona con `collectionGroup`) |
| `displayName`, `photo`, `active` | iguales a los de `users/{uid}` **después** de la escritura (`getAfter`) |
| `role` | `'guest'` o `'team'` (para la etiqueta "Invitado"; no expone el rol interno) — igual a `users/{uid}.role == 'guest'` |

- **Crear/actualizar:** cualquier persona activa (incluido el propio Invitado para su tarjeta) si la tarjeta coincide con el perfil y `uid` es persona del proyecto (`getAfter` del proyecto).
- **Borrar:** si `uid` ya no es persona del proyecto (`getAfter`), o si el proyecto se elimina en la misma escritura.
- **Leer:** admin, miembro y lector; el Invitado solo en proyectos donde está en `memberIds`.
- No se auditan: son copias; el cambio real (la lista o el perfil) sí queda auditado.

### Escrituras que mantienen las tarjetas

| Escritura | Además escribe |
|---|---|
| Admin agrega/quita persona (`setProjectMembers`) | proyecto (`memberIds`, `rev`) + auditoría `project` + crea/borra la tarjeta |
| Cambio de responsable (`updateProject`) | tarjeta del nuevo responsable; borra la del anterior si no está en `memberIds` |
| Crear proyecto | tarjeta del responsable |
| Eliminar proyecto (admin) | borra sus tarjetas |
| Mi perfil (nombre/foto) | todas las tarjetas de esa persona |
| Admin cambia rol o activo | todas las tarjetas de esa persona |

## 3. Reglas (`firestore.rules`)

- `isGuest()` = rol `guest` y activo. `canEdit()` sigue siendo admin/miembro; se agrega `canWork(projectId)` = `canEdit() || (isGuest() && projectId != null && uid in memberIds(projectId))`.
- **Invitaciones y usuarios:** `role in ['admin','member','viewer','guest']`.
- **Usuarios (lectura):** el Invitado solo lee su propio documento (`isActive() && !isGuest()` o el propio).
- **Proyectos:** lectura = `isActive() && !isGuest()` o (`isGuest()` y uid en `memberIds`). Crear/actualizar/eliminar: sin cambios para admin/miembro; además `memberIds` solo cambia si `isAdmin()` (`!changed().hasAny(['memberIds']) || isAdmin()`) y es lista ≤ 50.
- **Tareas:**
  - Lectura: `!isGuest()` o el proyecto de la tarea es suyo.
  - Crear/actualizar: `canWork(projectId)` con el proyecto **nuevo**; en update, el Invitado además debe poder trabajar en el proyecto **anterior** (no puede sacar una tarea de su proyecto ni traer una de afuera).
  - Responsable válido: admin o miembro activo, **o** Invitado activo que esté en `memberIds` del proyecto de la tarea. Se revisa cuando cambia el responsable **o el proyecto**. Si quien escribe es Invitado, el responsable debe ser persona del proyecto (`memberIds` ∪ `ownerId`) o `null`.
  - Eliminar: además, el Invitado elimina las que creó, en sus proyectos.
- **Contador:** el Invitado lo lee y lo incrementa (para crear tareas).
- **Auditoría (lectura):** el Invitado lee entradas `task` solo si la tarea existe y es de su proyecto, y entradas `project` solo de sus proyectos.
- **Email de resumen** (`functions/firebaseAdmin.ts`): para un Invitado, solo cuenta las tareas asignadas que estén en proyectos donde sigue estando.

## 4. Lectura según el rol (app)

| Dato | Admin / Miembro / Lector | Invitado |
|---|---|---|
| Proyectos | todos (como hoy) | `where('memberIds', 'array-contains', uid)` |
| Tareas | todas (como hoy) | una consulta `where('projectId', '==', id)` por cada proyecto suyo, unidas |
| Personas (`nameOf`, `personOf`, selector de responsable) | `useTeamMembers` (como hoy) | tarjetas de sus proyectos (`projects/{id}/people`), unidas; desconocido = "Alguien del equipo" |
| Historial de una tarea | como hoy | igual (las reglas ya lo permiten si la tarea es suya) |

## 5. Lógica pura

| Función | Qué hace |
|---|---|
| `can(actor, action, ctx)` | Suma `guest` y las acciones `project:create`, `project:edit`, `project:people`. `task:*` acepta al Invitado con `ctx.projectId` de uno de sus proyectos. |
| `projectPeople(project)` | `memberIds` ∪ `ownerId`, sin repetidos |
| `assignableIn(project, actor, members)` | Opciones de responsable: para el Invitado, personas del proyecto; para el resto, como hoy (y un Invitado solo si está en el proyecto) |
| `describeAuditEntry` | Frases "agregó a X al proyecto «P»" / "quitó a X del proyecto «P»" a partir del cambio en `memberIds` |

## 6. Interfaz

| Lugar | Qué cambia |
|---|---|
| Menú del Invitado | Mis tareas, Proyectos, Calendario (sin Equipo ni Ajustes) |
| Mis tareas / Calendario (Invitado) | Solo sus proyectos; "Nueva tarea" con proyecto **obligatorio** (sin "Sin proyecto"); filtro de proyecto con los suyos |
| Proyectos (Invitado) | Solo los suyos; sin "+ Nuevo proyecto", sin Editar ni Archivar |
| Invitado sin proyectos | "Todavía no tienes proyectos asignados. El administrador te agregará." |
| Página del proyecto (todos) | Sección **"Personas del proyecto"**: foto, nombre, etiquetas "Responsable" / "Invitado". Admin: "+ Agregar persona" (integrantes activos que no están) y "Quitar" con confirmación ("Carla dejará de ver este proyecto." y, si tiene tareas asignadas ahí: "Tiene N tareas asignadas en este proyecto: quedan a su nombre, pero ya no podrá verlas."). Invitaciones pendientes con rol Invitado: "Podrás agregarla cuando cree su cuenta." |
| Equipo (admin) | Rol "Invitado" al invitar y al cambiar rol, con la ayuda "Solo ve los proyectos a los que lo agregues". En la fila del Invitado: sus proyectos o "Sin proyectos". Si se pasa a Invitado a alguien que es responsable de proyectos, aviso previo pidiendo cambiar el responsable primero. |
| Auditoría | Frases nuevas de agregar/quitar personas |

## 7. Tests

- **Reglas (principal):** el Invitado lee sus proyectos, tareas, tarjetas e historial; crea, edita, asigna (dentro) y elimina las suyas. Deben fallar: leer un proyecto ajeno, la lista de usuarios, tareas de otro proyecto o sin proyecto, el historial de una tarea ajena; crear sin proyecto; mover una tarea fuera o traerla de afuera; asignar a alguien de afuera; editar datos del proyecto o `memberIds`; un miembro cambiando `memberIds`; una tarjeta inventada o con otro nombre; un miembro asignando a un Invitado que no está en el proyecto.
- **Unitarios:** `can` con el Invitado, `projectPeople`, `assignableIn`, frases de auditoría.
- **Componentes:** menú del Invitado, "Nueva tarea" con proyecto obligatorio, mensaje sin proyectos, "Personas del proyecto" (agregar, quitar con confirmación), Equipo con el rol nuevo.
- **Prueba real:** una cuenta Invitado (con "copiar enlace de invitación", porque SES está en sandbox).

## 8. Entrega

- **9A — Rol, datos y reglas:** rol `guest`, `memberIds` y tarjetas, reglas y sus tests, escrituras auditadas que mantienen las tarjetas, lectura según el rol, `can`, email de resumen. Un Invitado ya entra y ve solo lo suyo con las pantallas adaptadas (menú, Nueva tarea, Proyectos sin acciones). Preview.
- **9B — Pantallas:** "Personas del proyecto" (agregar/quitar), Equipo con el rol nuevo y sus proyectos, mensaje sin proyectos, frases de auditoría. Preview, README, AI_LOG y `CLAUDE.md`.
- **Al integrar a `main`:** las reglas nuevas y los índices (si hiciera falta alguno para `collectionGroup('people')` por `uid`).
