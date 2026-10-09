import { assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { afterAll, beforeAll, it } from 'vitest';
import { anonDb, createEnv } from './helpers';

let env: Awaited<ReturnType<typeof createEnv>>;
beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});

it('un visitante sin sesión no puede leer tareas', async () => {
  await assertFails(getDoc(doc(anonDb(env), 'tasks/t1')));
});
