# MateCode Tasks v2 — Etapa 3: Mis tareas v2

- **Fecha:** 2026-10-08
- **Rama:** `v2`
- **Depende de:** etapa 1 (roles, auditoría) y etapa 2 (marco, paleta)
- **Estado:** aprobado por partes en conversación (con maquetas); pendiente revisión final

## 0. Objetivo

Convertir "Mis tareas" en una herramienta de equipo: estado de 3 valores, un responsable por tarea, tarjetas con números reales que filtran, vistas Lista y Tablero, y un panel de detalle con el historial de cambios que ya guarda la auditoría.

## 1. Decisiones

| Tema | Decisión |
|---|---|
| Estados | `todo` (Pendiente), `doing` (En curso), `done` (Hecha). Reemplazan a `completed`. |
| Vistas | Lista y Tablero (3 columnas), con un botón para cambiar. Sin arrastrar: se cambia el estado con un selector ("Mover ▾" en el tablero). |
| Responsable | Una persona, opcional ("Sin asignar"). Solo administradores y miembros activos. |
| Alcance | Selector **Mías / Todo el equipo / Sin asignar**. Empieza en "Mías" (lectores: "Todo el equipo"). Se recuerda en el navegador. |
| Tarjetas | Pendientes, En curso, Hechas, Vencidas. Cuentan según el alcance elegido; clic = filtrar, otro clic = quitar. Reemplazan a los botones de filtro actuales. |
| Vencida | `status != 'done'` y `dueDate` anterior a hoy (fecha local). |
| Detalle | Clic en una tarea abre un panel lateral (pantalla completa en celular) con datos, Editar / Eliminar e historial en frases. |
| Crear | Botón "+ Nueva tarea" en el encabezado; abre la misma ventana del formulario que se usa para editar. |
| Orden | Se mantiene (más recientes, vencimiento, prioridad) en ambas vistas. |
| Email de resumen | Cuenta Pendientes, En curso y Hechas de las tareas **asignadas** a quien lo pide. |
| Proyecto | Fuera de esta etapa (etapa 5). |

## 2. Modelo de datos

### `tasks/{id}`

| Campo | Cambio |
|---|---|
| `completed` | **Se elimina** |
| `status` | **Nuevo:** `'todo' \| 'doing' \| 'done'` |
| `assigneeId` | **Nuevo:** `string \| null` (UID) |
| resto | Igual: `createdBy`, `title`, `description`, `priority`, `dueDate`, `createdAt`, `updatedAt`, `updatedBy`, `rev` |

Tipos: `TaskStatus`, `STATUS_LABEL`, `TaskInput` suma `assigneeId`; `TaskPatch` reemplaza `completed` por `status`.

### Reglas (`firestore.rules`)

- `validTask`: `hasOnly` con `status` y `assigneeId` en lugar de `completed`; `status in ['todo','doing','done']`; `assigneeId == null || assigneeId is string`.
- Responsable válido: si `assigneeId` cambia (o en `create`, si no es `null`), `users/{assigneeId}` debe existir, estar activo y tener rol `admin` o `member`.
- No se revisa el responsable cuando no cambia: una tarea asignada a alguien desactivado sigue siendo editable.
- Sin cambios en roles, borrado ni auditoría obligatoria.

### Migración (`scripts/migrate-tasks.mjs`, `npm run migrate-tasks`)

- Usa la cuenta de servicio del `.env` (como `bootstrap-admin`).
- Lógica de conversión en una función pura `migrateTask(doc)` en `src/features/tasks/migrateTask.ts` (sin imports, para que el script la use directamente: Node 24 ejecuta TypeScript simple), probada con tests:
  - Formato etapa 1: `completed` → `status` (`true` → `done`, `false` → `todo`), agrega `assigneeId: null`.
  - Formato producción (v1): además `userId` → `createdBy`, agrega `updatedBy` (= `createdBy`), `rev`.
  - Ya migrada (tiene `status`): no se toca.
- Cada tarea migrada sube `rev` y deja `auditLog/task_{id}_{rev}` con `actorId: 'system'`, `action: 'update'` (o `create` si no tenía `rev`), `before` y `after`.
- Muestra cuántas tareas migró y cuántas omitió; nunca imprime contenido.
- En esta etapa se corre solo en `matecode-tasks-dev`; producción se migra al integrar la v2 a `main`.

## 3. Lógica pura

| Función | Ubicación | Qué hace |
|---|---|---|
| `scopeTasks(tasks, scope, uid)` | `src/features/tasks/scopeTasks.ts` | `'mine'` → `assigneeId == uid`; `'team'` → todas; `'unassigned'` → `assigneeId == null` |
| `isOverdue(task, today)` | `src/features/tasks/taskStats.ts` | Vencida según la definición de §1 |
| `countTasks(tasks, today)` | `src/features/tasks/taskStats.ts` | `{ todo, doing, done, overdue }` |
| `filterByCard(tasks, card, today)` | `src/features/tasks/taskStats.ts` | `card: 'todo' \| 'doing' \| 'done' \| 'overdue' \| null` |
| `describeChange(entry, names)` | `src/features/audit/describeChange.ts` | Entrada de auditoría → frase en español, usando `diffSnapshots` |

`today` se pasa como parámetro (`YYYY-MM-DD`) para que los tests no dependan del reloj. Reemplazan a `filterTasks`/`countTasks` actuales.

Frases de `describeChange` (ejemplos):
- `create` → "Luis creó la tarea"
- `delete` → "Ana eliminó la tarea"
- `status` → "Ana cambió el estado de Pendiente a En curso"
- `assigneeId` → "Luis asignó a Ana" / "Luis quitó el responsable"
- `title`, `description`, `priority`, `dueDate` → "Ana cambió el título" (y similares; prioridad y vencimiento muestran antes → después)
- Varios campos en una misma entrada → una frase por campo.
- Actor desconocido o `system` → "Alguien" / "El sistema".

## 4. Interfaz

| Unidad | Responsabilidad |
|---|---|
| `TaskStats` | 4 tarjetas como botones (`aria-pressed`); "Vencidas" en rojo si > 0 |
| `ScopeSelector` | Grupo de 3 opciones (radio) |
| `ViewToggle` | Lista / Tablero (radio) |
| `StatusSelect` | `<select>` de estado con etiqueta accesible; solo texto para lectores |
| `TaskList` (adapta `TodoList`/`TodoItem`) | Inicial del responsable, prioridad, vencimiento, `StatusSelect`; clic en el título abre el detalle |
| `TaskBoard` | 3 columnas con conteo; tarjetas con título, prioridad, responsable y "Mover ▾" |
| `TaskDetailPanel` | Panel lateral (`<dialog>`): datos, Editar / Eliminar según permisos, `TaskHistory` |
| `TaskHistory` | Frases ordenadas de la más nueva a la más vieja, con fecha relativa |
| `TodoForm` | Suma el campo Responsable (opciones: "Sin asignar" + admins y miembros activos) |
| `useTeamMembers()` | Suscripción a `users` (todos los activos pueden leer) |
| `useTaskHistory(taskId)` | Consulta `auditLog` con `entityType == 'task'` y `entityId == id` (dos igualdades: no requiere índice compuesto); orden por `rev` en el cliente |
| `usePreference(key, initial)` | Valor recordado en `localStorage` (con try/catch) |

`TasksPage` arma: `PageHeader` (título, "Enviar resumen", "+ Nueva tarea" si puede crear) → barra (alcance + vista + orden) → `TaskStats` → `TaskList` o `TaskBoard` → `TaskDetailPanel` y `Modal` de crear/editar.

## 5. Servidor

- `functions/firebaseAdmin.ts`: `getTasksForUser` filtra por `assigneeId == uid`.
- `functions/summaryEmail.ts`: cuenta `todo`, `doing`, `done`; el texto dice "Pendientes", "En curso", "Hechas".

## 6. Entrega en dos partes

- **3A:** tipos y reglas (+ tests de reglas), migración (+ tests) y ejecución en dev, lógica pura, `useTeamMembers`, responsable en el formulario, "+ Nueva tarea", `ScopeSelector`, `TaskStats`, `StatusSelect` en la lista, email. Preview.
- **3B:** `ViewToggle`, `TaskBoard`, `describeChange`, `useTaskHistory`, `TaskHistory`, `TaskDetailPanel`. Preview, README y AI_LOG.

## 7. Tests

- **Reglas (emulador):** estado inválido rechazado; campo `completed` rechazado; asignar a lector / inactivo / inexistente rechazado; asignar a miembro activo permitido; editar tarea con responsable desactivado (sin cambiar responsable) permitido; auditoría sigue obligatoria.
- **Unitarios:** `migrateTask` (3 formatos), `scopeTasks`, `isOverdue`, `countTasks`, `filterByCard`, `describeChange`, `usePreference`.
- **Componentes:** `TaskStats` (conteos, `aria-pressed`, clic filtra y des-filtra), `ScopeSelector`, `StatusSelect` (cambia estado; lector solo ve texto), `TaskBoard` (columnas y conteos), `TaskDetailPanel` (datos, permisos, historial), `TodoForm` (responsable), email (`summaryEmail` con 3 estados).

## 8. Fuera de alcance

Proyecto de la tarea (etapa 5), arrastrar en el tablero, comentarios, notificaciones al asignar, subtareas, varias personas por tarea.
