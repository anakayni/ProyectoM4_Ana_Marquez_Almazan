import { getIdToken } from '@/services/auth.service';
import type { SendSummaryResponse } from '@/types/api';

/** Error con un mensaje listo para mostrar al usuario. */
export class SummaryError extends Error {}

const NETWORK_ERROR = 'No pudimos conectar con el servidor. Revisa tu conexión.';
const UNKNOWN_ERROR = 'No pudimos enviar el resumen. Inténtalo de nuevo.';

/**
 * Pide a la Vercel Function que envíe el resumen por email.
 * Solo se manda el ID token: el servidor lee las tareas y decide el destinatario.
 */
export async function sendSummary(): Promise<{ to: string }> {
  const token = await getIdToken();

  let response: Response;
  try {
    response = await fetch('/api/send-summary', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new SummaryError(NETWORK_ERROR);
  }

  const body = (await response.json().catch(() => null)) as SendSummaryResponse | null;
  if (!body) throw new SummaryError(UNKNOWN_ERROR);
  if (!body.ok) throw new SummaryError(body.message);
  return { to: body.to };
}
