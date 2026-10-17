import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setProjectMembers, syncPersonCards } from '@/services/audited/people';
import { createProject, deleteProject, updateProject } from '@/services/audited/projects';
import { updateMember, updateOwnProfile } from '@/services/audited/users';
import { createEnv, dbAs, seed, seedProject, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const card = (pid: string, uid: string) => doc(as('admin'), 'projects', pid, 'people', uid);
const cardData = async (pid: string, uid: string) => (await getDoc(card(pid, uid))).data();

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
  await seedProject(env, 'p1', { ownerId: 'ana' });
  await seedProject(env, 'p2', { ownerId: 'ana' });
});

describe('lista de personas', () => {
  it('el admin agrega y quita, con auditoría y tarjeta', async () => {
    await assertSucceeds(setProjectMembers(as('admin'), 'admin', 'p1', ['gus']));
    expect(await cardData('p1', 'gus')).toEqual({ uid: 'gus', displayName: 'gus', photo: null, active: true, role: 'guest' });
    expect((await getDoc(doc(as('admin'), 'auditLog', 'project_p1_2'))).exists()).toBe(true);
    await assertSucceeds(setProjectMembers(as('admin'), 'admin', 'p1', []));
    expect(await cardData('p1', 'gus')).toBeUndefined();
  });

  it('un miembro no puede cambiar la lista', async () => {
    await assertFails(setProjectMembers(as('ana'), 'ana', 'p1', ['gus']));
  });
});

describe('tarjetas', () => {
  beforeEach(async () => {
    await setProjectMembers(as('admin'), 'admin', 'p1', ['gus']);
  });

  it('no se puede inventar una tarjeta ni cambiarle el nombre', async () => {
    const real = { uid: 'gus', displayName: 'gus', photo: null, active: true, role: 'guest' };
    await assertFails(setDoc(doc(as('ana'), 'projects', 'p1', 'people', 'gus'), { ...real, displayName: 'Otro' }));
    await assertFails(setDoc(doc(as('ana'), 'projects', 'p2', 'people', 'gus'), real));
    await assertSucceeds(setDoc(doc(as('ana'), 'projects', 'p1', 'people', 'gus'), real));
  });

  it('el Invitado lee las tarjetas de su proyecto y no las de otro', async () => {
    await seed(env, async (db) => {
      await setDoc(doc(db, 'projects', 'p2', 'people', 'ana'), { uid: 'ana', displayName: 'ana', photo: null, active: true, role: 'team' });
    });
    await assertSucceeds(getDocs(collection(as('gus'), 'projects', 'p1', 'people')));
    await assertFails(getDocs(collection(as('gus'), 'projects', 'p2', 'people')));
  });

  it('al cambiar su nombre, el Invitado actualiza sus tarjetas', async () => {
    await updateOwnProfile(as('gus'), 'gus', { displayName: 'Gustavo' });
    await assertSucceeds(syncPersonCards(as('gus'), 'gus'));
    expect((await cardData('p1', 'gus'))?.displayName).toBe('Gustavo');
  });

  it('al desactivarlo, el admin actualiza sus tarjetas', async () => {
    await updateMember(as('admin'), 'admin', 'gus', { active: false });
    await assertSucceeds(syncPersonCards(as('admin'), 'gus'));
    expect((await cardData('p1', 'gus'))?.active).toBe(false);
  });
});

describe('responsable', () => {
  it('crear un proyecto crea la tarjeta del responsable', async () => {
    const id = await createProject(as('ana'), 'ana', {
      name: 'Web', description: '', color: '#1B4079', ownerId: 'ana', startDate: '2026-10-01', endDate: '2026-12-31',
    });
    expect((await cardData(id, 'ana'))?.role).toBe('team');
  });

  it('cambiar el responsable mueve la tarjeta', async () => {
    await assertSucceeds(updateProject(as('ana'), 'ana', 'p1', { ownerId: 'admin' }));
    expect((await cardData('p1', 'admin'))?.displayName).toBe('admin');
    expect(await cardData('p1', 'ana')).toBeUndefined();
  });

  it('eliminar el proyecto borra sus tarjetas', async () => {
    await setProjectMembers(as('admin'), 'admin', 'p1', ['gus']);
    await deleteProject(as('admin'), 'admin', 'p1');
    expect(await cardData('p1', 'gus')).toBeUndefined();
  });
});
