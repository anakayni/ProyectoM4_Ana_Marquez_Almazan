import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/auth.service', () => ({ getIdToken: vi.fn().mockResolvedValue('token-123') }));

import { SummaryError, sendSummary } from '@/api/summary.api';

describe('sendSummary', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('hace POST con el token y devuelve el destinatario', async () => {
    fetchMock.mockResolvedValue(Response.json({ ok: true, messageId: 'm1', to: 'ana@mail.com' }));
    await expect(sendSummary()).resolves.toEqual({ to: 'ana@mail.com' });
    expect(fetchMock).toHaveBeenCalledWith('/api/send-summary', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-123' },
    });
  });

  it('lanza el mensaje del servidor si responde con error', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ ok: false, code: 'email_failed', message: 'No pudimos enviar el email.' }, { status: 502 }),
    );
    await expect(sendSummary()).rejects.toEqual(new SummaryError('No pudimos enviar el email.'));
  });

  it('lanza un mensaje genérico si no hay red', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(sendSummary()).rejects.toEqual(new SummaryError('No pudimos conectar con el servidor. Revisa tu conexión.'));
  });
});
