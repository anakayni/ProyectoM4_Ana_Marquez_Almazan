// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildSummary, escapeHtml, renderSummaryEmail } from '../../functions/summaryEmail';

const tasks = [
  { title: 'Llamar al proveedor', description: '', completed: false },
  { title: 'Ordenar facturas', description: 'Agosto', completed: true },
  { title: 'Cotizar <b>envío</b>', description: '', completed: false },
];

describe('buildSummary', () => {
  it('cuenta total, pendientes y completadas', () => {
    expect(buildSummary(tasks)).toEqual({ total: 3, pending: 2, completed: 1 });
  });

  it('funciona con lista vacía', () => {
    expect(buildSummary([])).toEqual({ total: 0, pending: 0, completed: 0 });
  });
});

describe('escapeHtml', () => {
  it('escapa caracteres peligrosos', () => {
    expect(escapeHtml(`<script>"a" & 'b'</script>`)).toBe('&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;');
  });
});

describe('renderSummaryEmail', () => {
  const email = renderSummaryEmail({
    name: 'Ana',
    tasks,
    date: new Date('2026-09-28T18:00:00Z'),
    appUrl: 'https://matecode-tasks.vercel.app',
  });

  it('arma el asunto con los totales', () => {
    expect(email.subject).toBe('Tu resumen de tareas: 2 pendientes, 1 completada');
  });

  it('incluye saludo, totales, tareas y link en el HTML', () => {
    expect(email.html).toContain('Hola Ana');
    expect(email.html).toContain('Llamar al proveedor');
    expect(email.html).toContain('Ordenar facturas');
    expect(email.html).toContain('https://matecode-tasks.vercel.app/tasks');
  });

  it('escapa el contenido escrito por el usuario', () => {
    expect(email.html).toContain('Cotizar &lt;b&gt;envío&lt;/b&gt;');
    expect(email.html).not.toContain('<b>envío</b>');
  });

  it('genera versión de texto plano', () => {
    expect(email.text).toContain('Pendientes (2)');
    expect(email.text).toContain('- Llamar al proveedor');
    expect(email.text).toContain('Completadas (1)');
  });

  it('muestra un mensaje si no hay tareas', () => {
    const empty = renderSummaryEmail({ name: 'Ana', tasks: [], date: new Date(), appUrl: 'https://x.app' });
    expect(empty.html).toContain('No tienes tareas todavía');
  });
});
