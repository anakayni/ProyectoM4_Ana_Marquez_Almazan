import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { requireEnv } from './env.js';
import type { SummaryTask } from './summaryEmail.js';
import { hidesDone, visibleForRole } from './visibleTasks.js';

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

/**
 * firebase-admin ignora las Security Rules: el filtro por responsable (y, según el rol, sin hechas
 * y por proyecto) es obligatorio acá. `showDone` indica si el email puede hablar de tareas hechas.
 */
export async function getTasksForUser(uid: string): Promise<{ tasks: SummaryTask[]; showDone: boolean }> {
  const db = getFirestore(getAdminApp());
  const [snapshot, user] = await Promise.all([
    db.collection('tasks').where('assigneeId', '==', uid).get(),
    db.collection('users').doc(uid).get(),
  ]);
  const role = String(user.data()?.role ?? '');
  const guestProjectIds = role === 'guest'
    ? (await db.collection('projects').where('memberIds', 'array-contains', uid).get()).docs.map((d) => d.id)
    : [];
  const tasks = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      title: String(data.title),
      description: String(data.description ?? ''),
      status: data.status as SummaryTask['status'],
      projectId: (data.projectId ?? null) as string | null,
    };
  });
  return {
    tasks: visibleForRole(role, tasks, guestProjectIds).map(({ title, description, status }) => ({ title, description, status })),
    showDone: !hidesDone(role),
  };
}
