import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { createTask, updateTask } from '@/services/audited/tasks';
import { createEnv, dbAs, seedCounter, seedProject, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const input = { title: 'T', description: '', priority: 'media' as const, dueDate: null, assigneeId: null, projectId: 'p1' };
const OPEN = ['todo', 'doing'];
let openId = '';
let doneId = '';

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seedUser(env, 'admin', 'admin');
  await seedUser(env, 'ana', 'member');
  await seedUser(env, 'vera', 'viewer');
  await seedUser(env, 'gus', 'guest');
  await seedCounter(env);
  await seedProject(env, 'p1', { ownerId: 'ana', memberIds: ['gus'] });
  openId = await createTask(as('ana'), 'ana', input);
  doneId = await createTask(as('ana'), 'ana', input);
  await updateTask(as('ana'), 'ana', doneId, { status: 'done' });
});

const history = (uid: string, id: string) =>
  getDocs(query(collection(as(uid), 'auditLog'), where('entityType', '==', 'task'), where('entityId', '==', id)));

describe('Lector', () => {
  it('lee solo tareas abiertas', async () => {
    const db = as('vera');
    await assertSucceeds(getDocs(query(collection(db, 'tasks'), where('status', 'in', OPEN))));
    await assertSucceeds(getDoc(doc(db, 'tasks', openId)));
    await assertFails(getDoc(doc(db, 'tasks', doneId)));
    await assertFails(getDocs(collection(db, 'tasks')));
  });

  it('no lee el historial de una tarea hecha', async () => {
    await assertSucceeds(history('vera', openId));
    await assertFails(history('vera', doneId));
  });
});

describe('Invitado', () => {
  it('lee solo tareas abiertas de su proyecto', async () => {
    const db = as('gus');
    await assertSucceeds(getDocs(query(collection(db, 'tasks'), where('projectId', '==', 'p1'), where('status', 'in', OPEN))));
    await assertFails(getDocs(query(collection(db, 'tasks'), where('projectId', '==', 'p1'))));
    await assertFails(getDoc(doc(db, 'tasks', doneId)));
    await assertFails(history('gus', doneId));
  });

  it('puede marcar una tarea como hecha y después ya no la lee', async () => {
    await assertSucceeds(updateTask(as('gus'), 'gus', openId, { status: 'done' }));
    await assertFails(getDoc(doc(as('gus'), 'tasks', openId)));
  });
});

describe('Admin y miembro', () => {
  it('siguen leyendo todo, incluidas las hechas y su historial', async () => {
    await assertSucceeds(getDocs(collection(as('ana'), 'tasks')));
    await assertSucceeds(getDoc(doc(as('ana'), 'tasks', doneId)));
    await assertSucceeds(history('ana', doneId));
    await assertSucceeds(history('admin', doneId));
  });
});
