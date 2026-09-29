export type SummaryTask = { title: string; description: string; completed: boolean };
export type Summary = { total: number; pending: number; completed: number };

/** Zona horaria para la fecha del email (la función corre en UTC). */
const TIME_ZONE = 'America/Mexico_City';

const FONT = "'IBM Plex Sans',Arial,sans-serif";

export function buildSummary(tasks: SummaryTask[]): Summary {
  const completed = tasks.filter((t) => t.completed).length;
  return { total: tasks.length, pending: tasks.length - completed, completed };
}

/** Los títulos los escribe el usuario: se escapan para que no puedan inyectar HTML en el email. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plural(n: number, singular: string, pluralWord: string): string {
  return `${n} ${n === 1 ? singular : pluralWord}`;
}

function statCell(value: number, label: string, color: string, first = false): string {
  const border = first ? '' : 'border-left:1px solid #EDEDE9;';
  return `<td width="33%" style="padding:14px 16px;${border}"><div style="font-size:22px;font-weight:600;color:${color};">${value}</div><div style="font-size:12px;color:#55554E;">${label}</div></td>`;
}

function sectionTitle(label: string): string {
  return `<tr><td style="padding:28px 32px 8px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8A8A81;">${label}</td></tr>`;
}

function taskRows(tasks: SummaryTask[], done: boolean): string {
  const rows = tasks
    .map((t) => {
      const title = escapeHtml(t.title);
      return done
        ? `<tr><td style="padding:10px 0;border-top:1px solid #EDEDE9;font-size:14px;color:#8A8A81;text-decoration:line-through;">${title}</td><td align="right" style="padding:10px 0;border-top:1px solid #EDEDE9;font-size:12px;color:#157F4A;">✓</td></tr>`
        : `<tr><td colspan="2" style="padding:12px 0;border-top:1px solid #EDEDE9;font-size:14px;color:#14151A;">${title}${t.description ? `<br><span style="font-size:12px;color:#8A8A81;">${escapeHtml(t.description)}</span>` : ''}</td></tr>`;
    })
    .join('');
  return `<tr><td style="padding:0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT};">${rows}</table></td></tr>`;
}

/**
 * Arma el email de resumen (asunto, HTML y texto plano).
 * Los emails usan tablas y estilos en línea porque muchos clientes de correo ignoran el CSS moderno.
 */
export function renderSummaryEmail(input: {
  name: string;
  tasks: SummaryTask[];
  date: Date;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { name, tasks, date, appUrl } = input;
  const summary = buildSummary(tasks);
  const pendingTasks = tasks.filter((t) => !t.completed);
  const doneTasks = tasks.filter((t) => t.completed);
  const dateLabel = new Intl.DateTimeFormat('es', { dateStyle: 'long', timeZone: TIME_ZONE }).format(date);
  const tasksUrl = `${appUrl.replace(/\/$/, '')}/tasks`;
  const safeName = escapeHtml(name);

  const subject = `Tu resumen de tareas: ${plural(summary.pending, 'pendiente', 'pendientes')}, ${plural(summary.completed, 'completada', 'completadas')}`;

  const body =
    summary.total === 0
      ? `<tr><td style="padding:24px 32px 0;font-family:${FONT};font-size:14px;color:#55554E;">No tienes tareas todavía. ¡Crea la primera desde la app!</td></tr>`
      : [
          pendingTasks.length ? sectionTitle('Pendientes') + taskRows(pendingTasks, false) : '',
          doneTasks.length ? sectionTitle('Completadas') + taskRows(doneTasks, true) : '',
        ].join('');

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Resumen de tareas</title></head>
<body style="margin:0;padding:0;background:#F6F6F4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F6F4;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E3E3DE;border-radius:12px;">
<tr><td style="padding:28px 32px 8px;font-family:${FONT};font-size:14px;font-weight:600;color:#14151A;">MateCode <span style="font-weight:400;color:#55554E;">Tasks</span></td></tr>
<tr><td style="padding:20px 32px 0;font-family:${FONT};"><h1 style="margin:0 0 6px;font-size:22px;line-height:1.3;font-weight:600;color:#14151A;">Hola ${safeName}, este es tu resumen</h1><p style="margin:0;font-size:14px;line-height:1.55;color:#55554E;">Estado de tus tareas al ${dateLabel}.</p></td></tr>
<tr><td style="padding:24px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E3E3DE;border-radius:8px;font-family:${FONT};"><tr>${statCell(summary.total, 'Total', '#14151A', true)}${statCell(summary.pending, 'Pendientes', '#14151A')}${statCell(summary.completed, 'Completadas', '#157F4A')}</tr></table></td></tr>
${body}
<tr><td style="padding:28px 32px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#14151A;border-radius:8px;"><a href="${escapeHtml(tasksUrl)}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:14px;font-weight:500;color:#F6F6F4;text-decoration:none;">Abrir mis tareas</a></td></tr></table></td></tr>
</table>
<p style="max-width:560px;padding:16px 32px;margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:#8A8A81;">Recibiste este email porque lo solicitaste desde MateCode Tasks. Enviado con AWS SES.</p>
</td></tr></table>
</body></html>`;

  const text = [
    `Hola ${name}, este es tu resumen de tareas al ${dateLabel}.`,
    '',
    `Total: ${summary.total} · Pendientes: ${summary.pending} · Completadas: ${summary.completed}`,
    '',
    ...(summary.total === 0 ? ['No tienes tareas todavía.', ''] : []),
    ...(pendingTasks.length ? [`Pendientes (${pendingTasks.length})`, ...pendingTasks.map((t) => `- ${t.title}`), ''] : []),
    ...(doneTasks.length ? [`Completadas (${doneTasks.length})`, ...doneTasks.map((t) => `- ${t.title}`), ''] : []),
    `Abrir mis tareas: ${tasksUrl}`,
  ].join('\n');

  return { subject, html, text };
}
