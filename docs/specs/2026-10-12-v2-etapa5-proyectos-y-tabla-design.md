# MateCode Tasks v2 — Etapa 5: Proyectos y tareas en tabla

- **Fecha:** 2026-10-12
- **Rama:** `v2`
- **Depende de:** etapas 1 (auditoría), 3 (tareas v2, historial) y 4 (integrantes, avatar)
- **Estado:** aprobado por partes en conversación (con maquetas basadas en el mockup de la usuaria); pendiente revisión final

## 0. Objetivo

Agrupar las tareas en proyectos con progreso real, y llevar la vista de tareas al diseño del mockup de la usuaria (tabla, número de tarea, subtareas, panel editable, búsqueda y filtros), solo con datos reales y con mejor accesibilidad.

Del mockup **no** se construye: banner "Firebase Live", latencia, almacenamiento, "PRO", "SLA", "+2 esta semana", botón de email por tarea, colores violetas (se usa la paleta).

## 1. Decisiones

| Tema | Decisión |
|---|---|
| Permisos de proyectos | Ver: todos los activos. Crear, editar, archivar: admin y miembro. Eliminar: solo admin. Todo con confirmación. |
| Eliminar proyecto | Sus tareas quedan "Sin proyecto" (no se borran); cada una con su auditoría. |
| Progreso | Tareas hechas / total. Detalle por estado. "Atrasado" si pasó la fecha de fin sin llegar al 100%. |
| Página del proyecto | `/projects/:id` con encabezado y sus tareas en las mismas vistas que Mis tareas. |
| Persona a cargo | `ownerId`, admin o miembro activo (se valida solo al cambiar). |
| Color | Selector libre (`<input type="color">`) con los 5 colores de la paleta como atajos. Letra blanca u oscura según la luminancia. |
| Número de tarea | `MC-{n}` con contador del espacio; nunca se repite. |
| Subtareas | Hasta 20 por tarea, dentro del documento de la tarea. |
| Vistas de tareas | Lista, Tabla y Tablero. Las tarjetas de números se mantienen arriba (no se agregan botones con cantidades). |
| Panel | Editable, con "Guardar cambios" (una escritura y una entrada de historial) y aviso al descartar. |
| Búsqueda y filtros | Buscador (título, descripción, número) + filtros de Prioridad y Proyecto. |
| Accesibilidad | Texto atenuado y placeholders con contraste ≥ 4.5:1; test automático de contraste. |
| Fuera | Etiquetas, selección múltiple, arrastrar en el tablero. |

## 2. Datos y reglas

### `projects/{id}`

| Campo | Regla |
|---|---|
| `name` | string 1–80 |
| `description` | string ≤ 500 |
| `color` | `^#[0-9A-Fa-f]{6}$` |
| `ownerId` | string; al crear o cambiar: `users/{ownerId}` activo con rol admin o member |
| `startDate`, `endDate` | `YYYY-MM-DD` (size 10); `endDate >= startDate` (comparación de texto) |
| `archived` | bool |
| `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `rev` | igual que `tasks` |

- `read`: `isActive()`. `create`/`update`: `canEdit()` + validación + auditoría (`audited('project', id, rev)`). `delete`: `isAdmin()` + auditoría.
- Auditoría: `entityType` suma `'project'` en `validAudit` y `entityPath`; `auditLog` se puede leer si `isAdmin()` o (`isActive()` y `entityType in ['task', 'project']`).

### `tasks/{id}` (campos nuevos)

| Campo | Regla |
|---|---|
| `projectId` | `null` o string; al crear o cambiar a un valor no nulo: el proyecto existe y `archived == false` |
| `number` | int ≥ 1; en `create` debe ser igual a `counters/tasks.next` antes de la escritura, y `getAfter(counters/tasks).next == number + 1`; no cambia nunca |
| `subtasks` | lista de hasta 20 `{ id: string, title: string 1–120, done: bool }` |

### `counters/tasks`

`{ next: int }`. `read`: activos. `update`: `canEdit()` y `next == resource.next + 1`. `create`/`delete`: nadie desde la app (lo crea la migración). No se audita (no es dato de negocio; el número de cada tarea queda en su propia auditoría).

### Escrituras

- `createTask` pasa de batch a **transacción** (lee el contador, asigna `number`, incrementa).
- `updateTask` acepta `projectId` y `subtasks` en el patch.
- `src/services/audited/projects.ts`: `createProject`, `updateProject`, `deleteProject` (borra el proyecto y desvincula sus tareas; si hay más de 240 tareas, desvincula en lotes y borra al final).

### Migración

`migrateTask` suma `projectId: null`, `subtasks: []` y el número; el script asigna números por `createdAt` y crea `counters/tasks` con el siguiente. Solo `matecode-tasks-dev` (salvo `--confirmar-produccion`).

## 3. Lógica pura

| Función | Qué hace |
|---|---|
| `projectProgress(tasks, endDate, today)` | `{ total, todo, doing, done, percent, late }` |
| `readableTextColor(hex)` | `'#FFFFFF'` o `'#000000'` según contraste |
| `contrastRatio(a, b)` | razón de contraste WCAG entre dos hex (para el test de tokens) |
| `formatTaskNumber(n)` | `'MC-108'` |
| `searchTasks(tasks, query)` | coincide por título, descripción o número (`'mc-108'`, `'108'`), sin distinguir mayúsculas ni acentos |
| `filterByPriority`, `filterByProject` | filtros simples (`projectId === null` para "Sin proyecto") |
| `subtaskProgress(subtasks)` | `{ done, total, percent }` |
| `describeChange` | suma frases para `projectId` ("movió la tarea a «Portal»" / "quitó el proyecto") y subtareas ("agregó la subtarea «X»", "completó la subtarea «X»", "quitó la subtarea «X»") |

## 4. Interfaz

| Unidad | Responsabilidad |
|---|---|
| `ProjectsPage` | Tarjetas (`ProjectCard`), selector Activos / Archivados, "+ Nuevo proyecto" (admin y miembro) |
| `ProjectCard` | Color, nombre, fechas o "Atrasado", barra de progreso, "N de M hechas", detalle por estado, persona a cargo |
| `ProjectDialog` | Crear / editar: nombre, descripción, fechas, persona a cargo, color (atajos + selector) |
| `ProjectPage` (`/projects/:id`) | Encabezado (color, fechas, persona a cargo, progreso) con Editar / Archivar-Reactivar / Eliminar (admin); debajo, las vistas de tareas filtradas por el proyecto |
| `TaskWorkspace` | Lo que hoy arma `TasksPage` (alcance, buscador, filtros, tarjetas, vistas, panel, crear), reutilizable con un `projectId` fijo |
| `TaskTable` | Tabla: # · Tarea (título, descripción, subtareas) · Prioridad y proyecto · Vence · Asignado; en celular, tarjetas |
| `ProjectTag` | Etiqueta con el color del proyecto y letra legible |
| `TaskDetailPanel` | Pasa a ser un formulario editable con subtareas, "Guardar cambios", "Eliminar" y aviso al descartar |
| `navItems` | Proyectos con `to: '/projects'` |

Accesibilidad: tabla con `<table>` y encabezados `<th scope="col">`; filas con botón en el título para abrir el panel; checkboxes de subtareas con etiqueta; `--color-text-muted` pasa a `#636A65`; `::placeholder` usa `--color-text-muted`; `tests/unit/tokens.test.ts` verifica contraste ≥ 4.5:1 de los textos sobre `#FFFFFF` y el fondo verdoso.

## 5. Tests

- **Reglas:** proyecto (crear, editar, archivar por miembro; eliminar solo admin; lector nada; color y fechas inválidos; persona a cargo lector rechazada; auditoría obligatoria); tarea en proyecto archivado rechazada; contador (número distinto al contador rechazado, contador que no sube rechazado, número inmutable); más de 20 subtareas rechazado; lectura del historial de proyectos.
- **Unitarios:** todas las funciones de §3; migración con números; contraste de tokens.
- **Componentes:** `ProjectCard`, `ProjectDialog`, `ProjectsPage` (admin/miembro/lector), `ProjectPage` (eliminar solo admin, confirmaciones), `TaskTable`, `TaskDetailPanel` (guardar, descartar, subtareas, permisos), buscador y filtros, rutas.

## 6. Entrega

- **5A:** contraste, proyectos (datos, reglas, pantallas), `projectId` en tareas, `TaskWorkspace` y página del proyecto. Preview.
- **5B:** número de tarea, subtareas, tabla, panel editable, búsqueda y filtros de prioridad y proyecto, migración. Preview, README y AI_LOG.
