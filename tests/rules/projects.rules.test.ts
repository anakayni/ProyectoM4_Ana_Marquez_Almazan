import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createProject, deleteProject, updateProject } from '@/services/audited/projects';
import { createTask, updateTask } from '@/services/audited/tasks';
import { createEnv, dbAs, seedCounter, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const project = {
  name: 'Portal', description: '', color: '#4D7C8A', ownerId: 'ana', startDate: '2026-10-01', endDate: '2026-11-30',
};
const task = { title: 'T', description: '', priority: 'media' as const, dueDate: null, assigneeId: null, projectId: null };

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
  await seedCounter(env);
});

describe('proyectos', () => {
  it('todos los activos los leen', async () => {
    await createProject(as('ana'), 'ana', project);
    await assertSucceeds(getDocs(collection(as('vera'), 'projects')));
  });

  it('miembro crea, edita y archiva; lector no', async () => {
    const id = await createProject(as('ana'), 'ana', project);
    await assertSucceeds(updateProject(as('ana'), 'ana', id, { name: 'Portal v2' }));
    await assertSucceeds(updateProject(as('ana'), 'ana', id, { archived: true }));
    await assertFails(createProject(as('vera'), 'vera', project));
    await assertFails(updateProject(as('vera'), 'vera', id, { name: 'X' }));
  });

  it('valida color, fechas y persona a cargo', async () => {
    await assertFails(createProject(as('ana'), 'ana', { ...project, color: 'azul' }));
    await assertFails(createProject(as('ana'), 'ana', { ...project, endDate: '2026-09-01' }));
    await assertFails(createProject(as('ana'), 'ana', { ...project, ownerId: 'vera' }));
  });

  it('solo el admin elimina, y las tareas quedan sin proyecto', async () => {
    const id = await createProject(as('ana'), 'ana', project);
    const taskId = await createTask(as('ana'), 'ana', { ...task, projectId: id });
    await assertFails(deleteProject(as('ana'), 'ana', id));
    await assertSucceeds(deleteProject(as('admin'), 'admin', id));
    expect((await getDoc(doc(as('ana'), 'tasks', taskId))).data()?.projectId).toBeNull();
    expect((await getDoc(doc(as('ana'), 'projects', id))).exists()).toBe(false);
  });

  it('no se agregan tareas a un proyecto archivado ni inexistente', async () => {
    const id = await createProject(as('ana'), 'ana', project);
    await updateProject(as('ana'), 'ana', id, { archived: true });
    await assertFails(createTask(as('ana'), 'ana', { ...task, projectId: id }));
    await assertFails(createTask(as('ana'), 'ana', { ...task, projectId: 'nada' }));
    const t = await createTask(as('ana'), 'ana', task);
    await assertFails(updateTask(as('ana'), 'ana', t, { projectId: id }));
  });

  it('los cambios de proyectos quedan auditados y se pueden leer', async () => {
    const id = await createProject(as('ana'), 'ana', project);
    await assertSucceeds(
      getDocs(query(collection(as('vera'), 'auditLog'), where('entityType', '==', 'project'), where('entityId', '==', id))),
    );
  });
});
