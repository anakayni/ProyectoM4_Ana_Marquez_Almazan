import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/features/settings/defaults';
import { saveSettings } from '@/services/audited/settings';
import { anonDb, createEnv, dbAs, seedUser } from './helpers';

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
});

describe('ajustes del espacio', () => {
  it('cualquiera los lee, incluso sin sesión (para el login)', async () => {
    await saveSettings(as('admin'), 'admin', DEFAULT_SETTINGS);
    await assertSucceeds(getDoc(doc(anonDb(env), 'settings', 'workspace')));
  });

  it('solo el admin los cambia, y con auditoría', async () => {
    await assertSucceeds(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, name: 'Ferretería López' }));
    await assertSucceeds(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, taskPrefix: 'FL' }));
    await assertFails(saveSettings(as('ana'), 'ana', { ...DEFAULT_SETTINGS, name: 'Hackeado' }));
    await assertFails(setDoc(doc(as('admin'), 'settings', 'workspace'), { ...DEFAULT_SETTINGS, rev: 9 }));
  });

  it('valida nombre, logo, paleta y prefijo', async () => {
    await assertFails(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, name: '' }));
    await assertFails(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, logo: 'data:image/jpeg;base64,AAAA' }));
    await assertFails(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, palette: ['#000000'] }));
    await assertFails(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, taskPrefix: 'mc' }));
    await assertSucceeds(saveSettings(as('admin'), 'admin', { ...DEFAULT_SETTINGS, logo: `data:image/png;base64,${'A'.repeat(500)}` }));
  });
});
