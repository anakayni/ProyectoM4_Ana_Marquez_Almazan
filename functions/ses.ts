import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { requireEnv } from './env.js';
import type { EmailMessage } from './sendSummary.js';

let client: SESv2Client | undefined;

function getClient(): SESv2Client {
  client ??= new SESv2Client({
    region: requireEnv('SES_AWS_REGION'),
    credentials: {
      accessKeyId: requireEnv('SES_AWS_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('SES_AWS_SECRET_ACCESS_KEY'),
    },
  });
  return client;
}

/** Envía el email con AWS SES v2 y devuelve el MessageId. */
export async function sendEmail({ to, subject, html, text }: EmailMessage): Promise<string> {
  const result = await getClient().send(
    new SendEmailCommand({
      FromEmailAddress: requireEnv('SES_FROM_EMAIL'),
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: { Html: { Data: html, Charset: 'UTF-8' }, Text: { Data: text, Charset: 'UTF-8' } },
        },
      },
    }),
  );
  return result.MessageId ?? '';
}
