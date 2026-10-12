# MateCode Tasks v2 — Etapa 6: Calendario (Mes y Gantt)

- **Fecha:** 2026-10-12
- **Rama:** `v2`
- **Depende de:** etapas 3 (tareas, panel) y 5 (proyectos, panel editable)
- **Estado:** aprobado por partes en conversación (con maquetas basadas en el mockup de la usuaria); pendiente revisión final
- **Nota:** reúne las etapas 6 (Mes) y 7 (Gantt) del plan general; se entrega en dos partes (6A y 6B).

## 0. Objetivo

Una sección Calendario con dos pestañas: **Mes** (tareas por vencimiento e inicio/fin de proyectos; agenda en celular) y **Gantt** (proyectos como barras de inicio a fin con su progreso real y las tareas en su vencimiento). Solo datos que ya existen: no se agregan colecciones, reglas ni migraciones.

Del mockup **no** se construye: sprints, hitos/eventos propios ("Añadir Hito / Evento"), "Despliegues en Vercel", "Guardias y Equipo", "Capacidad", "Sync en vivo", ni arrastrar para cambiar fechas.

## 1. Decisiones

| Tema | Decisión |
|---|---|
| Datos | Tareas por `dueDate`; inicio y fin de cada proyecto. Sin eventos nuevos. |
| Crear | Botón "+" en cada día → "Nueva tarea" con ese vencimiento. |
| Mover | No se arrastra; la fecha se cambia en el panel de la tarea (o "Editar" en el proyecto). |
| Tareas hechas | Se ven tachadas; "Ocultar hechas" las saca (se recuerda). |
| Vencidas | Fondo rojo en Mes; ◆ rojo en Gantt. |
| Muchas tareas en un día | Se muestran hasta 3; "+N más" abre una ventana con todas las del día. |
| Filtros | Mías / Todo el equipo / Sin asignar (alcance de Mis tareas) y Proyecto. |
| Pestañas | Mes y Gantt, recordadas. |
| Celular | Mes → agenda (solo días con contenido); Gantt → desplazamiento lateral con la columna de proyectos fija. |
| Gantt | Una fila por proyecto (activos por defecto; opción para incluir archivados), barra de inicio a fin con su color y % real, "Atrasado"; ◆ por tarea en su vencimiento; línea "Hoy"; 5 semanas, ‹ › y "Hoy". Las tareas sin proyecto no aparecen en Gantt. |

## 2. Lógica pura (`src/features/calendar/`)

| Función | Qué hace |
|---|---|
| `monthGrid(year, month, today)` | Semanas lunes a domingo que cubren el mes: `{ date: 'YYYY-MM-DD', inMonth, isToday }[][]` |
| `addMonths(year, month, delta)` | Mes anterior / siguiente |
| `tasksByDay(tasks)` | `Map<'YYYY-MM-DD', Task[]>` (solo con `dueDate`), ordenadas: no hechas primero, luego por número |
| `projectMarkers(projects)` | `Map<'YYYY-MM-DD', { project, kind: 'start' \| 'end' }[]>` |
| `agendaDays(grid, byDay, markers)` | Días del mes con contenido, en orden |
| `ganttRange(start, weeks)` | Lunes de inicio, fin y columnas `{ start, week }` (número de semana ISO) |
| `barPosition(startDate, endDate, range)` | `{ left, width }` en % recortado al rango, o `null` si no se cruza |
| `pointPosition(date, range)` | % dentro del rango, o `null` si queda fuera |
| `isoWeek(date)` | Número de semana ISO |

Todas reciben fechas `YYYY-MM-DD` y "hoy" como parámetro (sin depender del reloj).

## 3. Interfaz

| Unidad | Responsabilidad |
|---|---|
| `TaskDialogs` (`src/components/tasks/`) | Panel editable y ventana "Nueva tarea" extraídos de `TaskWorkspace`, reutilizables (abre por id; crea con valores iniciales: proyecto, vencimiento) |
| `CalendarPage` (`/calendar`) | Encabezado, pestañas Mes / Gantt, filtros, `TaskDialogs` |
| `MonthView` | `<table>` con días de la semana como `<th scope="col">`; cada celda: número del día, "+" (`aria-label="Nueva tarea el 12 de octubre"`), marcas de proyecto, hasta 3 tareas (botón con "MC-n título") y "+N más" |
| `DayDialog` | Ventana con todas las tareas y marcas de un día |
| `AgendaView` | Lista por día para celular; se muestra con CSS bajo 768px (MonthView se oculta) |
| `GanttView` | Encabezado de semanas, filas por proyecto (columna de nombre fija), barra como enlace a `/projects/:id` con `aria-label` completo, ◆ como botón con `aria-label` ("MC-8 Revisar login, vence 12 oct, Hecha"), línea "Hoy" decorativa con texto |
| `navItems` | Calendario con `to: '/calendar'` |

Colores: las barras y bordes usan el color del proyecto; el texto sobre ellas usa `readableTextColor`. Contraste ≥ 4.5:1 en todo texto.

## 4. Tests

- **Unitarios:** todas las funciones de §2 (meses que empiezan en domingo y en lunes, febrero bisiesto, cambio de año en `addMonths`, barras que empiezan antes o terminan después del rango, proyectos fuera del rango, semana ISO del 1 de enero y del 31 de diciembre).
- **Componentes:** `MonthView` (tareas en su día, hechas tachadas y ocultables, vencidas, "+" con fecha, "+N más" abre el día, clic abre el panel), `AgendaView`, `GanttView` (barras y ◆ con etiquetas, enlace al proyecto, navegación de semanas), `CalendarPage` (pestañas recordadas, filtros), `TaskDialogs` (mismo comportamiento que antes en Mis tareas).

## 5. Entrega

- **6A:** funciones del mes, `TaskDialogs`, `CalendarPage` con Mes, agenda y filtros; menú. Preview.
- **6B:** funciones del Gantt, `GanttView`. Preview, README y AI_LOG.
