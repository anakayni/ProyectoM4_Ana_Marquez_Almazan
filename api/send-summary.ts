import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTasksForUser, verifyIdToken } from '../functions/firebaseAdmin.js';
import { processSendSummary } from '../functions/sendSummary.js';
import { sendEmail } from '../functions/ses.js';

/**
 * Vercel Function: POST /api/send-summary
 * Conecta la lógica (functions/sendSummary.ts) con Firebase Admin y AWS SES reales.
 */
export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  const result = await processSendSummary(
    { verifyIdToken, getTasksForUser, sendEmail, appUrl: process.env.APP_URL ?? '' },
    { method: request.method, authorization: request.headers.authorization },
  );

  if (result.status === 405) {
    response.setHeader('Allow', 'POST');
  }

  response.status(result.status).json(result.body);
}
