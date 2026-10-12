# MateCode Tasks v2 — Etapa 8: Ajustes y auditoría

- **Fecha:** 2026-10-13
- **Rama:** `v2`
- **Depende de:** etapas 1 (auditoría), 2 (tokens de marca), 4 (imagen achicada en el navegador), 5 (número de tarea)
- **Estado:** aprobado por partes en conversación; pendiente revisión final

## 0. Objetivo

Que el admin personalice el espacio (nombre, logo, colores, prefijo de número) con garantía de accesibilidad, y que pueda revisar y exportar toda la auditoría. Además: encabezados y filtros fijos al desplazar, corrección de dos contrastes existentes y el pie "Desarrollado por Imago Design".

## 1. Decisiones

| Tema | Decisión |
|---|---|
| Acceso | Solo admin. Para miembros y lectores, Ajustes no aparece en el menú. Las reglas lo garantizan. |
| Colores | Los 5 libres, con vista previa en vivo; avisos de contraste que bloquean guardar; "Restaurar paleta original". |
| Logo y nombre | Se ven en el menú, la barra del celular y el login. La configuración se puede **leer sin sesión** (es pública); solo el admin escribe. |
| Pie de la desarrolladora | "Desarrollado por Imago Design", fijo en login y dentro de la app; **no configurable** desde Ajustes. Texto hasta que la usuaria comparta su logo y enlace. |
| Prefijo | Solo cambia cómo se muestra el número (1–5 letras o números en mayúscula). El buscador usa el prefijo vigente. |
| Auditoría | Pestaña "Auditoría" en Ajustes: lista en frases, filtros (tipo, persona, fechas), de a 50 con "Cargar más", detalle antes → después, "Exportar CSV". |
| Encabezados fijos | Computadora: encabezado + filtros fijos en Mis tareas, proyecto, Proyectos, Calendario y Ajustes; el contenido se desplaza. Celular: fijos encabezado, búsqueda y filtros; las tarjetas de números se desplazan. |
| Contraste existente | Texto "info" (3.97:1) y la inicial del avatar (4.13:1) se corrigen; el test cubre todas las combinaciones que dependen de la paleta. |

## 2. Datos y reglas

### `settings/workspace`

| Campo | Regla |
|---|---|
| `name` | string 1–60 |
| `logo` | `null` o `^data:image/png;base64,` ≤ 100 000 caracteres |
| `palette` | lista de 5 strings `^#[0-9A-Fa-f]{6}$` |
| `taskPrefix` | `^[A-Z0-9]{1,5}$` |
| `updatedAt`, `updatedBy`, `rev` | como el resto de documentos auditados |

- `read: if true` (lo necesita el login). `create`/`update`: `isAdmin()` + validación + `audited('settings', 'workspace', rev)`. `delete: false`.
- Auditoría: `entityType` suma `'settings'` (en `entityPath` y `validAudit`). Solo el admin la lee (ya lee toda la auditoría).
- Sin documento: valores por defecto (paleta original, "MateCode Tasks", sin logo, "MC").

## 3. Lógica pura

| Función | Ubicación | Qué hace |
|---|---|---|
| `mixColors(a, b, weight)` | `src/utils/color.ts` | Igual que `color-mix(in srgb, a weight%, b)` |
| `paletteChecks(palette)` | `src/features/settings/paletteChecks.ts` | Lista de `{ label, ratio, ok }` para todas las combinaciones de texto que dependen de la paleta (las mismas que usa `tokens.css`) |
| `DEFAULT_SETTINGS`, `isValidPrefix` | `src/features/settings/defaults.ts` | Valores por defecto y validación |
| `imageToLogo(file)` | `src/features/settings/logoImage.ts` | PNG con transparencia, cabe en 240×64 sin deformar |
| `formatTaskNumber(n, prefix)` | existente | Recibe el prefijo |
| `describeAuditEntry(entry, ctx)` | `src/features/audit/describeAuditEntry.ts` | Frases para tareas (usa `describeChange`), proyectos, usuarios, invitaciones y ajustes |
| `auditToCsv(rows)` | `src/features/audit/auditCsv.ts` | CSV con comillas, escape y protección contra fórmulas |

`paletteChecks` mide, como mínimo: blanco sobre color 1; color 1 sobre color 5; texto atenuado del menú sobre color 1; link (color 2 + 15% negro) sobre blanco y sobre el fondo verdoso; éxito sobre su fondo; info sobre su fondo; inicial del avatar sobre su fondo; título (color 1) sobre el fondo verdoso. Los tokens de `info` y del avatar se ajustan para que la paleta original pase todos.

## 4. Interfaz

| Unidad | Responsabilidad |
|---|---|
| `WorkspaceSettingsProvider` + `useWorkspaceSettings()` | Suscripción en tiempo real (también sin sesión), aplica la paleta a `:root` y expone nombre, logo y prefijo |
| `BrandMark` | Usa logo y nombre del espacio |
| `CreditsFooter` | "Desarrollado por Imago Design" (login, menú lateral, final de página en celular) |
| `SettingsPage` (`/settings`) | Pestañas General / Auditoría (solo admin; `AdminRoute`) |
| `GeneralSettings` | Identidad, Colores (selectores + `PalettePreview` + avisos), Numeración; "Guardar cambios" deshabilitado si hay problemas de contraste |
| `AuditPage` (pestaña) | Filtros, lista, "Cargar más", detalle (`AuditEntryDialog`), "Exportar CSV" |
| `navItems` | Ajustes `to: '/settings'` solo para admin; para el resto no se incluye |
| Encabezados fijos | `PageHeader` + barras de filtros en un contenedor `position: sticky` (debajo de la barra del celular) |

## 5. Tests

- **Reglas:** ajustes legibles sin sesión; solo admin escribe; validación de nombre, logo, paleta y prefijo; auditoría obligatoria.
- **Unitarios:** `mixColors`, `paletteChecks` (la paleta original pasa; una paleta mala falla con el motivo), `isValidPrefix`, `formatTaskNumber` con prefijo, `describeAuditEntry` por tipo, `auditToCsv` (escape y fórmulas), contraste de tokens (todas las combinaciones).
- **Componentes:** `GeneralSettings` (guardar, bloqueo por contraste, restaurar), `AuditPage` (filtros, cargar más, detalle, exportar), `navItems`/menú sin Ajustes para no admin, `CreditsFooter` en login y app, `BrandMark` con logo.

## 6. Entrega

- **8A:** contraste existente, datos y reglas de ajustes, tema en vivo, Ajustes General, prefijo, logo y nombre, pie Imago Design, encabezados fijos. Preview.
- **8B:** frases de auditoría, página de auditoría, CSV. Preview, README, AI_LOG y `CLAUDE.md`.
