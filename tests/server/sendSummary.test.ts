// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { processSendSummary, type SendSummaryDeps } from '../../functions/sendSummary';

// En vez de mockear firebase-admin y SES, se inyectan dependencias falsas.
function makeDeps(overrides: Partial<SendSummaryDeps> = {}): SendSummaryDeps {
  return {
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1', email: 'ana@mail.com', name: 'Ana' }),
    getTasksForUser: vi.fn().mockResolvedValue([{ title: 'Tarea', description: '', status: 'todo' }]),
    sendEmail: vi.fn().mockResolvedValue('msg-123'),
    appUrl: 'https://app.test',
    now: () => new Date('2026-09-28T18:00:00Z'),
    ...overrides,
  };
}

function post(token?: string) {
  return { method: 'POST', authorization: token ? `Bearer ${token}` : undefined };
}

describe('processSendSummary', () => {
  it('rechaza métodos distintos de POST con 405', async () => {
    const result = await processSendSummary(makeDeps(), { method: 'GET', authorization: undefined });
    expect(result.status).toBe(405);
    expect(result.body).toMatchObject({ ok: false, code: 'method_not_allowed' });
  });

  it('responde 401 sin token', async () => {
    const deps = makeDeps();
    const result = await processSendSummary(deps, post());
    expect(result.status).toBe(401);
    expect(deps.verifyIdToken).not.toHaveBeenCalled();
  });

  it('responde 401 si el token es inválido', async () => {
    const authError = Object.assign(new Error('expired'), { code: 'auth/id-token-expired' });
    const deps = makeDeps({ verifyIdToken: vi.fn().mockRejectedValue(authError) });
    const result = await processSendSummary(deps, post('malo'));
    expect(result.status).toBe(401);
    expect(result.body).toMatchObject({ ok: false, code: 'unauthorized' });
  });

  it('responde 500 (no 401) si falla la configuración del servidor al verificar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const configError = new Error('Falta la variable de entorno FIREBASE_ADMIN_PRIVATE_KEY');
    const deps = makeDeps({ verifyIdToken: vi.fn().mockRejectedValue(configError) });
    const result = await processSendSummary(deps, post('ok'));
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ code: 'internal_error' });
  });

  it('responde 400 si el usuario no tiene email', async () => {
    const deps = makeDeps({ verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1' }) });
    const result = await processSendSummary(deps, post('ok'));
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ code: 'missing_email' });
  });

  it('lee las tareas del uid del token y envía el email a su dirección', async () => {
    const deps = makeDeps();
    const result = await processSendSummary(deps, post('ok'));
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, messageId: 'msg-123', to: 'ana@mail.com' });
    expect(deps.verifyIdToken).toHaveBeenCalledWith('ok');
    expect(deps.getTasksForUser).toHaveBeenCalledWith('u1');
    expect(deps.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ana@mail.com', subject: expect.stringContaining('1 pendiente') }),
    );
  });

  it('responde 502 si SES falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = makeDeps({ sendEmail: vi.fn().mockRejectedValue(new Error('MessageRejected')) });
    const result = await processSendSummary(deps, post('ok'));
    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({ code: 'email_failed' });
  });

  it('responde 500 si falla la lectura de tareas', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = makeDeps({ getTasksForUser: vi.fn().mockRejectedValue(new Error('firestore down')) });
    const result = await processSendSummary(deps, post('ok'));
    expect(result.status).toBe(500);
    expect(result.body).toMatchObject({ code: 'internal_error' });
  });
});
