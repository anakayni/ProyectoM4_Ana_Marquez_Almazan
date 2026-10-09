import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireEnv } from './env.js';
import type { SummaryTask } from './summaryEmail.js';

/** Inicializa firebase-admin una sola vez (las funciones reutilizan instancias entre llamadas). */
function getAdminApp(): App {
  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: requireEnv('FIREBASE_ADMIN_PROJECT_ID'),
        clientEmail: requireEnv('FIREBASE_ADMIN_CLIENT_EMAIL'),
        // Las variables de entorno guardan los saltos de línea como "\n" literales.
        privateKey: requireEnv('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    })
  );
}

export async function verifyIdToken(token: string) {
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email, name: decoded.name as string | undefined };
}

/** firebase-admin ignora las Security Rules: el filtro por quién creó la tarea es obligatorio acá. */
export async function getTasksForUser(uid: string): Promise<SummaryTask[]> {
  const snapshot = await getFirestore(getAdminApp()).collection('tasks').where('createdBy', '==', uid).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return { title: String(data.title), description: String(data.description ?? ''), completed: Boolean(data.completed) };
  });
}
