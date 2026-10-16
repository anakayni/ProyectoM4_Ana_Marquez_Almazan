import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getDoc, doc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setProjectMembers } from '@/services/audited/people';
import { updateProject } from '@/services/audited/projects';
import { createTask, deleteTask, updateTask } from '@/services/audited/tasks';
import type { ProjectPatch } from '@/types/project';
import { createEnv, dbAs, seedCounter, seedProject, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const input = { title: 'T', description: '', priority: 'media' as const, dueDate: null, assigneeId: null, projectId: 'p1' };

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
  await seedUser(env, 'gus', 'guest');
  await seedUser(env, 'leo', 'guest');
  await seedCounter(env);
  await seedProject(env, 'p1', { ownerId: 'ana', memberIds: ['leo'] }); // leo: ya estaba, sin entrada = puede editar
});

describe('acceso del Invitado por proyecto', () => {
  it('quien se agrega empieza en "Solo ver" y no puede trabajar', async () => {
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo', 'gus']);
    const data = (await getDoc(doc(as('admin'), 'projects', 'p1'))).data();
    expect(data?.guestAccess).toEqual({ gus: 'view' });
    await assertFails(createTask(as('gus'), 'gus', input));
    const id = await createTask(as('ana'), 'ana', input);
    await assertFails(updateTask(as('gus'), 'gus', id, { title: 'x' }));
    await assertFails(updateTask(as('gus'), 'gus', id, { status: 'doing' }));
  });

  it('"Puede editar" (o sin entrada) trabaja como hoy', async () => {
    await assertSucceeds(createTask(as('leo'), 'leo', input));
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo', 'gus'], { gus: 'edit' });
    const own = await createTask(as('gus'), 'gus', input);
    await assertSucceeds(updateTask(as('gus'), 'gus', own, { title: 'Editada' }));
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo', 'gus'], { gus: 'view' });
    await assertFails(deleteTask(as('gus'), 'gus', own));
  });

  it('solo el admin cambia el acceso', async () => {
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo', 'gus']);
    await assertFails(updateProject(as('ana'), 'ana', 'p1', { guestAccess: { gus: 'edit' } } as unknown as ProjectPatch));
    await assertFails(setProjectMembers(as('ana'), 'ana', 'p1', ['leo', 'gus'], { gus: 'edit' }));
  });

  it('al salir del proyecto se borra su acceso', async () => {
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo', 'gus']);
    await setProjectMembers(as('admin'), 'admin', 'p1', ['leo']);
    expect((await getDoc(doc(as('admin'), 'projects', 'p1'))).data()?.guestAccess).toEqual({});
  });
});
