# MateCode Tasks v2 — Etapa 4: Equipo y Mi perfil

- **Fecha:** 2026-10-09
- **Rama:** `v2`
- **Depende de:** etapa 1 (roles, invitaciones, `updateMember`), etapa 2 (marco, `Avatar`), etapa 3 (tareas con responsable)
- **Estado:** aprobado por partes en conversación (con maquetas); pendiente revisión final

## 0. Objetivo

Una sección Equipo para todos (quién está, qué rol tiene, cuántas tareas abiertas lleva), con la gestión del equipo para el admin, fotos de perfil sin costo y una forma clara de ver quién está desactivado.

## 1. Decisiones

| Tema | Decisión |
|---|---|
| Quién ve Equipo | Todos los activos. Miembros y lectores solo miran; el admin además invita, cambia roles y desactiva/reactiva. |
| Tareas de alguien desactivado | Quedan a su nombre. Antes de confirmar se avisa cuántas tareas sin terminar tiene. |
| Inactivo visible | Avatar en gris y atenuado + etiqueta "Inactiva" en Equipo; "(inactiva)" junto al nombre del responsable en tareas y panel. |
| Foto de perfil | Cada persona sube la suya; se recorta en cuadrado y se reduce a 128×128 JPEG en el navegador y se guarda en el perfil (Firestore). Sin foto: inicial. |
| Dónde se edita | "Mi perfil" (foto y nombre), desde el nombre al pie del menú lateral y desde el menú de la inicial en celular. |
| Invitar | Botón "+ Invitar" que abre una ventana (email, rol, link para copiar). |
| Fuera | Borrar personas, reasignar tareas en bloque, que el admin cambie nombre o foto de otra persona. |

## 2. Datos y reglas

### `users/{uid}`

Campo nuevo `photo: string | null` — data URL `data:image/jpeg;base64,…`. Ausente equivale a `null` (perfiles existentes no se migran). `UserProfile` suma `photo: string | null`.

### Reglas (`firestore.rules`, `match /users/{uid}`)

- Actualización propia: `changed().hasOnly(['displayName', 'photo', 'rev'])`; nombre como hoy; `validPhoto(request.resource.data)`.
- `validPhoto(d)`: `!('photo' in d) || d.photo == null || (d.photo is string && d.photo.size() <= 50000 && d.photo.matches('^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'))`.
- Actualización del admin sobre otra persona: sin cambios (solo `role`, `active`, `rev`), por lo tanto no puede tocar nombre ni foto.
- Auditoría obligatoria como en todo `users` (el `before`/`after` incluye la foto; ~30 KB por entrada como máximo, lejos del límite de 1 MB).

### Escrituras

- `updateOwnName(db, uid, name)` pasa a `updateOwnProfile(db, uid, patch: { displayName?: string; photo?: string | null })`, en transacción con auditoría (mismo patrón que `updateMember`).
- `updateMember` (rol / activo) e invitaciones: sin cambios.

## 3. Lógica pura

| Función | Ubicación | Qué hace |
|---|---|---|
| `squareCrop(width, height)` | `src/features/team/avatarImage.ts` | `{ sx, sy, size }`: el cuadrado más grande centrado |
| `openTasksByMember(tasks)` | `src/features/team/members.ts` | `Map<uid, number>` de tareas asignadas con `status !== 'done'` |
| `makePersonOf(members)` | `src/features/team/members.ts` | `(uid) => { name, photo, active } \| null`; `makeNameOf` se mantiene y agrega " (inactiva)" para inactivos |

`imageToAvatar(file): Promise<string>` (mismo archivo que `squareCrop`) usa `createImageBitmap` + `<canvas>` para generar el JPEG (calidad 0.8). Rechaza con un mensaje claro si no es imagen o pesa más de 5 MB. Se prueba a mano (jsdom no dibuja).

## 4. Interfaz

| Unidad | Responsabilidad |
|---|---|
| `Avatar` | Props `name`, `photo?`, `inactive?`. Foto (`<img alt="">`) o inicial; inactivo → gris y atenuado. Sigue siendo decorativo. |
| `TeamPage` (reemplaza `InvitePage`) | `PageHeader` "Equipo" con "N integrantes activos" y "+ Invitar" (admin); lista de `MemberRow` (activos primero, luego inactivos, por nombre); sección "Invitaciones pendientes" (admin). |
| `MemberRow` | Avatar, nombre, "Tú", etiqueta "Inactiva", email, "N tareas abiertas", rol. Para el admin y otra persona: `select` de rol y Desactivar / Reactivar con confirmación en línea. |
| `InviteDialog` | Formulario de invitación actual dentro de `Modal`; tras crear muestra el link y "Copiar link". |
| `ProfileDialog` | Avatar grande, "Subir foto" (input file oculto con label), "Quitar", nombre; Guardar. Errores en `Alert`. |
| `Sidebar` / `UserMenu` | El bloque de usuario abre "Mi perfil"; `UserMenu` suma el ítem "Mi perfil". Ambos muestran la foto. |
| Tareas (`TodoItem`, `TaskBoard`, `TaskDetailPanel`) | Usan `personOf` para mostrar foto e inactivo en el avatar del responsable; el texto usa `nameOf` (con " (inactiva)"). |
| `navItems` | Equipo con `to: '/team'` para todos. |
| Rutas | `/team` ya no usa `AdminRoute`. `AdminRoute` queda sin uso y se borra. |

Mensaje al desactivar: *"{Nombre} tiene {N} tareas sin terminar. Seguirán a su nombre, marcado como inactiva; puedes reasignarlas desde Mis tareas."* (si N = 0: *"¿Desactivar a {Nombre}? Ya no podrá entrar."*).

## 5. Tests

- **Reglas:** foto propia válida aceptada; quitar foto (`null`) aceptado; foto > 50 KB rechazada; foto PNG rechazada; cambiar foto de otra persona rechazado (también siendo admin); admin cambiando nombre de otra persona rechazado; cambio de foto sin auditoría rechazado.
- **Unitarios:** `squareCrop` (horizontal, vertical, cuadrada), `openTasksByMember`, `makePersonOf`, `makeNameOf` con inactivos, `navItems` (Equipo para todos).
- **Componentes:** `Avatar` (foto, inicial, inactivo); `TeamPage` como admin (controles, invitaciones, sin controles en la propia fila) y como miembro (solo lista); `MemberRow` aviso de desactivar con N correcto y llamada a `updateMember`; `ProfileDialog` (guardar nombre, quitar foto); rutas (`/team` para miembro).

## 6. Entrega

Una sola parte: commits chicos en `v2`, reglas publicadas en `matecode-tasks-dev`, preview, README y AI_LOG ("v2 — Etapa 4").
