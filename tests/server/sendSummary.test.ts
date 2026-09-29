// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createSendSummaryHandler, type SendSummaryDeps } from '../../functions/sendSummary';

// En vez de mockear firebase-admin y SES, se inyectan dependencias falsas.
function makeDeps(overrides: Partial<SendSummaryDeps> = {}): SendSummaryDeps {
  return {
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1', email: 'ana@mail.com', name: 'Ana' }),
    getTasksForUser: vi.fn().mockResolvedValue([{ title: 'Tarea', description: '', completed: false }]),
    sendEmail: vi.fn().mockResolvedValue('msg-123'),
    appUrl: 'https://app.test',
    now: () => new Date('2026-09-28T18:00:00Z'),
    ...overrides,
  };
}

function post(token?: string) {
  return new Request('https://app.test/api/send-summary', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe('send-summary handler', () => {
  it('rechaza métodos distintos de POST con 405', async () => {
    const handler = createSendSummaryHandler(makeDeps());
    const res = await handler(new Request('https://app.test/api/send-summary', { method: 'GET' }));
    expect(res.status).toBe(405);
    expect(await res.json()).toMatchObject({ ok: false, code: 'method_not_allowed' });
  });

  it('responde 401 sin token', async () => {
    const deps = makeDeps();
    const res = await createSendSummaryHandler(deps)(post());
    expect(res.status).toBe(401);
    expect(deps.verifyIdToken).not.toHaveBeenCalled();
  });

  it('responde 401 si el token es inválido', async () => {
    const authError = Object.assign(new Error('expired'), { code: 'auth/id-token-expired' });
    const deps = makeDeps({ verifyIdToken: vi.fn().mockRejectedValue(authError) });
    const res = await createSendSummaryHandler(deps)(post('malo'));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, code: 'unauthorized' });
  });

  it('responde 500 (no 401) si falla la configuración del servidor al verificar', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const configError = new Error('Falta la variable de entorno FIREBASE_ADMIN_PRIVATE_KEY');
    const deps = makeDeps({ verifyIdToken: vi.fn().mockRejectedValue(configError) });
    const res = await createSendSummaryHandler(deps)(post('ok'));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ code: 'internal_error' });
  });

  it('responde 400 si el usuario no tiene email', async () => {
    const deps = makeDeps({ verifyIdToken: vi.fn().mockResolvedValue({ uid: 'u1' }) });
    const res = await createSendSummaryHandler(deps)(post('ok'));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'missing_email' });
  });

  it('lee las tareas del uid del token y envía el email a su dirección', async () => {
    const deps = makeDeps();
    const res = await createSendSummaryHandler(deps)(post('ok'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, messageId: 'msg-123', to: 'ana@mail.com' });
    expect(deps.verifyIdToken).toHaveBeenCalledWith('ok');
    expect(deps.getTasksForUser).toHaveBeenCalledWith('u1');
    expect(deps.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ana@mail.com', subject: expect.stringContaining('1 pendiente') }),
    );
  });

  it('responde 502 si SES falla', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = makeDeps({ sendEmail: vi.fn().mockRejectedValue(new Error('MessageRejected')) });
    const res = await createSendSummaryHandler(deps)(post('ok'));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: 'email_failed' });
  });

  it('responde 500 si falla la lectura de tareas', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = makeDeps({ getTasksForUser: vi.fn().mockRejectedValue(new Error('firestore down')) });
    const res = await createSendSummaryHandler(deps)(post('ok'));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ code: 'internal_error' });
  });
});
