import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTask, deleteTask, updateTask } from '@/services/audited/tasks';
import { createEnv, dbAs, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const input = { title: 'Llamar', description: '', priority: 'media' as const, dueDate: null, assigneeId: null };
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
  await seedUser(env, 'luis', 'member');
  await seedUser(env, 'vera', 'viewer');
  await seedUser(env, 'ex', 'member', false);
});

describe('tareas', () => {
  it('todos los usuarios activos leen todas las tareas', async () => {
    await createTask(as('ana'), 'ana', input);
    await assertSucceeds(getDocs(collection(as('vera'), 'tasks')));
    await assertSucceeds(getDocs(collection(as('luis'), 'tasks')));
  });

  it('un usuario desactivado no lee', async () => {
    await assertFails(getDocs(collection(as('ex'), 'tasks')));
  });

  it('miembro crea tareas con auditoría; lector no', async () => {
    await assertSucceeds(createTask(as('ana'), 'ana', input));
    await assertFails(createTask(as('vera'), 'vera', input));
  });

  it('no se puede crear una tarea sin su entrada de auditoría', async () => {
    // Datos válidos en todo (hora del servidor incluida): lo único que falta es la auditoría.
    await assertFails(
      setDoc(doc(collection(as('ana'), 'tasks')), {
        createdBy: 'ana', title: 'x', description: '', status: 'todo', assigneeId: null, completedBy: null, completedAt: null,
        priority: 'media', dueDate: null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: 'ana', rev: 1,
      }),
    );
  });

  it('un miembro edita la tarea de otro (con auditoría)', async () => {
    const id = await createTask(as('ana'), 'ana', input);
    await assertSucceeds(updateTask(as('luis'), 'luis', id, { status: 'doing' }));
  });

  it('editar sin subir rev ni dejar auditoría falla', async () => {
    const id = await createTask(as('ana'), 'ana', input);
    await assertFails(updateDoc(doc(as('ana'), 'tasks', id), { title: 'sin rastro' }));
  });

  it('miembro borra solo lo que creó; admin borra todo; lector nada', async () => {
    const id1 = await createTask(as('ana'), 'ana', input);
    await assertFails(deleteTask(as('luis'), 'luis', id1));
    await assertFails(deleteTask(as('vera'), 'vera', id1));
    await assertSucceeds(deleteTask(as('ana'), 'ana', id1));
    const id2 = await createTask(as('ana'), 'ana', input);
    await assertSucceeds(deleteTask(as('admin'), 'admin', id2));
  });

  it('no se puede cambiar createdBy', async () => {
    const id = await createTask(as('ana'), 'ana', input);
    await assertFails(updateTask(as('luis'), 'luis', id, { createdBy: 'luis' } as never));
  });

  it('la creación queda auditada', async () => {
    const id = await createTask(as('ana'), 'ana', input);
    await assertSucceeds(getDoc(doc(as('ana'), 'auditLog', `task_${id}_1`)));
  });

  describe('una edición hecha "a mano" con writeBatch', () => {
    async function manualEdit(uid: string, fakeBefore: boolean) {
      const id = await createTask(as('ana'), 'ana', input);
      const db = as(uid);
      const current = (await getDoc(doc(db, 'tasks', id))).data()!;
      const after = { ...current, title: 'nuevo', rev: 2, updatedBy: uid, updatedAt: serverTimestamp() };
      const batch = writeBatch(db);
      batch.set(doc(db, 'tasks', id), after);
      batch.set(doc(db, 'auditLog', `task_${id}_2`), {
        entityType: 'task', entityId: id, rev: 2, action: 'update', actorId: uid, at: serverTimestamp(),
        before: fakeBefore ? { ...current, title: 'FALSO' } : current,
        after,
      });
      return batch.commit();
    }

    it('funciona si la auditoría es honesta (control)', async () => {
      await assertSucceeds(manualEdit('ana', false));
    });

    it('se rechaza si la auditoría miente sobre el "before"', async () => {
      await assertFails(manualEdit('ana', true));
    });
  });

  describe('estado, responsable y completado', () => {
    const data = async (id: string) => (await getDoc(doc(as('admin'), 'tasks', id))).data()!;

    it('una tarea nueva empieza Pendiente, sin responsable y sin completar', async () => {
      const id = await createTask(as('ana'), 'ana', input);
      const d = await data(id);
      expect([d.status, d.assigneeId, d.completedBy, d.completedAt]).toEqual(['todo', null, null, null]);
    });

    it('se puede asignar a un miembro o admin activo', async () => {
      await assertSucceeds(createTask(as('ana'), 'ana', { ...input, assigneeId: 'luis' }));
      const id = await createTask(as('ana'), 'ana', input);
      await assertSucceeds(updateTask(as('ana'), 'ana', id, { assigneeId: 'admin' }));
    });

    it.each(['vera', 'ex', 'nadie'])('no se puede asignar a "%s" (lector, inactivo o inexistente)', async (uid) => {
      await assertFails(createTask(as('ana'), 'ana', { ...input, assigneeId: uid }));
      const id = await createTask(as('ana'), 'ana', input);
      await assertFails(updateTask(as('ana'), 'ana', id, { assigneeId: uid }));
    });

    it('si el responsable se desactiva, la tarea se sigue editando', async () => {
      const id = await createTask(as('ana'), 'ana', { ...input, assigneeId: 'luis' });
      await seedUser(env, 'luis', 'member', false);
      await assertSucceeds(updateTask(as('ana'), 'ana', id, { title: 'Llamar hoy' }));
    });

    it('rechaza un estado inválido y el campo viejo "completed"', async () => {
      const id = await createTask(as('ana'), 'ana', input);
      await assertFails(updateTask(as('ana'), 'ana', id, { status: 'archivada' } as never));
      await assertFails(updateTask(as('ana'), 'ana', id, { completed: true } as never));
    });

    it('al completar guarda quién y cuándo; al reabrir se vacía', async () => {
      const id = await createTask(as('ana'), 'ana', input);
      await assertSucceeds(updateTask(as('luis'), 'luis', id, { status: 'done' }));
      const done = await data(id);
      expect(done.completedBy).toBe('luis');
      expect(done.completedAt).not.toBeNull();
      await assertSucceeds(updateTask(as('ana'), 'ana', id, { status: 'doing' }));
      const reopened = await data(id);
      expect([reopened.completedBy, reopened.completedAt]).toEqual([null, null]);
    });

    describe('completado "a mano"', () => {
      async function manualComplete(completedBy: string, keepDone = false) {
        const id = await createTask(as('ana'), 'ana', input);
        if (keepDone) await updateTask(as('ana'), 'ana', id, { status: 'done' });
        const db = as('ana');
        const current = (await getDoc(doc(db, 'tasks', id))).data()!;
        const rev = current.rev + 1;
        const after = {
          ...current, status: 'done', completedBy, completedAt: serverTimestamp(),
          rev, updatedBy: 'ana', updatedAt: serverTimestamp(),
        };
        const batch = writeBatch(db);
        batch.set(doc(db, 'tasks', id), after);
        batch.set(doc(db, 'auditLog', `task_${id}_${rev}`), {
          entityType: 'task', entityId: id, rev, action: 'update', actorId: 'ana', at: serverTimestamp(), before: current, after,
        });
        return batch.commit();
      }

      it('funciona si quien completa es quien escribe (control)', async () => {
        await assertSucceeds(manualComplete('ana'));
      });

      it('no se puede atribuir el completado a otra persona', async () => {
        await assertFails(manualComplete('luis'));
      });

      it('no se puede cambiar la fecha de una tarea ya hecha', async () => {
        await assertFails(manualComplete('ana', true));
      });
    });
  });
});
