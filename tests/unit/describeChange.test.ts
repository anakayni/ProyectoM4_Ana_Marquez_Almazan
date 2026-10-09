import { describe, expect, it } from 'vitest';
import { describeChange } from '@/features/audit/describeChange';
import type { AuditEntry } from '@/types/audit';

const names: Record<string, string> = { ana: 'Ana', luis: 'Luis' };
const nameOf = (uid: string | null) => (uid ? names[uid] ?? null : null);
const base = { title: 'Pagar luz', description: '', status: 'todo', assigneeId: null, priority: 'media', dueDate: null, rev: 1 };
const entry = (over: Partial<AuditEntry>): AuditEntry => ({
  entityType: 'task', entityId: 't', rev: 2, action: 'update', actorId: 'ana', at: 0, before: base, after: base, ...over,
});

describe('describeChange', () => {
  it('creación y borrado', () => {
    expect(describeChange(entry({ action: 'create', before: null, actorId: 'luis' }), nameOf)).toEqual(['Luis creó la tarea']);
    expect(describeChange(entry({ action: 'delete', after: null }), nameOf)).toEqual(['Ana eliminó la tarea']);
  });

  it('cambio de estado', () => {
    expect(describeChange(entry({ after: { ...base, status: 'doing' } }), nameOf)).toEqual([
      'Ana cambió el estado de Pendiente a En curso',
    ]);
  });

  it('asignar y quitar responsable', () => {
    expect(describeChange(entry({ actorId: 'luis', after: { ...base, assigneeId: 'ana' } }), nameOf)).toEqual(['Luis asignó a Ana']);
    expect(describeChange(entry({ before: { ...base, assigneeId: 'ana' } }), nameOf)).toEqual(['Ana quitó el responsable']);
  });

  it('título, descripción, prioridad y vencimiento (una frase por campo)', () => {
    const after = { ...base, title: 'Pagar gas', description: 'x', priority: 'alta', dueDate: '2026-10-08' };
    expect(describeChange(entry({ after }), nameOf)).toEqual([
      'Ana cambió la descripción',
      'Ana cambió el vencimiento a 8 oct',
      'Ana cambió la prioridad de Media a Alta',
      'Ana cambió el título',
    ]);
  });

  it('no repite el completado (lo cuenta el cambio de estado)', () => {
    const after = { ...base, status: 'done', completedBy: 'ana', completedAt: 5 };
    expect(describeChange(entry({ after }), nameOf)).toEqual(['Ana cambió el estado de Pendiente a Hecha']);
  });

  it('actor del sistema o desconocido', () => {
    expect(describeChange(entry({ action: 'create', before: null, actorId: 'system' }), nameOf)).toEqual(['El sistema creó la tarea']);
    expect(describeChange(entry({ action: 'create', before: null, actorId: 'otro' }), nameOf)).toEqual(['Alguien creó la tarea']);
  });

  it('una edición sin cambios visibles igual queda contada', () => {
    expect(describeChange(entry({}), nameOf)).toEqual(['Ana actualizó la tarea']);
  });
});
