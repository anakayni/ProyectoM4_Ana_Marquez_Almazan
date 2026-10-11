import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { updateMember, updateOwnProfile } from '@/services/audited/users';
import { createEnv, dbAs, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
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
  await seedUser(env, 'ex', 'member', false);
});

describe('usuarios', () => {
  it('nadie crea su perfil sin invitación', async () => {
    await assertFails(
      setDoc(doc(dbAs(env, 'solo', 'solo@test.com'), 'users', 'solo'), {
        email: 'solo@test.com', displayName: 'Solo', role: 'admin', active: true,
        invitedBy: null, joinedAt: Timestamp.now(), rev: 1,
      }),
    );
  });

  it('el admin cambia el rol y desactiva a otras personas', async () => {
    await assertSucceeds(updateMember(as('admin'), 'admin', 'ana', { role: 'viewer' }));
    await assertSucceeds(updateMember(as('admin'), 'admin', 'ana', { active: false }));
  });

  it('el admin no puede cambiarse el rol ni desactivarse', async () => {
    await assertFails(updateMember(as('admin'), 'admin', 'admin', { role: 'member' }));
    await assertFails(updateMember(as('admin'), 'admin', 'admin', { active: false }));
  });

  it('un miembro no cambia roles, ni el suyo', async () => {
    await assertFails(updateMember(as('ana'), 'ana', 'ana', { role: 'admin' }));
  });

  it('cada persona cambia su propio nombre, pero no el de otros', async () => {
    await assertSucceeds(updateOwnProfile(as('ana'), 'ana', { displayName: 'Ana M.' }));
    await assertFails(updateOwnProfile(as('ana'), 'admin', { displayName: 'Hackeado' }));
  });

  it('una persona sin perfil puede leer su propio documento (para saber su estado)', async () => {
    await assertSucceeds(getDoc(doc(dbAs(env, 'solo', 'solo@test.com'), 'users', 'solo')));
  });

  it('un usuario desactivado no lee el equipo', async () => {
    await assertFails(getDoc(doc(as('ex'), 'users', 'ana')));
  });

  describe('foto de perfil', () => {
    const jpeg = (chars: number) => `data:image/jpeg;base64,${'A'.repeat(chars)}`;

    it('cada persona sube y quita su propia foto', async () => {
      await assertSucceeds(updateOwnProfile(as('ana'), 'ana', { photo: jpeg(1000) }));
      await assertSucceeds(updateOwnProfile(as('ana'), 'ana', { photo: null }));
    });

    it('rechaza una foto demasiado grande o que no es JPEG', async () => {
      await assertFails(updateOwnProfile(as('ana'), 'ana', { photo: jpeg(60000) }));
      await assertFails(updateOwnProfile(as('ana'), 'ana', { photo: 'data:image/png;base64,AAAA' }));
    });

    it('ni siquiera el admin cambia la foto o el nombre de otra persona', async () => {
      await assertFails(updateMember(as('admin'), 'admin', 'ana', { photo: jpeg(100) } as never));
      await assertFails(updateMember(as('admin'), 'admin', 'ana', { displayName: 'Otro' } as never));
    });
  });
});
