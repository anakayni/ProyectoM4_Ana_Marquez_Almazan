# MateCode Tasks v2 — Etapa 11: Integración a producción

- **Fecha:** 2026-10-16
- **Rama:** `v2` → `main`
- **Estado:** aprobado en conversación

## 0. Objetivo

Que la app de producción (https://matecode-tasks-sandy.vercel.app, Firebase `matecode-tasks-dc1e1`) pase a ser la v2, sin perder datos ni cuentas, con un respaldo y un camino de vuelta atrás.

## 1. Situación de producción (inventario de solo lectura, 2026-10-16)

- 2 cuentas (Google, email verificado), 9 tareas en formato M4 (`userId`, `completed`), 3 dueños distintos (1 sin cuenta). Ninguna colección de la v2 existe.

## 2. Decisiones

| Tema | Decisión |
|---|---|
| Cuentas | La de la usuaria (por su email) → **Administrador**; la otra → **Miembro**. Perfiles creados por la migración, auditados con actor `system`. |
| Tareas | Formato v2 con número `MC-n` (orden de creación) y auditoría `system`. **Responsable = dueño del M4 si todavía tiene cuenta**; si no, "Sin asignar" (se conserva quién la creó). |
| README | El de portafolio queda como principal (`README.md` / `README.es.md`), actualizado: la v2 es la app de producción. El técnico de la v2 pasa a `docs/README-tecnico.md`. La doc del M4 sigue en `docs/m4/`. |
| Demo | Sigue en dev (cuenta Lector); producción tiene datos reales. |
| Momento | Apenas esté listo, sin ventana acordada (decisión de la usuaria), paso a paso. |
| Vuelta atrás | Reglas anteriores (se guarda el nombre del ruleset publicado), publicación anterior de Vercel (`vercel rollback`) y tareas desde el respaldo. |

## 3. Piezas

| Pieza | Qué hace |
|---|---|
| `migrateTask(doc, next, knownUsers?)` | Además de lo de hoy: `assigneeId` = `userId` si está en `knownUsers`, si no `null`. |
| `profileFor(authUser, adminEmail)` (`src/features/auth/profileFor.ts`) | Perfil v2 para una cuenta existente: rol admin si el email coincide (sin mayúsculas), si no member; nombre = `displayName` o la parte local del email. |
| `scripts/migrate-users.mjs` (`npm run migrate-users -- --admin email`) | Crea `users/{uid}` + `auditLog/user_{uid}_1` para cada cuenta sin perfil. Solo dev salvo `--confirmar-produccion`. `--simular` muestra el plan sin escribir. |
| `scripts/migrate-tasks.mjs` | Pasa `knownUsers` (cuentas de Auth) a `migrateTask`; suma `--simular`. |
| `scripts/backup-firestore.mjs` (`npm run backup`) | Guarda en `../respaldos/<proyecto>-<fecha>.json` (fuera del repo): cuentas (uid, email, proveedores), todas las colecciones y el ruleset publicado. |
| Publicar reglas e índices | Reglas: script temporal (como en dev) que en producción exige `--confirmar-produccion`. Índices: enlaces directos para la consola (la cuenta de servicio no puede crearlos). |

## 4. Orden

1. **Preparación (sin corte):** README y unión `main` ← `v2` por pull request; índices en producción; revisar variables de Vercel (nombres); scripts nuevos con tests y probados en dev (`--simular` y real).
2. **Cambio (~10–15 min):** respaldo → reglas v2 → `migrate-users` → `migrate-tasks` → `vercel --prod` desde `main` → comprobación (conteos, 200, la usuaria entra como admin).
3. **Documentación:** README técnico, AI_LOG, `CLAUDE.md` (producción = v2).

## 5. Tests

- `migrateTask` con dueño conocido / desconocido.
- `profileFor`: admin por email (sin mayúsculas), member, nombre por defecto.
- Scripts probados en dev con `--simular` (no escribe) y en real (idempotentes: una segunda corrida no cambia nada).
