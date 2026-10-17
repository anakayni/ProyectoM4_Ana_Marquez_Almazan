# MateCode Tasks — contexto para Claude Code

Leer esto antes de trabajar. El detalle de cada etapa está en `docs/specs/` (diseño) y `docs/plans/` (plan); README y AI_LOG cuentan el resultado.

## Qué es

SPA de tareas para una pyme (React 19 + TS + Vite, Firebase Auth + Firestore, Vercel Functions + AWS SES). Empezó como entrega del M4 de Soy Henry (rama `main`, en producción) y sigue como **v2 de portafolio en la rama `v2`**, por etapas.

## Entornos (no mezclar)

| | Producción | Desarrollo |
|---|---|---|
| Rama | `main` | `v2` |
| Firebase | `matecode-tasks-dc1e1` | `matecode-tasks-dev` |
| URL | matecode-tasks-sandy.vercel.app | matecode-tasks-dev.vercel.app (alias de una preview, protegida por Vercel) |

- **Producción no se toca** hasta integrar la v2 (migración + reglas + admin inicial en prod).
- `.env` = desarrollo; `.env.produccion` = respaldo de prod. Nunca se commitean ni se imprimen valores.
- Costo $0: Firebase Spark, Vercel Hobby, SES sandbox, **sin Firebase Storage** (las fotos van en Firestore).

## Comandos

- `npm test` · `npm run build` · `npm run lint` (oxlint) — los tres en verde antes de cada commit.
- `npm run test:rules` — reglas contra el emulador (Java 21 en `/opt/homebrew/opt/openjdk@21`).
- `npm run migrate-tasks` — migra tareas al formato actual con auditoría y ajusta `counters/tasks` (solo dev; `--confirmar-produccion` para prod).
- `npm run bootstrap-admin -- email` — invitación del primer admin.
- `vercel dev --listen 3000` — app + funciones en local.
- Preview: `vercel --yes` y `vercel alias set <url> matecode-tasks-dev.vercel.app`; comprobar que prod responda 200.
- **Índices en dev:** la cuenta de servicio NO puede crearlos (403). Lo más fácil: correr la consulta con un script de solo lectura (admin SDK) y pasarle a Ana el enlace "create it here" que devuelve el error; si no, consola de Firebase según `firestore.indexes.json`.
- **Publicar reglas en dev:** `firebase deploy` da 403; se usa un script temporal en el scratchpad que llama a la API de Firebase Rules (`POST …/rulesets` + `PATCH …/releases/cloud.firestore`) con la cuenta de servicio del `.env`, se niega si el proyecto no es `matecode-tasks-dev`, y se borra al terminar.

## Arquitectura (lo esencial)

- Capas: componente → hook → `services/` → `services/audited/` (escrituras). Los tests mockean servicios/hooks; nunca Firebase real.
- **Auditoría obligatoria:** cada escritura (task, project, invitation, user, settings) va en batch/transacción con `auditLog/{tipo}_{id}_{rev}` (`before`/`after`); las reglas lo exigen y verifican. `auditLog` es solo-agregar.
- Roles: admin / member / viewer / guest. `can()` y `seesDoneTasks()` en `src/features/auth/permissions.ts` reflejan `firestore.rules`.
- Invitado: solo proyectos con su uid en `memberIds`; personas = `memberIds` ∪ `ownerId`; lee tarjetas `projects/{id}/people/{uid}` (validadas contra `users`, se sincronizan con `syncPersonCards`). Lector e Invitado solo leen tareas `todo`/`doing`. Los hooks (`useTasks`, `useProjects`, `useTeamMembers`) piden según el rol; el Invitado usa `subscribeFanOut` por proyecto.
- Tareas: `status` todo/doing/done, `assigneeId`, `completedBy/At` (honestos por reglas), `projectId`, `number` (contador `counters/tasks`, transacción), `subtasks` (≤ 20).
- Proyectos: color libre, fechas, `ownerId`, `archived`; solo admin elimina (desvincula tareas).
- Pantallas: `TaskWorkspace` (Mis tareas y página de proyecto) + `TaskDialogs` (panel editable y "Nueva tarea", también en Calendario). Calendario: `MonthView`/`AgendaView` (CSS a 768px) y `GanttView`.
- Lógica pura en `src/features/*` con tests (`today` como parámetro, fechas `YYYY-MM-DD` locales).
- Estilos: CSS Modules + `src/styles/tokens.css` (paleta `--brand-1…5`, tokens semánticos). Componentes no usan hex. Texto ≥ 4.5:1 (test en `tests/unit/tokens.test.ts`); letra sobre colores de proyecto con `readableTextColor` (blanco/negro).

## Cómo trabajar con la usuaria (Ana)

- Todo en **español**, claro y sin jerga; ella es estudiante y quiere entender.
- Proceso: brainstorming (preguntas **de a una**, con recomendación) → maquetas si es visual → diseño en `docs/specs/` → plan en `docs/plans/` (etapas grandes: un plan por parte) → ejecución **tarea por tarea en este chat**, con TDD (ver fallar el test por el motivo correcto) y un commit por tarea → preview → ella prueba → README + AI_LOG.
- **Pedir aprobación antes de construir**; no avanzar de etapa sin su "sí".
- **Solo datos reales:** nada de métricas inventadas de los mockups (SLA, latencia, almacenamiento, "PRO", despliegues, guardias).
- Accesibilidad importa (ella lo pidió): etiquetas, contraste, teclado, sin arrastrar.
- Commits: Conventional Commits en español + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sin fechas retroactivas. Escanear secretos antes de push (repo público).
- En el AI_LOG, "Qué aprendí" lo escribe ella (se la ayuda con preguntas); no inventar sus aprendizajes.

## Estado (actualizar al cerrar cada etapa)

- ✅ Etapas 1 (roles, invitaciones, auditoría) · 2 (menú, paleta, login) · 3 (Mis tareas v2) · 4 (Equipo, Mi perfil) · 5 (proyectos, tabla, número, subtareas, panel editable) · 6 (calendario Mes y Gantt) · 8 (Ajustes: identidad, paleta con control de contraste, prefijo, pie Imago Design, encabezados fijos `StickyHeader`; auditoría con filtros, de a 50, detalle y CSV).
- ✅ Etapa 9 (Invitados por proyecto): rol `guest`, `memberIds` + tarjetas, "Personas del proyecto", Lector e Invitado sin tareas hechas (9C), tareas hechas tachadas/grises/al final.
- **Demo pública:** https://matecode-tasks-dev.vercel.app (protección de Vercel desactivada), cuenta `anakayni+demo@gmail.com` / `MateDemo-2026` (Lector, no cambiarle el rol). El README de `main` es de portafolio (inglés + español); la doc del M4 está en `docs/m4/`. Los cambios a `main` van por pull request.
- ✅ 9D: "Compartir proyecto" (`ShareProjectDialog`), caras (`AvatarGroup`), acceso del Invitado por proyecto `guestAccess` ('view' | 'edit', sin entrada = edit; nuevos en 'view'), se abre al crear un proyecto (admin).
- ✅ **Etapa 10: rediseño visual** (spec `docs/specs/2026-10-16-v2-etapa10-rediseno-design.md`, maquetas en `.superpowers/brainstorm/`). ✅ 10A (tareas: tablero principal, `ViewTabs`, `FiltersPopover`, `TaskCard`, sin tarjetas de números) · ✅ 10B (tarjetas de proyecto sin "A cargo" con pie de datos, buscador, encabezado del proyecto con fila de datos). ✅ 10C (Calendario con pestañas y filtros, Equipo como tabla con pestaña de invitaciones, Ajustes en bloques). Patrón de pantalla: `PageHeader` con `description` + barra (`ViewTabs` a la izquierda, buscador/`FiltersPopover` a la derecha) + contenido sobre `--color-surface-canvas`. Menú lateral: sigue azul oscuro.
- Pendiente de la usuaria: "Qué aprendí" de las etapas 4, 5, 6, 8, 9 y 10 en el AI_LOG; compartir su logo y el pie de Imago Design (link) para el interior.
- Al terminar la v2: integrar a `main` (migración de prod, reglas, **índices de `firestore.indexes.json`** (compuestos + la exención de `people.uid`), `settings/workspace` se crea al primer guardado, admin inicial).
