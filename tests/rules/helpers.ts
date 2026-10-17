import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import type { Role } from '@/types/auth';

export const PROJECT_ID = 'demo-matecode';

export function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
}

/** Firestore del emulador autenticado como `uid` (el tipo compat se adapta al modular). */
export function dbAs(env: RulesTestEnvironment, uid: string, email: string, emailVerified = true): Firestore {
  return env.authenticatedContext(uid, { email, email_verified: emailVerified }).firestore() as unknown as Firestore;
}

export function anonDb(env: RulesTestEnvironment): Firestore {
  return env.unauthenticatedContext().firestore() as unknown as Firestore;
}

/** Escribe datos saltando las reglas (para preparar cada caso). */
export async function seed(env: RulesTestEnvironment, fn: (db: Firestore) => Promise<void>): Promise<void> {
  await env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore() as unknown as Firestore));
}

export async function seedUser(env: RulesTestEnvironment, uid: string, role: Role, active = true): Promise<void> {
  await seed(env, (db) =>
    setDoc(doc(db, 'users', uid), {
      email: `${uid}@test.com`,
      displayName: uid,
      role,
      active,
      invitedBy: 'system',
      joinedAt: Timestamp.now(),
      rev: 1,
    }),
  );
}

/** El contador de números de tarea (en producción lo crea la migración). */
export async function seedCounter(env: RulesTestEnvironment, next = 1): Promise<void> {
  await seed(env, (db) => setDoc(doc(db, 'counters', 'tasks'), { next }));
}

/** Proyecto válido (sin pasar por las reglas). `memberIds` se omite si no se pasa, como en los proyectos viejos. */
export async function seedProject(
  env: RulesTestEnvironment,
  id: string,
  data: { ownerId: string; memberIds?: string[]; archived?: boolean },
): Promise<void> {
  await seed(env, (db) =>
    setDoc(doc(db, 'projects', id), {
      name: id, description: '', color: '#1B4079', ownerId: data.ownerId,
      startDate: '2026-10-01', endDate: '2026-12-31', archived: data.archived ?? false,
      createdBy: data.ownerId, createdAt: Timestamp.now(), updatedAt: Timestamp.now(), updatedBy: data.ownerId, rev: 1,
      ...(data.memberIds && { memberIds: data.memberIds }),
    }),
  );
}
