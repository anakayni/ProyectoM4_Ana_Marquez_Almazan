import { describe, expect, it } from 'vitest';
import { fieldLabel, formatAuditValue } from '@/features/audit/auditFields';
import type { AuditContext } from '@/features/audit/describeAuditEntry';
import { formatDateTime } from '@/utils/formatDate';

const ctx: AuditContext = {
  nameOf: (id) => (id === 'leo' ? 'Leo' : null),
  projectNameOf: (id) => (id === 'p1' ? 'Portal' : null),
  formatNumber: (n) => `MC-${n}`,
};

describe('fieldLabel', () => {
  it('traduce los campos conocidos y deja igual los desconocidos', () => {
    expect(fieldLabel('assigneeId')).toBe('Responsable');
    expect(fieldLabel('taskPrefix')).toBe('Prefijo');
    expect(fieldLabel('raro')).toBe('raro');
  });
});

describe('formatAuditValue', () => {
  it('vacíos, sí/no e imágenes', () => {
    expect(formatAuditValue('dueDate', null, ctx)).toBe('—');
    expect(formatAuditValue('description', '', ctx)).toBe('—');
    expect(formatAuditValue('active', true, ctx)).toBe('Sí');
    expect(formatAuditValue('archived', false, ctx)).toBe('No');
    expect(formatAuditValue('photo', 'data:image/jpeg;base64,abc', ctx)).toBe('(imagen)');
  });

  it('IDs a nombres y códigos a etiquetas', () => {
    expect(formatAuditValue('assigneeId', 'leo', ctx)).toBe('Leo');
    expect(formatAuditValue('ownerId', 'nadie', ctx)).toBe('Persona desconocida');
    expect(formatAuditValue('projectId', 'p1', ctx)).toBe('Portal');
    expect(formatAuditValue('status', 'doing', ctx)).toBe('En curso');
    expect(formatAuditValue('status', 'revoked', ctx)).toBe('Cancelada');
    expect(formatAuditValue('priority', 'alta', ctx)).toBe('Alta');
    expect(formatAuditValue('role', 'viewer', ctx)).toBe('Lector');
    expect(formatAuditValue('number', 7, ctx)).toBe('MC-7');
  });

  it('personas del proyecto con nombres', () => {
    expect(fieldLabel('memberIds')).toBe('Personas');
    expect(formatAuditValue('memberIds', ['leo', 'x'], ctx)).toBe('Leo, Persona desconocida');
    expect(formatAuditValue('memberIds', [], ctx)).toBe('—');
  });

  it('fechas, listas y subtareas', () => {
    const ms = new Date(2026, 9, 13, 18, 30).getTime();
    expect(formatAuditValue('createdAt', { toMillis: () => ms }, ctx)).toBe(formatDateTime(ms));
    expect(formatAuditValue('palette', ['#111111', '#222222'], ctx)).toBe('#111111, #222222');
    expect(formatAuditValue('subtasks', [{ id: 'a', title: 'Comprar', done: true }, { id: 'b', title: 'Pagar', done: false }], ctx))
      .toBe('✓ Comprar · ○ Pagar');
  });
});
