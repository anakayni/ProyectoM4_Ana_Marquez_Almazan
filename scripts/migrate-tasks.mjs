// Convierte las tareas al formato actual (estado, responsable, completado, proyecto, número, subtareas) dejando auditoría.
// Uso: npm run migrate-tasks                              (solo matecode-tasks-dev)
//      npm run migrate-tasks -- --confirmar-produccion    (al integrar la v2 a main)
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { migrateTask } from '../src/features/tasks/migrateTask.ts';

const e = process.env;
if (e.FIREBASE_ADMIN_PROJECT_ID !== 'matecode-tasks-dev' && !process.argv.includes('--confirmar-produccion')) {
  console.error(`El .env apunta a ${e.FIREBASE_ADMIN_PROJECT_ID}. Para producción agrega --confirmar-produccion.`);
  process.exit(1);
}

const app = initializeApp({
  credential: cert({
    projectId: e.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: e.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: e.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);

// firebase-admin no pasa por las Security Rules: la auditoría la escribe el script con actor "system".
let migrated = 0;
let skipped = 0;
// Orden de creación: así los números siguen el orden en que se crearon las tareas.
const docs = (await db.collection('tasks').get()).docs.sort(
  (a, b) => (a.data().createdAt?.toMillis?.() ?? 0) - (b.data().createdAt?.toMillis?.() ?? 0),
);
const counterRef = db.doc('counters/tasks');
const counterSnap = await counterRef.get();
const highest = Math.max(0, ...docs.map((d) => (typeof d.data().number === 'number' ? d.data().number : 0)));
let next = Math.max(counterSnap.exists ? counterSnap.data().next : 1, highest + 1);

for (const snap of docs) {
  const before = snap.data();
  const result = migrateTask(before, next);
  if (!result) {
    skipped++;
    continue;
  }
  if (result.data.number === next) next++;
  const after = { ...result.data, updatedAt: FieldValue.serverTimestamp() };
  const batch = db.batch();
  batch.set(snap.ref, after);
  batch.set(db.doc(`auditLog/task_${snap.id}_${after.rev}`), {
    entityType: 'task',
    entityId: snap.id,
    rev: after.rev,
    action: result.action,
    actorId: 'system',
    at: FieldValue.serverTimestamp(),
    before: result.action === 'create' ? null : before,
    after,
  });
  await batch.commit();
  migrated++;
}

await counterRef.set({ next });

console.log(`✓ ${migrated} tareas migradas y ${skipped} ya estaban al día en ${e.FIREBASE_ADMIN_PROJECT_ID} · próximo número: ${next}.`);
process.exit(0);
