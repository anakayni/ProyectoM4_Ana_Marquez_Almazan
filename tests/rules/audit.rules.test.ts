import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { createInvitation } from '@/services/audited/invitations';
import { createTask } from '@/services/audited/tasks';
import { createEnv, dbAs, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const input = { title: 'T', description: '', priority: 'media' as const, dueDate: null };
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);

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
});

describe('auditLog', () => {
  it('las entradas no se pueden editar ni borrar, ni siquiera un admin', async () => {
    const id = await createTask(as('ana'), 'ana', input);
    await assertFails(updateDoc(doc(as('admin'), 'auditLog', `task_${id}_1`), { actorId: 'otro' }));
    await assertFails(deleteDoc(doc(as('admin'), 'auditLog', `task_${id}_1`)));
  });

  describe('una edición con la auditoría a nombre de otra persona', () => {
    async function editAs(writer: string, claimedActor: string) {
      const id = await createTask(as('ana'), 'ana', input);
      const db = as(writer);
      const current = (await getDoc(doc(db, 'tasks', id))).data()!;
      const after = { ...current, title: 'nuevo', rev: 2, updatedBy: writer, updatedAt: serverTimestamp() };
      const batch = writeBatch(db);
      batch.set(doc(db, 'tasks', id), after);
      batch.set(doc(db, 'auditLog', `task_${id}_2`), {
        entityType: 'task', entityId: id, rev: 2, action: 'update', actorId: claimedActor,
        at: serverTimestamp(), before: current, after,
      });
      return batch.commit();
    }

    it('funciona con el actor real (control)', async () => {
      await assertSucceeds(editAs('ana', 'ana'));
    });

    it('se rechaza si el actor declarado es otra persona', async () => {
      await assertFails(editAs('ana', 'admin'));
    });
  });

  it('no se puede crear una entrada suelta sin un cambio real detrás', async () => {
    const id = await createTask(as('ana'), 'ana', input);
    const current = (await getDoc(doc(as('ana'), 'tasks', id))).data()!;
    await assertFails(
      setDoc(doc(as('ana'), 'auditLog', `task_${id}_2`), {
        entityType: 'task', entityId: id, rev: 2, action: 'update', actorId: 'ana',
        at: serverTimestamp(), before: current, after: current,
      }),
    );
  });

  it('miembros y lectores leen el historial de una tarea', async () => {
    const id = await createTask(as('ana'), 'ana', input);
    const history = (uid: string) =>
      query(collection(as(uid), 'auditLog'), where('entityType', '==', 'task'), where('entityId', '==', id));
    await assertSucceeds(getDocs(history('vera')));
    await assertSucceeds(getDocs(history('ana')));
  });

  it('solo el admin lee la auditoría de invitaciones', async () => {
    await createInvitation(as('admin'), 'admin', 'nuevo@test.com', 'member');
    const invitationsLog = (uid: string) => query(collection(as(uid), 'auditLog'), where('entityType', '==', 'invitation'));
    await assertSucceeds(getDocs(invitationsLog('admin')));
    await assertFails(getDocs(invitationsLog('ana')));
  });
});
