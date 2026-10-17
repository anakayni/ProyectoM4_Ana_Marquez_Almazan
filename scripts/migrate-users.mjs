// Da un perfil de la v2 a cada cuenta que ya existía (antes no había invitaciones), con su auditoría.
// Uso: npm run migrate-users -- --admin email@ejemplo.com                           (solo matecode-tasks-dev)
//      npm run migrate-users -- --admin email@ejemplo.com --confirmar-produccion    (al integrar la v2 a main)
//      agregar --simular para ver qué haría sin escribir nada
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { profileFor } from '../src/features/auth/profileFor.ts';

const e = process.env;
if (e.FIREBASE_ADMIN_PROJECT_ID !== 'matecode-tasks-dev' && !process.argv.includes('--confirmar-produccion')) {
  console.error(`El .env apunta a ${e.FIREBASE_ADMIN_PROJECT_ID}. Para producción agrega --confirmar-produccion.`);
  process.exit(1);
}
const adminEmail = process.argv[process.argv.indexOf('--admin') + 1];
if (!process.argv.includes('--admin') || !adminEmail || adminEmail.startsWith('--')) {
  console.error('Falta --admin <email>: la cuenta que será Administrador.');
  process.exit(1);
}
const simulate = process.argv.includes('--simular');

const app = initializeApp({
  credential: cert({
    projectId: e.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: e.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: e.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);

const accounts = [];
let pageToken;
do {
  const page = await getAuth(app).listUsers(1000, pageToken);
  accounts.push(...page.users);
  pageToken = page.pageToken;
} while (pageToken);

let created = 0;
let admins = 0;
let existing = 0;
let withoutEmail = 0;
for (const account of accounts) {
  if (!account.email) {
    withoutEmail++;
    continue;
  }
  const ref = db.doc(`users/${account.uid}`);
  if ((await ref.get()).exists) {
    existing++;
    continue;
  }
  const profile = { ...profileFor(account, adminEmail), joinedAt: FieldValue.serverTimestamp() };
  created++;
  if (profile.role === 'admin') admins++;
  if (simulate) continue;
  // firebase-admin no pasa por las Security Rules: la auditoría la escribe el script con actor "system".
  const batch = db.batch();
  batch.set(ref, profile);
  batch.set(db.doc(`auditLog/user_${account.uid}_1`), {
    entityType: 'user', entityId: account.uid, rev: 1, action: 'create', actorId: 'system',
    at: FieldValue.serverTimestamp(), before: null, after: profile,
  });
  await batch.commit();
}

const prefix = simulate ? '(simulación) se crearían' : '✓';
console.log(`${prefix} ${created} perfiles (${admins} admin) · ${existing} ya existían · ${withoutEmail} cuentas sin email en ${e.FIREBASE_ADMIN_PROJECT_ID}.${simulate ? ' No se escribió nada.' : ''}`);
if (!simulate && admins === 0 && created > 0) console.log('Atención: ninguna cuenta coincidió con el email de --admin.');
process.exit(0);
