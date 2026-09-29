export type SendSummaryErrorCode =
  | 'method_not_allowed'
  | 'unauthorized'
  | 'missing_email'
  | 'email_failed'
  | 'internal_error';

/** Respuesta de POST /api/send-summary (compartida por cliente y servidor). */
export type SendSummaryResponse =
  | { ok: true; messageId: string; to: string }
  | { ok: false; code: SendSummaryErrorCode; message: string };
