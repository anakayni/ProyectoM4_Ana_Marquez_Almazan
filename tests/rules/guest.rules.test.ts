import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { createInvitation } from '@/services/audited/invitations';
import { updateProject } from '@/services/audited/projects';
import { createTask, deleteTask, updateTask } from '@/services/audited/tasks';
import type { ProjectPatch } from '@/types/project';
import { createEnv, dbAs, seedCounter, seedProject, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const input = (projectId: string | null, assigneeId: string | null = null) => ({
  title: 'T', description: '', priority: 'media' as const, dueDate: null, assigneeId, projectId,
});
/** `memberIds` todavía no es parte de ProjectPatch: así se prueba la regla directamente. */
const members = (ids: string[]) => ({ memberIds: ids }) as unknown as ProjectPatch;

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
  await seedUser(env, 'otro', 'guest');
  await seedCounter(env);
  await seedProject(env, 'p1', { ownerId: 'ana', memberIds: ['gus'] });
  await seedProject(env, 'p2', { ownerId: 'ana' });
});

describe('Invitado: lectura', () => {
  it('ve sus proyectos y no los demás', async () => {
    const db = as('gus');
    await assertSucceeds(getDocs(query(collection(db, 'projects'), where('memberIds', 'array-contains', 'gus'))));
    await assertSucceeds(getDoc(doc(db, 'projects', 'p1')));
    await assertFails(getDoc(doc(db, 'projects', 'p2')));
    await assertFails(getDocs(collection(db, 'projects')));
  });

  it('ve las tareas de su proyecto, no las de otro ni todas', async () => {
    await createTask(as('ana'), 'ana', input('p1'));
    await createTask(as('ana'), 'ana', input('p2'));
    const db = as('gus');
    await assertSucceeds(getDocs(query(collection(db, 'tasks'), where('projectId', '==', 'p1'))));
    await assertFails(getDocs(query(collection(db, 'tasks'), where('projectId', '==', 'p2'))));
    await assertFails(getDocs(collection(db, 'tasks')));
  });

  it('solo lee su propio perfil', async () => {
    const db = as('gus');
    await assertSucceeds(getDoc(doc(db, 'users', 'gus')));
    await assertFails(getDoc(doc(db, 'users', 'ana')));
    await assertFails(getDocs(collection(db, 'users')));
  });

  it('lee el historial de las tareas de su proyecto y no el de otras', async () => {
    const mine = await createTask(as('ana'), 'ana', input('p1'));
    const other = await createTask(as('ana'), 'ana', input('p2'));
    const history = (id: string) =>
      getDocs(query(collection(as('gus'), 'auditLog'), where('entityType', '==', 'task'), where('entityId', '==', id)));
    await assertSucceeds(history(mine));
    await assertFails(history(other));
  });

  it('el resto del equipo sigue leyendo todo', async () => {
    await assertSucceeds(getDocs(collection(as('ana'), 'projects')));
    await assertSucceeds(getDocs(collection(as('ana'), 'tasks')));
    await assertSucceeds(getDocs(collection(as('ana'), 'users')));
  });
});

describe('Invitado: tareas', () => {
  it('crea tareas en su proyecto, no sin proyecto ni en otro', async () => {
    await assertSucceeds(createTask(as('gus'), 'gus', input('p1')));
    await assertFails(createTask(as('gus'), 'gus', input(null)));
    await assertFails(createTask(as('gus'), 'gus', input('p2')));
  });

  it('no saca una tarea de su proyecto ni trae una de afuera', async () => {
    const mine = await createTask(as('ana'), 'ana', input('p1'));
    const other = await createTask(as('ana'), 'ana', input('p2'));
    await assertSucceeds(updateTask(as('gus'), 'gus', mine, { title: 'Editada' }));
    await assertFails(updateTask(as('gus'), 'gus', mine, { projectId: 'p2' }));
    await assertFails(updateTask(as('gus'), 'gus', other, { projectId: 'p1' }));
  });

  it('asigna solo a personas del proyecto', async () => {
    await assertSucceeds(createTask(as('gus'), 'gus', input('p1', 'ana')));
    await assertSucceeds(createTask(as('gus'), 'gus', input('p1', 'gus')));
    await assertFails(createTask(as('gus'), 'gus', input('p1', 'admin')));
  });

  it('un miembro asigna a un Invitado solo si está en ese proyecto', async () => {
    await assertSucceeds(createTask(as('ana'), 'ana', input('p1', 'gus')));
    await assertFails(createTask(as('ana'), 'ana', input('p1', 'otro')));
    const task = await createTask(as('ana'), 'ana', input('p1', 'gus'));
    await assertFails(updateTask(as('ana'), 'ana', task, { projectId: 'p2' }));
  });

  it('elimina solo las tareas que creó', async () => {
    const own = await createTask(as('gus'), 'gus', input('p1'));
    const others = await createTask(as('ana'), 'ana', input('p1'));
    await assertSucceeds(deleteTask(as('gus'), 'gus', own));
    await assertFails(deleteTask(as('gus'), 'gus', others));
  });
});

describe('Proyectos y personas', () => {
  it('el Invitado no cambia datos del proyecto', async () => {
    await assertFails(updateProject(as('gus'), 'gus', 'p1', { name: 'Otro nombre' }));
  });

  it('solo el admin cambia la lista de personas', async () => {
    await assertFails(updateProject(as('ana'), 'ana', 'p1', members(['gus', 'otro'])));
    await assertSucceeds(updateProject(as('admin'), 'admin', 'p1', members(['gus', 'otro'])));
  });

  it('un Invitado no puede ser responsable de un proyecto', async () => {
    await assertFails(updateProject(as('admin'), 'admin', 'p1', { ownerId: 'gus' }));
  });

  it('el admin puede invitar con el rol Invitado', async () => {
    await assertSucceeds(createInvitation(as('admin'), 'admin', 'nuevo@test.com', 'guest'));
  });
});
