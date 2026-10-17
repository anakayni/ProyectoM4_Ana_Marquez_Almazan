# MateCode Tasks v2 — Etapa 10: Rediseño visual

- **Fecha:** 2026-10-16
- **Rama:** `v2`
- **Depende de:** etapas 2 (marco, tokens), 3–6 (pantallas), 8 (encabezados fijos), 9 (personas del proyecto, compartir)
- **Estado:** aprobado por partes en conversación, con maquetas (`.superpowers/brainstorm/…/content/`: `tareas-tablero.html`, `proyectos.html`, `proyecto-pagina.html`, `calendario-equipo-ajustes.html`)

## 0. Objetivo

Que toda la app se vea como un producto hecho a mano y no "hecha con IA": menos bloques de color y tarjetas de números, más jerarquía con grises, aire y un mismo lenguaje en todas las pantallas. Referencia de la usuaria: tablero de tareas tipo "Oripio – Design Tasks".

## 1. Decisiones

| Tema | Decisión |
|---|---|
| Alcance | Toda la app, **por partes** con preview en cada una. |
| Menú lateral | **Sigue azul oscuro** (color 1 de la paleta) con la sección activa en verde lima. |
| Encabezado de página | Título + una frase corta debajo + botón principal a la derecha (y secundarios a su izquierda). |
| Vistas | **Pestañas con ícono y línea debajo de la activa** (Tablero · Lista · Tabla; Mes · Gantt; Activos · Archivados; Integrantes · Invitaciones; General · Auditoría). |
| Vista principal de tareas | **Tablero** (Mis tareas y página de proyecto). |
| Tarjetas de números | **Se eliminan** (Pendientes / En curso / Hechas / Vencidas). Los conteos van en el título de cada columna del tablero. |
| Filtros | Detrás de un botón **"Filtros"** (ícono de embudo) que abre un panel; con filtros activos dice "Filtros · N". Dentro: Mostrar (Mías / Todo el equipo / Sin asignar), Prioridad, Proyecto (en Mis tareas), **Solo vencidas**, Ordenar por, "Limpiar filtros", "Listo". A la vista quedan solo las pestañas, el buscador, "Filtros" y el botón principal. |
| Tarjeta de tarea (tablero) | Número + prioridad arriba; título; descripción en 2 líneas; barra de avance de subtareas (si tiene); "Asignada a" + cara; al pie fecha (roja si vencida) y etiqueta del proyecto. Hechas: tachadas y en gris. "+ Agregar tarea" punteado al pie de Pendiente y En curso (crea con ese estado). |
| Tarjeta de proyecto | Cuadradito de color + nombre; descripción en 2 líneas; "Avance" con % y barra del color del proyecto (Lector/Invitado: "N tareas abiertas", sin barra); "Personas" con caras superpuestas y "N+"; **sin "A cargo"**; al pie con íconos: fecha de fin (roja + "Atrasado" si pasó), tareas hechas/total (Lector/Invitado: abiertas), cantidad de personas. Buscador de proyectos. |
| Página del proyecto | "← Proyectos", cuadradito + nombre, descripción, Editar · Archivar · + Nueva tarea; fila de datos con títulos chicos: Fechas, Avance, Personas del proyecto (caras + "+" punteado del admin). Debajo, lo mismo que Mis tareas. |
| Compartir proyecto | Como la maqueta: enlace + Copiar, buscador, "En este proyecto" con "Tú", "Responsable", selector de acceso del Invitado, "Hacer responsable", "Quitar"; pie "Listo". |
| Calendario | Pestañas Mes · Gantt; a la derecha mes con ‹ ›, "Hoy" y "Filtros"; grilla más limpia (hoy en azul, vencidas en rojo, hechas tachadas). |
| Equipo | Pestañas Integrantes · Invitaciones (N); lista tipo tabla: Persona (cara, nombre, email, "Tú"), Rol (selector del admin), Tareas abiertas, Proyectos (Invitado: los suyos; resto: "Todos"), acción (Desactivar/Reactivar). Buscador de personas. |
| Ajustes | Pestañas General · Auditoría; secciones en bloques (título y explicación a la izquierda, campos a la derecha): Identidad, Colores, Numeración; "Guardar cambios" arriba a la derecha. |
| Datos | Solo datos reales: sin adjuntos ni comentarios (no existen). |
| Accesibilidad | Contraste ≥ 4.5:1 (tokens con test), pestañas como enlaces/radios accesibles, panel de filtros con foco y Escape, todo con teclado. |

## 2. Unidades nuevas o que cambian

| Unidad | Responsabilidad |
|---|---|
| `PageHeader` (cambia) | Título, descripción, acciones (primaria a la derecha). |
| `ViewTabs` (nuevo) | Pestañas con ícono y línea; accesibles como grupo de radios (reemplaza a `SegmentedControl` donde se cambia de vista). |
| `FiltersPopover` (nuevo) | Botón "Filtros · N" + panel con los filtros; cierra con "Listo", Escape o clic afuera. |
| `TaskBoard` / `TaskCard` (cambia) | Tarjeta de tarea del tablero según la maqueta; "+ Agregar tarea" por columna. |
| `TaskWorkspace` (cambia) | Sin `TaskStats`; vista por defecto `board`; filtro "Solo vencidas". |
| `ProjectCard` (cambia), `ProjectsPage` | Tarjeta nueva y buscador. |
| `ProjectPage` (cambia) | Encabezado con fila de datos. |
| `CalendarPage`, `TeamPage`, `MemberRow`, `SettingsPage`, `GeneralSettings` | Estilo nuevo, pestañas, filtros, tabla de equipo, bloques. |
| Tokens | Grises de fondo y bordes de la maqueta (`--color-surface-page`, `--color-border-soft`), radios y sombras; los colores de marca siguen viniendo de la paleta configurable. |

## 3. Tests

- Componentes nuevos: `ViewTabs` (selección, teclado), `FiltersPopover` (contador, abrir/cerrar, Escape, limpiar).
- `TaskWorkspace`: tablero por defecto, sin tarjetas de números, "Solo vencidas", "+ Agregar tarea" crea con el estado de la columna.
- Tarjetas de tarea y de proyecto: datos de la maqueta (y su variante sin hechas).
- Los tests existentes se ajustan a los nuevos controles (pestañas en lugar de `SegmentedControl`, filtros dentro del panel).
- Contraste de los tokens nuevos.

## 4. Entrega

- **10A — Marco y tareas:** tokens, `PageHeader`, `ViewTabs`, `FiltersPopover`, Mis tareas y la parte de tareas de la página de proyecto (tablero principal, tarjeta nueva, sin tarjetas de números). Preview. Incluye la documentación pendiente de la 9D.
- **10B — Proyectos:** tarjetas, buscador, encabezado de la página del proyecto, diálogo "Compartir proyecto" con el estilo de la maqueta. Preview.
- **10C — Calendario, Equipo y Ajustes.** Preview, README, AI_LOG y `CLAUDE.md`.
