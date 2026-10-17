# MateCode Tasks v2 — Etapa 2: estructura, paleta y login

- **Fecha:** 2026-10-08
- **Rama:** `v2`
- **Depende de:** etapa 1 (roles, invitaciones y auditoría), ver `2026-10-08-v2-etapa1-roles-invitaciones-auditoria-design.md`
- **Estado:** aprobado por partes en conversación (con maquetas); pendiente revisión final

## 0. Objetivo

Primera etapa visual de la v2: un marco común con menú lateral para todas las páginas internas, la paleta de la usuaria aplicada a toda la app y el login en pantalla dividida. No agrega datos nuevos ni cambia Firestore.

## 1. Decisiones

| Tema | Decisión |
|---|---|
| Secciones del menú | Las 5 visibles desde ya: Mis tareas, Proyectos, Calendario, Equipo, Ajustes. Las que no existen se muestran desactivadas con la etiqueta "Próximamente". |
| Equipo | Activa para el admin (pantalla de invitaciones de la etapa 1). Para miembro y lector, "Próximamente" hasta la etapa 4. |
| Escritorio (≥ 768px) | Menú lateral fijo a la izquierda; usuario (inicial, nombre, rol, "Cerrar sesión") al pie del menú. |
| Celular (< 768px) | Barra superior con logo y la inicial del usuario (abre un menú con nombre, rol y "Cerrar sesión"); barra de 5 pestañas abajo. |
| Colores | Opción A de las maquetas: menú en `#1B4079`, sección activa en `#CBDF90` con texto `#1B4079`, fondo de contenido claro verdoso, botones principales `#1B4079`. |
| Login | Pantalla dividida, opción A: panel azul con logo, frase y "Acceso solo con invitación del administrador"; formulario a la derecha. En celular, franja azul arriba. |
| Íconos | `lucide-react` (gratuita, solo se incluyen los íconos importados). |
| Logo | Cuadrado `#CBDF90` + "MateCode Tasks". El logo propio llega en la etapa 8. |
| Tipografía | Se mantiene IBM Plex Sans. |

## 2. Paleta y tokens

`src/styles/tokens.css` suma una capa de marca con 5 variables:

| Variable | Color | Uso |
|---|---|---|
| `--brand-1` | `#1B4079` | Menú, botones principales, títulos, foco |
| `--brand-2` | `#4D7C8A` | Links, textos de apoyo (rol, metadatos) |
| `--brand-3` | `#7F9C96` | Bordes fuertes, elementos atenuados |
| `--brand-4` | `#8FAD88` | Éxito / completado, avatar |
| `--brand-5` | `#CBDF90` | Sección activa, logo, detalles |

Los tokens semánticos que ya consumen los componentes (`--color-action-primary`, `--color-text-link`, `--color-surface-subtle`, `--focus-ring-color`, `--color-status-success`, etc.) pasan a apuntar a la marca. Los tonos claros (fondos, bordes, hover) se derivan con `color-mix(in srgb, var(--brand-N) X%, white)`. Así, en la etapa 8 cambiar los 5 valores de `--brand-*` en `:root` recolorea toda la app.

Se agregan tokens del marco: `--color-nav-bg`, `--color-nav-text`, `--color-nav-active-bg`, `--color-nav-active-text`.

**Se mantienen:** rojo para errores/peligro y prioridad "Alta"; ámbar para advertencias.

**Contraste (WCAG AA, texto normal ≥ 4.5:1):** blanco sobre `#1B4079` ✓; `#1B4079` sobre `#CBDF90` ✓; blanco sobre `#4D7C8A` ✓ (≈ 4.6). `#CBDF90` y `#8FAD88` **no** se usan como color de texto sobre fondo claro.

## 3. Estructura

### Rutas

```
/login, /register, /verify-email, /no-access     → sin marco (AuthLayout)
RequireAccess allow=['active'] → AppShell (layout route con <Outlet />)
  ├─ /tasks                       → TasksPage
  └─ /team   (AdminRoute)         → InvitePage
/team/invite                      → <Navigate to="/team" replace />
*                                 → /tasks
```

### Unidades

| Unidad | Responsabilidad |
|---|---|
| `src/features/navigation/navItems.ts` | Función pura `navItems(profile): NavItem[]`. `NavItem = { key, label, shortLabel, icon, to: string \| null }`; `to === null` significa "Próximamente". |
| `src/components/layout/AppShell.tsx` | Marco: `Sidebar` (escritorio) o `MobileTopBar` + `BottomTabs` (celular), y `<Outlet />`. Muestra un toast "Próximamente" cuando se toca una sección pendiente en las pestañas. |
| `src/components/layout/Sidebar.tsx` | Logo, lista de secciones (`NavLink` con `aria-current="page"` o botón con `aria-disabled="true"` + etiqueta "Próximamente"), bloque de usuario al pie con "Cerrar sesión". |
| `src/components/layout/BottomTabs.tsx` | 5 pestañas con ícono y `shortLabel`; las pendientes atenuadas y llaman a `onUnavailable`. |
| `src/components/layout/MobileTopBar.tsx` | Logo y botón con la inicial; abre `UserMenu`. |
| `src/components/layout/UserMenu.tsx` | Menú desplegable: nombre, rol, "Cerrar sesión". Se cierra con Escape, clic fuera o al elegir. Botón disparador con `aria-expanded` / `aria-haspopup`. |
| `src/components/layout/PageHeader.tsx` | Título (`h1`), subtítulo opcional y acciones de la página. |
| `src/components/layout/BrandMark.tsx` | Logo (cuadrado + nombre); compartido por el marco y el login. |
| `src/components/auth/AuthLayout.tsx` | Dos columnas: panel de marca + formulario. Misma API que hoy (`title`, `subtitle`, `children`, `footer?`). |

Ambas variantes del marco (escritorio y celular) se renderizan y CSS decide cuál se ve con una media query; así no hace falta JavaScript para detectar el ancho y los tests no dependen del tamaño de pantalla. La variante oculta usa `display: none`, que también la saca del árbol de accesibilidad.

### Cambios en páginas

- **TasksPage:** quita marca, saludo, rol, link de invitar y "Cerrar sesión". Usa `PageHeader` con título "Mis tareas", subtítulo con los conteos reales ("N pendientes · N completadas") y acción "Enviar resumen por email". El resto (formulario, alerta de solo lectura, filtros, lista, modal) sigue igual con los nuevos colores.
- **InvitePage:** quita el link "← Volver a las tareas" (ahora está el menú) y usa `PageHeader` con título "Equipo".
- **Login, registro, verificar email, sin acceso:** sin cambios de código propio; heredan el nuevo `AuthLayout`.

## 4. Accesibilidad

- `nav` con `aria-label="Principal"` en el menú lateral y en las pestañas.
- Sección actual con `aria-current="page"`.
- Pendientes: `aria-disabled="true"` y texto "Próximamente" visible (no solo color).
- Foco visible con `--focus-ring-color` (azul de marca) en todos los controles del marco.
- `UserMenu` operable con teclado; Escape cierra y devuelve el foco al botón.

## 5. Tests

- **Unitarios:** `navItems` — orden y etiquetas de las 5 secciones; Equipo con `to: '/team'` para admin y `null` para miembro y lector; Proyectos, Calendario y Ajustes siempre `null`.
- **Componentes:**
  - `AppShell`: nombre y rol del usuario; "Cerrar sesión" llama a `logout`; sección actual con `aria-current`; pendientes con `aria-disabled`; tocar una pestaña pendiente muestra "Próximamente"; renderiza la página hija.
  - `UserMenu`: abre/cierra, Escape, clic fuera, "Cerrar sesión".
  - `AuthLayout`: muestra el aviso de acceso por invitación y el contenido.
  - `routes`: `/team/invite` redirige a `/team`; `/team` solo para admin.
  - Ajuste de los tests existentes de `TasksPage`/`InvitePage` que buscaban "Cerrar sesión" o "Invitar personas" dentro de la página.
- **Manual:** escritorio y celular (DevTools y teléfono real) en local y en la preview `matecode-tasks-dev.vercel.app`.

## 6. Fuera de alcance

- Contenido de Proyectos (etapa 5), Calendario (6 y 7), Equipo para no-admin (4) y Ajustes (8).
- Cambiar colores y logo desde la app (etapa 8).
- Buscador y tarjetas con números en Mis tareas (etapa 3).
- Modo oscuro y notificaciones.

## 7. Entrega

Commits chicos en `v2`, deploy de preview (`vercel` sin `--prod`, alias `matecode-tasks-dev.vercel.app`), README (sección v2) y AI_LOG ("v2 — Etapa 2"). Producción no cambia.
