import type { SendSummaryErrorCode, SendSummaryResponse } from '../src/types/api';
// Extensión .js: en Vercel (Node con ESM) los imports relativos la necesitan; TypeScript la resuelve al .ts.
import { renderSummaryEmail, type SummaryTask } from './summaryEmail.js';

export type EmailMessage = { to: string; subject: string; html: string; text: string };

type VerifiedUser = { uid: string; email?: string; name?: string };

/**
 * Las dependencias se inyectan para poder testear la lógica sin Firebase ni AWS reales.
 * api/send-summary.ts le pasa las implementaciones reales.
 */
export type SendSummaryDeps = {
  verifyIdToken: (token: string) => Promise<VerifiedUser>;
  getTasksForUser: (uid: string) => Promise<SummaryTask[]>;
  sendEmail: (message: EmailMessage) => Promise<string>;
  appUrl: string;
  now?: () => Date;
};

/** Lo único que la lógica necesita de la petición HTTP. */
export type SendSummaryInput = { method: string | undefined; authorization: string | undefined };

/** Resultado que el handler de Vercel traduce a `response.status(status).json(body)`. */
export type SendSummaryResult = { status: number; body: SendSummaryResponse };

function fail(status: number, code: SendSummaryErrorCode, message: string): SendSummaryResult {
  return { status, body: { ok: false, code, message } };
}

/** Los errores de Firebase Auth traen códigos "auth/..." (token vencido, inválido, etc.). */
function isAuthError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && String(error.code).startsWith('auth/');
}

function readBearerToken(authorization: string | undefined): string | null {
  const [scheme, token] = (authorization ?? '').split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

export async function processSendSummary(deps: SendSummaryDeps, input: SendSummaryInput): Promise<SendSummaryResult> {
  if (input.method !== 'POST') {
    return fail(405, 'method_not_allowed', 'Método no permitido.');
  }

  const token = readBearerToken(input.authorization);
  if (!token) return fail(401, 'unauthorized', 'Inicia sesión para enviar el resumen.');

  // El uid y el email salen del token verificado, nunca de datos enviados por el cliente.
  let user: VerifiedUser;
  try {
    user = await deps.verifyIdToken(token);
  } catch (error) {
    if (isAuthError(error)) return fail(401, 'unauthorized', 'Tu sesión expiró. Vuelve a iniciar sesión.');
    // Otro error (p. ej. faltan variables de entorno) es un problema del servidor, no del usuario.
    console.error('send-summary: error verificando el token', error);
    return fail(500, 'internal_error', 'Ocurrió un error en el servidor. Inténtalo más tarde.');
  }

  if (!user.email) return fail(400, 'missing_email', 'Tu cuenta no tiene un email asociado.');

  let tasks: SummaryTask[];
  try {
    tasks = await deps.getTasksForUser(user.uid);
  } catch (error) {
    console.error('send-summary: error leyendo tareas', error);
    return fail(500, 'internal_error', 'No pudimos leer tus tareas. Inténtalo de nuevo.');
  }

  const now = deps.now ?? (() => new Date());
  const email = renderSummaryEmail({ name: user.name || user.email, tasks, date: now(), appUrl: deps.appUrl });

  try {
    const messageId = await deps.sendEmail({ to: user.email, ...email });
    return { status: 200, body: { ok: true, messageId, to: user.email } };
  } catch (error) {
    console.error('send-summary: error de SES', error);
    return fail(502, 'email_failed', 'No pudimos enviar el email. Inténtalo más tarde.');
  }
}
