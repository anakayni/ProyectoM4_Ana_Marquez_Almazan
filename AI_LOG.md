# Registro de uso de IA

Registro de cómo usé IA (Claude Code) durante el desarrollo. Base para la sección de IA del README.

## Plantilla por fase

### Fase N — nombre
- **Qué pedí:**
- **Qué generó / propuso:**
- **Qué revisé o cambié yo:**
- **Qué aprendí:**
- **Qué no funcionó o tuve que corregir:**

---

## Fase 0 — Diseño y setup
- **Qué pedí:** Debo realizar un todo list CRUD, con la siguinete estructura, por donde sería bueno comenzar.
- **Qué generó / propuso:** documento de diseño con alternativas (p. ej. que el servidor lea las tareas vs. que el cliente las envíe) y un plan por fases con tests y commits por tarea.
- **Qué revisé o cambié yo:** elegí empezar desde cero, auth con email + Google, CSS propio y dejar los extras para después del núcleo.
- **Qué aprendí:** Me sirvió mucho que antes de escribir código me hiciera preguntas. Me obligó a pensar qué quería que hiciera la app, qué no iba a hacer y cómo se iba a ver y usar. Normalmente yo empiezo a programar directo, y aquí sentí que tenía un mapa antes de arrancar.
  También conocí el TDD, que no sabía qué era: primero escribes una prueba de lo que quieres que pase, ves que falla, y después haces el código hasta que la prueba pase. Al principio me pareció dar una vuelta de más, pero me dio tranquilidad saber que cada parte funcionaba antes de pasar a la siguiente.
  Y me quedé con ganas de trabajar más el diseño visual, siento que este proyecto tiene mucho potencial.
- **Qué no funcionó o tuve que corregir:**
  - El plan asumía ESLint, pero la plantilla actual de Vite trae **oxlint**; se mantuvo oxlint.
  - La plantilla fija TypeScript 6 (no 7) y ya no incluye `vite-env.d.ts`.
  - La configuración de TypeScript para el servidor (`tsconfig.server.json`) se conecta recién cuando existan las carpetas `api/` y `functions/`: `tsc -b` falla si un proyecto no tiene archivos.

## Fases 1–2 — Firebase y autenticación
- **Qué pedí:** implementar registro/login con email y Google, rutas protegidas y errores claros, siguiendo el plan con TDD.
- **Qué generó / propuso:** servicio `auth.service` que envuelve Firebase, contexto `useAuth`, rutas `ProtectedRoute`/`PublicOnlyRoute`, páginas de login/registro y tests con Firebase mockeado.
- **Qué revisé o cambié yo:** creé el proyecto en Firebase, activé los proveedores y cargué el `.env` sin compartir las claves en el chat. Probé manualmente todo el flujo (registro, login incorrecto, Google, recarga con sesión, vista móvil).
- **Qué aprendí:** Entendí el Context como un contenedor donde se guarda quién inició sesión, y que cualquier parte de la app puede consultar sin tener que ir pasándolo de componente en componente. Yo pensaba que también se encargaba de los permisos, pero no: eso lo cuidan las reglas de Firestore.
  El `ProtectedRoute` lo veo como un guardia en la puerta de la página de tareas: si no iniciaste sesión, no pasas y te manda al login. Me sorprendió que no viene con React, lo armamos nosotros.
  Algo que no había pensado es que al abrir la app, Firebase tarda un momento en revisar si ya tenías sesión. Por eso existe el "cargando": sin eso, cada vez que recargaba la página me sacaba un segundo al login aunque ya estuviera dentro.
- **Qué no funcionó o tuve que corregir:**
  - Primero corrí `cp .env.example .env` en Google Cloud Shell en vez de la terminal local: el archivo solo existe en mi computadora.
  - Login y registro repetían el mismo `try/catch`; se extrajo al hook `useAuthAction` (no estaba en el plan).

## Fase 3 — CRUD de tareas
- **Qué pedí:** CRUD persistente en Firestore, filtrado por usuario, con estados de carga/error y UI que se actualice sola.
- **Qué generó / propuso:** `tasks.service` con `onSnapshot` + `where('userId', '==', uid)`, hook `useTasks`, componentes `TodoForm`, `TodoList`, `TodoItem`, `Modal` (con `<dialog>` nativo), `Toast` y Security Rules que validan dueño, campos y largos.
- **Qué revisé o cambié yo:** publiqué las reglas en la consola de Firebase y probé el CRUD, el tiempo real con dos pestañas y el aislamiento entre dos cuentas.
- **Qué aprendí:** Lo que más me gustó fue ver que al crear una tarea en una pestaña aparecía sola en la otra. Eso lo hace `onSnapshot`: la app se queda "escuchando" a la base de datos y se entera de cada cambio, así que no hay que recargar nada.
  También entendí que filtrar las tareas por usuario en el código no es suficiente para protegerlas, porque lo que corre en el navegador se puede modificar. La protección de verdad son las reglas de Firestore, que deciden en el servidor quién puede ver o cambiar cada tarea.
- **Qué no funcionó o tuve que corregir:**
  - oxlint marcó `set-state-in-effect` en `useTasks`: se movió el reinicio de `loading`/`error` al callback `retry` en vez de hacerlo dentro del `useEffect`.
  - Se ordena la lista en el cliente para no necesitar un índice compuesto de Firestore (`where` + `orderBy`).

### Depuración: "No pudimos guardar la tarea"
- **Síntoma:** al crear una tarea aparecía el aviso de error y la lista no cargaba; la consola no mostraba nada útil.
- **Proceso:** en vez de cambiar código a ciegas, primero se agregó `console.error` donde se atrapaban los errores → apareció `FirebaseError: Missing or insufficient permissions`. Luego se probó la API de Firestore con un usuario temporal: una tarea con los campos de la app era rechazada, pero una con `priority`/`order`/`dueDate` se aceptaba.
- **Causa raíz:** había publicado en Firebase las reglas de la carpeta `_referencia/` (proyecto viejo) en vez de `firestore.rules` del proyecto nuevo.
- **Qué aprendí:** A revisar y leer lo que estoy colocando, tratando de entender los porqués. Copié las reglas del archivo que tenía abierto sin fijarme que era el del proyecto viejo, y eso me costó un buen rato. También me di cuenta de que un mensaje de error bonito para el usuario puede esconder el problema real si no dejas el error completo en la consola.
- **Buena práctica:** no "tragarse" errores en un `catch` vacío; mostrar un mensaje amigable al usuario pero dejar el error real en consola. Y aislar la causa con una prueba mínima antes de tocar código.

## Fases 4–5 — Deploy y email con AWS SES
- **Qué pedí:** desplegar en Vercel y enviar un resumen de tareas por email con SES desde una Vercel Function, sin exponer secretos.
- **Qué generó / propuso:** plantilla del email (HTML + texto, con escape de HTML), lógica del endpoint con dependencias inyectadas para testearla, integración con `firebase-admin` y SES v2, botón en la UI y carga de variables en Vercel leyendo `.env` sin mostrar los valores.
- **Qué revisé o cambié yo:** configuré SES (email verificado), el usuario IAM con mínimo privilegio, la cuenta de servicio de Firebase y el dominio autorizado. Pedí adaptar la función al estilo de clase (`VercelRequest`/`VercelResponse`).
- **Qué aprendí:** Entendí por qué el email lo manda el servidor y no la página: si lo hiciera el navegador, cualquiera podría ver las claves de AWS o usar la función para mandar lo que quisiera. Así, la página solo dice "soy yo" con su token, y el servidor revisa quién es, busca sus tareas y le escribe solo a esa persona.
  Esta fue la parte con más tropiezos, y casi ninguno era del código: un permiso que faltaba en AWS, un espacio de más en el `.env`, una configuración de Vercel. Aprendí a leer el mensaje de error completo y los logs antes de cambiar cosas a ciegas.
  Otra lección: que algo funcione en mi computadora no significa que funcione publicado. La función andaba perfecto en local y en Vercel fallaba por una incompatibilidad entre librerías.
  Por último, pedí cambiar la función al estilo que vimos en clase para que se pareciera a lo que conozco, y entendí por qué la lógica quedó en otro archivo: así se puede probar sin tener que mandar emails de verdad.
- **Qué no funcionó o tuve que corregir:**
  - Vercel agregó `.env*` al final del `.gitignore`, lo que anulaba `!.env.example`: se revirtió.
  - La app no cargaba con `vercel dev`: el rewrite de SPA también reescribía los archivos de Vite. Se limitó a rutas sin extensión.
  - Un error de configuración (faltaban variables) se reportaba como "sesión expirada": se separó 401 (token inválido) de 500 (error del servidor) con un test nuevo.
  - SES respondía `AccessDenied`: la política IAM con `ses:SendEmail` no estaba asignada al usuario.
  - Un espacio después del `=` en `.env` hacía fallar la carga por terminal (Vite lo toleraba).
  - En Vercel la función fallaba con `ERR_REQUIRE_ESM`: `firebase-admin` 14 → `jose` 6 (solo ESM). En local funcionaba porque Node 24 lo permite. Se leyeron los logs de Vercel y se fijó `firebase-admin` 13.

## Extras — Filtros, prioridad y vencimiento
- **Qué pedí:** agregar los extras del enunciado después de tener el núcleo desplegado: filtros, fecha de vencimiento y orden por prioridad.
- **Qué generó / propuso:** funciones puras `filterTasks`, `sortTasks` y `formatDate` con tests, componente `TaskFilters`, campos de prioridad y fecha en el formulario y reglas de Firestore que aceptan los campos nuevos sin romper las tareas existentes.
- **Qué revisé o cambié yo:** publiqué las reglas nuevas en Firebase y probé los filtros y el orden. Decidí no hacer el drag & drop para priorizar una entrega estable.
- **Qué no funcionó o tuve que corregir:** la primera vez las reglas nuevas no quedaron publicadas y las tareas con prioridad eran rechazadas; se detectó con una prueba automática antes de desplegar, así producción nunca dejó de funcionar.

## v2 — Etapa 1: roles, invitaciones y auditoría
- **Qué pedí:** a partir de unos mockups, convertir la app en un espacio de equipo: un administrador que registra los emails que pueden entrar, roles, y un registro para auditar quién mueve o edita qué. Solo funciones reales, sin costos hasta tener un cliente, y en el mismo repositorio.
- **Qué generó / propuso:** dividir la v2 en 8 etapas con su diseño y plan; un Firebase y una URL de desarrollo separados de producción; tres roles (Administrador, Miembro, Lector); invitaciones por email con link de registro y confirmación de email; auditoría obligada por las Security Rules (cada cambio guarda quién, cuándo, el antes y el después); tests de reglas con el emulador de Firestore y un script para crear el primer admin.
- **Qué revisé o cambié yo:** elegí las opciones del diseño (un solo espacio, tres roles, que todos vean todo pero quede registro, que lo obliguen las reglas). Creé el proyecto `matecode-tasks-dev` en Firebase, instalé Java para el emulador y probé el flujo completo: entrar como admin, invitar, registrarme como Lector, intentar entrar sin invitación y revisar el `auditLog`.
- **Qué aprendí:** _(pendiente, lo escribo yo)_
- **Qué no funcionó o tuve que corregir:**
  - Los primeros tests de "trampa" podían fallar por el motivo equivocado (la hora no era la del servidor); se reescribieron con controles positivos: la misma escritura, pero honesta, sí debe pasar.
  - `firebase deploy` devolvía 403 por un permiso del proyecto; las reglas de desarrollo se publicaron con la API de Firebase Rules desde un script temporal que solo acepta el proyecto de desarrollo.
  - La preview de Vercel está protegida con login de Vercel, así que el registro de personas invitadas se probó en local.

## v2 — Etapa 2: estructura, paleta y login
- **Qué pedí:** el diseño nuevo a partir de los mockups: menú lateral con Mis tareas, Proyectos, Calendario, Equipo y Ajustes, mi paleta de colores y el login en pantalla dividida.
- **Qué generó / propuso:** preguntas una por una y maquetas en el navegador para comparar opciones (tres formas de aplicar la paleta y dos de login). Después, un marco común para todas las páginas, la lista de secciones como una función con tests, la paleta como 5 variables que en la etapa 8 se podrán cambiar desde Ajustes, e íconos con lucide-react.
- **Qué revisé o cambié yo:** elegí mostrar las 5 secciones desde ya con "Próximamente", pestañas abajo en el celular (cambié mi primera elección), el menú azul oscuro y el login con mensaje. Revisé el resultado en la computadora y en vista de celular.
- **Qué aprendí:** _(pendiente, lo escribo yo)_
- **Qué no funcionó o tuve que corregir:**
  - El test de la paleta fallaba por el motivo equivocado: Vitest entrega los archivos CSS vacíos para ir más rápido. Se configuró para que lea `tokens.css` y así el test comprueba los colores de verdad.
  - Al elegir pestañas abajo en el celular, tus datos y "Cerrar sesión" se quedaban sin lugar: se resolvió con un menú en la inicial, arriba a la derecha.
