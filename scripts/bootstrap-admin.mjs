// Crea la invitación del primer administrador en el Firebase del .env (se corre una vez por entorno).
// Uso: npm run bootstrap-admin -- tu@email.com
// Después, esa persona se registra o inicia sesión en la app y reclama la invitación como cualquier otra.
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Uso: npm run bootstrap-admin -- tu@email.com');
  process.exit(1);
}

const e = process.env;
const app = initializeApp({
  credential: cert({
    projectId: e.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: e.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: e.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(app);
const ref = db.doc(`invitations/${email}`);

if ((await ref.get()).exists) {
  console.error(`Ya existe una invitación para ${email}. No se modifica nada.`);
  process.exit(1);
}

// firebase-admin no pasa por las Security Rules: la auditoría la escribe el script con actor "system".
const data = {
  email,
  role: 'admin',
  status: 'pending',
  invitedBy: 'system',
  createdAt: FieldValue.serverTimestamp(),
  acceptedBy: null,
  acceptedAt: null,
  rev: 1,
};
const batch = db.batch();
batch.set(ref, data);
batch.set(db.doc(`auditLog/invitation_${email}_1`), {
  entityType: 'invitation',
  entityId: email,
  rev: 1,
  action: 'create',
  actorId: 'system',
  at: FieldValue.serverTimestamp(),
  before: null,
  after: data,
});
await batch.commit();

console.log(`✓ Invitación de administrador creada para ${email} en ${e.FIREBASE_ADMIN_PROJECT_ID}.`);
console.log('  Ahora regístrate o inicia sesión en la app con ese email.');
process.exit(0);
