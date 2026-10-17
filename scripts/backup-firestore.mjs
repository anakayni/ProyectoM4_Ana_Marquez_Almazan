// Respaldo de solo lectura: cuentas (uid, email, proveedores), todas las colecciones (con subcolecciones)
// y el nombre de las reglas publicadas. Se guarda FUERA del repo, en ../respaldos/ (tiene datos personales).
// Uso: npm run backup                                   (con el .env de dev)
//      node --env-file=.env.produccion scripts/backup-firestore.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const e = process.env;
const credential = cert({
  projectId: e.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: e.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: e.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
});
const app = initializeApp({ credential });
const db = getFirestore(app);

// Las fechas de Firestore se guardan como texto ISO para poder leer el archivo.
const plain = (value) => JSON.parse(JSON.stringify(value, (_k, v) => (v instanceof Timestamp ? v.toDate().toISOString() : v)));

const accounts = [];
let pageToken;
do {
  const page = await getAuth(app).listUsers(1000, pageToken);
  accounts.push(...page.users.map((u) => ({ uid: u.uid, email: u.email ?? null, proveedores: u.providerData.map((p) => p.providerId) })));
  pageToken = page.pageToken;
} while (pageToken);

const collections = {};
async function dump(collectionRef) {
  const docs = (await collectionRef.get()).docs;
  collections[collectionRef.path] = docs.map((d) => ({ id: d.id, data: plain(d.data()) }));
  for (const d of docs) for (const sub of await d.ref.listCollections()) await dump(sub);
}
for (const col of await db.listCollections()) await dump(col);

// Reglas publicadas (para poder volver a ellas).
const { access_token: token } = await credential.getAccessToken();
const release = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${e.FIREBASE_ADMIN_PROJECT_ID}/releases/cloud.firestore`,
  { headers: { Authorization: `Bearer ${token}` } },
).then((r) => r.json());

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'respaldos');
mkdirSync(dir, { recursive: true });
const file = join(dir, `${e.FIREBASE_ADMIN_PROJECT_ID}-${stamp}.json`);
writeFileSync(file, JSON.stringify({ proyecto: e.FIREBASE_ADMIN_PROJECT_ID, fecha: new Date().toISOString(), reglas: release.rulesetName ?? null, cuentas: accounts, colecciones: collections }, null, 2));

const counts = Object.entries(collections).map(([path, docs]) => `${path.split('/').length > 1 ? path.replace(/\/[^/]+\//, '/…/') : path}: ${docs.length}`);
console.log(`✓ Respaldo en respaldos/${file.split('/').pop()}`);
console.log(`  cuentas: ${accounts.length} · reglas: ${release.rulesetName ? 'guardadas' : 'no encontradas'}`);
console.log(`  ${[...new Set(counts)].join(' · ')}`);
process.exit(0);
