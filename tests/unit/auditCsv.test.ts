import { describe, expect, it } from 'vitest';
import { auditCsvRow, auditToCsv, csvCell } from '@/features/audit/auditCsv';
import type { AuditContext } from '@/features/audit/describeAuditEntry';

const ctx: AuditContext = { nameOf: (id) => (id === 'ana' ? 'Ana' : null), projectNameOf: () => null, formatNumber: (n) => `MC-${n}` };

describe('csvCell', () => {
  it('pone comillas y duplica las comillas internas', () => {
    expect(csvCell('hola')).toBe('"hola"');
    expect(csvCell('dijo "sí"; listo')).toBe('"dijo ""sí""; listo"');
  });

  it('neutraliza lo que una planilla tomaría como fórmula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1')).toBe('"\'+1"');
    expect(csvCell('-2')).toBe('"\'-2"');
    expect(csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
  });
});

describe('auditToCsv', () => {
  it('BOM, encabezado, separador ; y una línea por cambio', () => {
    const at = new Date(2026, 9, 13, 9, 5).getTime();
    const row = auditCsvRow(
      { entityType: 'task', entityId: 't1', rev: 2, action: 'update', actorId: 'ana', at,
        before: { number: 4, title: 'Luz', status: 'todo' }, after: { number: 4, title: 'Luz', status: 'done' } },
      ctx,
    );
    expect(row).toEqual({ at, person: 'Ana', type: 'Tarea', subject: 'MC-4 · Luz', action: 'Cambio', detail: 'Ana cambió el estado de Pendiente a Hecha' });
    const csv = auditToCsv([row]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      '"Fecha";"Persona";"Tipo";"Elemento";"Acción";"Detalle"',
      '"2026-10-13 09:05";"Ana";"Tarea";"MC-4 · Luz";"Cambio";"Ana cambió el estado de Pendiente a Hecha"',
      '',
    ]);
  });

  it('varias frases van en la misma celda, separadas por punto y coma', () => {
    const row = auditCsvRow(
      { entityType: 'project', entityId: 'p', rev: 2, action: 'update', actorId: 'ana', at: 0,
        before: { name: 'A', archived: false, color: '#111111' }, after: { name: 'A', archived: true, color: '#222222' } },
      ctx,
    );
    expect(row.detail).toBe('Ana archivó el proyecto; Ana cambió el color del proyecto');
  });
});
