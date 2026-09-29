import { getTasksForUser, verifyIdToken } from '../functions/firebaseAdmin.js';
import { createSendSummaryHandler } from '../functions/sendSummary.js';
import { sendEmail } from '../functions/ses.js';

// Punto de entrada de la Vercel Function: conecta el handler con Firebase Admin y SES reales.
const handler = createSendSummaryHandler({
  verifyIdToken,
  getTasksForUser,
  sendEmail,
  appUrl: process.env.APP_URL ?? '',
});

// Vercel Functions aceptan exports por método HTTP con Request/Response estándar.
export function POST(request: Request): Promise<Response> {
  return handler(request);
}
