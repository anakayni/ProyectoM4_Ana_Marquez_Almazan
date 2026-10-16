# MateCode Tasks

🇬🇧 [English version](README.md)

App de tareas y proyectos para equipos chicos: acceso solo con invitación y roles, proyectos con sus propias personas, vistas de lista / tabla / tablero, calendario de mes y Gantt, y un **registro de auditoría de cada cambio que la propia base de datos exige**.

Empezó como mi proyecto final del **Módulo 4 de Soy Henry** y creció como proyecto de portafolio, construido con un asistente de IA (Claude Code) con un proceso de diseño → plan → tests primero.

## Demo en vivo

**https://matecode-tasks-dev.vercel.app**

| Cuenta demo (solo lectura) | |
|---|---|
| Email | `anakayni+demo@gmail.com` |
| Contraseña | `MateDemo-2026` |

La cuenta demo tiene el rol **Lector**: puede recorrer todo pero no cambiar nada. Usa una base de datos de desarrollo aparte, con datos de prueba.

## Qué hace

- **Acceso solo con invitación y roles.** Un admin invita por email como Administrador, Miembro, Lector o **Invitado**. El Invitado (un cliente, un proveedor) solo ve y trabaja en los proyectos donde lo agregaron; nunca ve al resto del equipo.
- **Tareas:** estado (pendiente / en curso / hecha), responsable, prioridad, vencimiento, número (`MC-12`), subtareas con avance, búsqueda y filtros, y tres vistas: lista, tabla y tablero. Las terminadas se ven tachadas y en gris.
- **Proyectos:** color, fechas, responsable, avance real y aviso de "atrasado", archivar, y una lista de personas que maneja el admin.
- **Calendario:** vista de mes (agenda en el celular) y vista Gantt con proyectos y vencimientos.
- **Equipo y perfil:** integrantes con foto o inicial, tareas abiertas por persona, desactivar sin perder sus tareas.
- **Ajustes (admin):** nombre, logo y paleta de colores del espacio con vista previa en vivo y un **control de contraste que impide guardar** colores ilegibles; prefijo de las tareas.
- **Auditoría (admin):** cada cambio contado en una frase ("Ana cambió el estado de Pendiente a Hecha"), filtros por tipo, persona y fechas, detalle antes → después, de a 50, y **exportación a CSV** protegida contra fórmulas en planillas.
- **Resumen de tus tareas por email** con AWS SES.

## Lo técnico que destaco

- **La base de datos manda en la seguridad.** Las Security Rules de Firestore exigen los roles, el alcance por proyecto del Invitado, responsables válidos, un "completada por / cuándo" honesto y números de tarea que no cambian. Se prueban contra el emulador de Firestore, incluidos intentos de hacer trampa (auditoría falsa, sacar una tarea del proyecto de un Invitado, tarjetas de perfil inventadas).
- **Auditoría obligatoria.** Cada escritura va en un lote o transacción junto con su entrada en `auditLog` (`before` / `after`); las reglas rechazan cualquier cambio sin su entrada, y las entradas no se pueden editar ni borrar.
- **Privacidad sin backend propio.** El Invitado lee "tarjetas" de las personas (solo nombre y foto) que las reglas verifican que sean copia exacta del perfil real; nunca lee emails ni roles.
- **Accesibilidad:** todo el texto cumple contraste 4.5:1 (lo vigila un test que recalcula las fórmulas `color-mix()` del CSS), controles con etiqueta, uso con teclado, nada que dependa de arrastrar.
- **Costo cero:** Firebase Spark, Vercel Hobby, sin Cloud Functions ni Storage (las fotos y el logo se achican en el navegador y se guardan en Firestore).
- **Con tests:** más de 400 tests de la app (Vitest + React Testing Library) y más de 80 de las reglas de Firestore.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router |
| Estilos | CSS Modules + tokens de diseño (`tokens.css`) |
| Auth y datos | Firebase Authentication, Cloud Firestore + Security Rules |
| Backend | Vercel Functions (`firebase-admin`, AWS SES v2) |
| Testing | Vitest, React Testing Library, emulador de Firestore |
| Lint y deploy | oxlint, Vercel |

## Ramas

| Rama | Qué contiene |
|---|---|
| [`v2`](https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan/tree/v2) | La versión de portafolio que se ve en la demo (en desarrollo). |
| `main` | La entrega original del Módulo 4: [documentación](docs/m4/README.es.md) · [in English](docs/m4/README.md) · producción en https://matecode-tasks-sandy.vercel.app |

## Cómo trabajé con la IA

Construí el proyecto con **Claude Code** como compañero de programación, con un proceso que repetí en cada etapa:

1. **Preguntas antes del código.** En cada etapa el asistente me hizo preguntas de a una, cada una con su recomendación, y me mostró maquetas cuando la pregunta era visual. Las decisiones de producto las tomé yo (por ejemplo: el Invitado como rol limitado a proyectos, conservar las tareas completadas para tener registro, el contraste accesible como regla).
2. **Diseño y plan por escrito.** Cada etapa tiene un documento de diseño (`docs/specs/`) y un plan de tareas chicas con los tests y el código exactos (`docs/plans/`), los dos en la rama `v2`.
3. **Primero el test.** En cada tarea se escribía el test, se veía fallar por el motivo correcto, se implementaba y se hacía commit: un commit por tarea.
4. **Pruebo cada etapa** en una preview antes de seguir, y manejé yo todas las consolas y credenciales (Firebase, AWS, Vercel): los secretos nunca pasaron por el chat.
5. **Primero la causa, después el arreglo.** Cuando algo falló (reglas equivocadas publicadas, permisos de IAM, incompatibilidades ESM, contraste por debajo de 4.5:1 encontrado al medir) buscamos la causa antes de cambiar código.

El registro completo de qué pedí, qué propuso la IA, qué cambié y qué salió mal está en [`AI_LOG.md`](https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan/blob/v2/AI_LOG.md).

## Correrlo en local

```bash
git clone https://github.com/anakayni/ProyectoM4_Ana_Marquez_Almazan.git
cd ProyectoM4_Ana_Marquez_Almazan
git checkout v2
npm install
cp .env.example .env   # config web de Firebase + cuenta de servicio, AWS SES (ver docs)
npm test               # tests de la app
npm run test:rules     # reglas de Firestore contra el emulador (requiere Java 21)
vercel dev             # app + funciones en http://localhost:3000
```

---

Hecho por **Ana Márquez** · [GitHub](https://github.com/anakayni)
