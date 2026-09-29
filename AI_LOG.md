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
- **Qué pedí:** analizar el enunciado y hacerme preguntas antes de programar.
- **Qué generó / propuso:** documento de diseño con alternativas (p. ej. que el servidor lea las tareas vs. que el cliente las envíe) y un plan por fases con tests y commits por tarea.
- **Qué revisé o cambié yo:** elegí empezar desde cero, auth con email + Google, CSS propio y dejar los extras para después del núcleo.
- **Qué aprendí:** <!-- completar con tus palabras -->
- **Qué no funcionó o tuve que corregir:**
  - El plan asumía ESLint, pero la plantilla actual de Vite trae **oxlint**; se mantuvo oxlint.
  - La plantilla fija TypeScript 6 (no 7) y ya no incluye `vite-env.d.ts`.
  - La configuración de TypeScript para el servidor (`tsconfig.server.json`) se conecta recién cuando existan las carpetas `api/` y `functions/`: `tsc -b` falla si un proyecto no tiene archivos.

## Fases 1–2 — Firebase y autenticación
- **Qué pedí:** implementar registro/login con email y Google, rutas protegidas y errores claros, siguiendo el plan con TDD.
- **Qué generó / propuso:** servicio `auth.service` que envuelve Firebase, contexto `useAuth`, rutas `ProtectedRoute`/`PublicOnlyRoute`, páginas de login/registro y tests con Firebase mockeado.
- **Qué revisé o cambié yo:** creé el proyecto en Firebase, activé los proveedores y cargué el `.env` sin compartir las claves en el chat. Probé manualmente todo el flujo (registro, login incorrecto, Google, recarga con sesión, vista móvil).
- **Qué aprendí:** <!-- completar con tus palabras -->
- **Qué no funcionó o tuve que corregir:**
  - Primero corrí `cp .env.example .env` en Google Cloud Shell en vez de la terminal local: el archivo solo existe en mi computadora.
  - Login y registro repetían el mismo `try/catch`; se extrajo al hook `useAuthAction` (no estaba en el plan).
