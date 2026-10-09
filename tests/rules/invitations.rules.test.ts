import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createInvitation, revokeInvitation } from '@/services/audited/invitations';
import { claimInvitation } from '@/services/audited/users';
import { createEnv, dbAs, seedUser } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
const as = (uid: string) => dbAs(env, uid, `${uid}@test.com`);
const nuevo = { uid: 'nuevo', email: 'nuevo@test.com', displayName: 'Nuevo', emailVerified: true };

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
});

describe('invitaciones', () => {
  it('solo un admin invita (y el email se guarda en minúsculas)', async () => {
    await assertSucceeds(createInvitation(as('admin'), 'admin', 'Nuevo@Test.com', 'member'));
    await assertFails(createInvitation(as('ana'), 'ana', 'otro@test.com', 'member'));
  });

  it('un miembro no puede leer invitaciones', async () => {
    await createInvitation(as('admin'), 'admin', 'nuevo@test.com', 'member');
    await assertFails(getDoc(doc(as('ana'), 'invitations', 'nuevo@test.com')));
  });

  it('la persona invitada, con email verificado, reclama su invitación con el rol asignado', async () => {
    await createInvitation(as('admin'), 'admin', 'nuevo@test.com', 'viewer');
    const db = dbAs(env, 'nuevo', 'nuevo@test.com');
    await assertSucceeds(claimInvitation(db, nuevo));
    const profile = await getDoc(doc(db, 'users', 'nuevo'));
    expect(profile.data()?.role).toBe('viewer');
  });

  it('no se puede reclamar con el email sin verificar', async () => {
    await createInvitation(as('admin'), 'admin', 'nuevo@test.com', 'member');
    await assertFails(claimInvitation(dbAs(env, 'nuevo', 'nuevo@test.com', false), nuevo));
  });

  it('no se puede reclamar la invitación de otro email', async () => {
    await createInvitation(as('admin'), 'admin', 'nuevo@test.com', 'member');
    await assertFails(claimInvitation(dbAs(env, 'intruso', 'intruso@test.com'), { ...nuevo, uid: 'intruso' }));
  });

  it('una invitación cancelada ya no se puede reclamar', async () => {
    await createInvitation(as('admin'), 'admin', 'nuevo@test.com', 'member');
    await assertSucceeds(revokeInvitation(as('admin'), 'admin', 'nuevo@test.com'));
    await expect(claimInvitation(dbAs(env, 'nuevo', 'nuevo@test.com'), nuevo)).rejects.toThrow();
  });

  it('se puede volver a invitar un email cancelado', async () => {
    await createInvitation(as('admin'), 'admin', 'nuevo@test.com', 'member');
    await revokeInvitation(as('admin'), 'admin', 'nuevo@test.com');
    await assertSucceeds(createInvitation(as('admin'), 'admin', 'nuevo@test.com', 'viewer'));
  });
});
