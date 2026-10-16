import { describe, expect, it } from 'vitest';
import { describeAuditEntry, type AuditContext } from '@/features/audit/describeAuditEntry';
import { DEFAULT_SETTINGS } from '@/features/settings/defaults';
import type { AuditEntry } from '@/types/audit';

const names: Record<string, string> = { ana: 'Ana', leo: 'Leo', admin: 'Admin' };
const ctx: AuditContext = {
  nameOf: (id) => (id ? names[id] ?? null : null),
  projectNameOf: (id) => (id === 'p1' ? 'Portal' : null),
  formatNumber: (n) => `FL-${n}`,
};
const entry = (over: Partial<AuditEntry>): AuditEntry => ({
  entityType: 'task', entityId: 'x', rev: 2, action: 'update', actorId: 'ana', at: 0, before: null, after: null, ...over,
});

describe('describeAuditEntry', () => {
  it('tarea: número con el prefijo, título y las frases del historial', () => {
    const d = describeAuditEntry(
      entry({ before: { number: 12, title: 'Pagar luz', status: 'todo' }, after: { number: 12, title: 'Pagar luz', status: 'done' } }),
      ctx,
    );
    expect(d).toEqual({ type: 'Tarea', subject: 'FL-12 · Pagar luz', sentences: ['Ana cambió el estado de Pendiente a Hecha'] });
  });

  it('tarea sin número (antes de migrar): solo el título', () => {
    expect(describeAuditEntry(entry({ action: 'create', rev: 1, after: { title: 'Vieja' } }), ctx).subject).toBe('Vieja');
  });

  it('el sistema aparece como "El sistema"', () => {
    const d = describeAuditEntry(entry({ actorId: 'system', before: { title: 'A', number: null }, after: { title: 'A', number: 3 } }), ctx);
    expect(d.sentences).toEqual(['El sistema actualizó la tarea']);
  });

  it('proyecto: crear, archivar, poner a cargo y renombrar', () => {
    const p = { name: 'Portal', archived: false, ownerId: 'ana' };
    expect(describeAuditEntry(entry({ entityType: 'project', action: 'create', rev: 1, after: p }), ctx)).toEqual({
      type: 'Proyecto', subject: 'Portal', sentences: ['Ana creó el proyecto «Portal»'],
    });
    expect(describeAuditEntry(entry({ entityType: 'project', before: p, after: { ...p, archived: true } }), ctx).sentences)
      .toEqual(['Ana archivó el proyecto']);
    expect(describeAuditEntry(entry({ entityType: 'project', before: p, after: { ...p, ownerId: 'leo' } }), ctx).sentences)
      .toEqual(['Ana puso a Leo a cargo del proyecto']);
    expect(describeAuditEntry(entry({ entityType: 'project', before: p, after: { ...p, name: 'Web' } }), ctx).sentences)
      .toEqual(['Ana cambió el nombre del proyecto de «Portal» a «Web»']);
    expect(describeAuditEntry(entry({ entityType: 'project', action: 'delete', before: p, after: null }), ctx).sentences)
      .toEqual(['Ana eliminó el proyecto «Portal»']);
  });

  it('proyecto: agregar y quitar personas', () => {
    const p = { name: 'Portal', ownerId: 'ana' };
    expect(describeAuditEntry(entry({ entityType: 'project', actorId: 'admin', before: p, after: { ...p, memberIds: ['leo'] } }), ctx).sentences)
      .toEqual(['Admin agregó a Leo al proyecto «Portal»']);
    expect(describeAuditEntry(entry({ entityType: 'project', actorId: 'admin', before: { ...p, memberIds: ['leo', 'ana'] }, after: { ...p, memberIds: ['ana'] } }), ctx).sentences)
      .toEqual(['Admin quitó a Leo del proyecto «Portal»']);
  });

  it('persona: alta, rol, acceso y foto propia', () => {
    const u = { displayName: 'Leo', role: 'member', active: true, photo: null };
    expect(describeAuditEntry(entry({ entityType: 'user', entityId: 'leo', actorId: 'leo', action: 'create', rev: 1, after: u }), ctx))
      .toEqual({ type: 'Persona', subject: 'Leo', sentences: ['Leo se unió al equipo'] });
    expect(describeAuditEntry(entry({ entityType: 'user', entityId: 'leo', actorId: 'admin', before: u, after: { ...u, role: 'viewer' } }), ctx).sentences)
      .toEqual(['Admin cambió el rol de Leo de Miembro a Lector']);
    expect(describeAuditEntry(entry({ entityType: 'user', entityId: 'leo', actorId: 'admin', before: u, after: { ...u, active: false } }), ctx).sentences)
      .toEqual(['Admin desactivó el acceso de Leo']);
    expect(describeAuditEntry(entry({ entityType: 'user', entityId: 'leo', actorId: 'leo', before: u, after: { ...u, photo: 'data:image/jpeg;base64,x' } }), ctx).sentences)
      .toEqual(['Leo cambió su foto']);
  });

  it('invitación: crear, cancelar, aceptar y volver a invitar', () => {
    const inv = { email: 'leo@x.com', role: 'member', status: 'pending' };
    const base = { entityType: 'invitation' as const, entityId: 'leo@x.com', actorId: 'admin' };
    expect(describeAuditEntry(entry({ ...base, action: 'create', rev: 1, after: inv }), ctx))
      .toEqual({ type: 'Invitación', subject: 'leo@x.com', sentences: ['Admin invitó a leo@x.com como Miembro'] });
    expect(describeAuditEntry(entry({ ...base, before: inv, after: { ...inv, status: 'revoked' } }), ctx).sentences)
      .toEqual(['Admin canceló la invitación de leo@x.com']);
    expect(describeAuditEntry(entry({ ...base, actorId: 'leo', before: inv, after: { ...inv, status: 'accepted' } }), ctx).sentences)
      .toEqual(['Leo aceptó la invitación']);
    expect(describeAuditEntry(entry({ ...base, before: { ...inv, status: 'revoked' }, after: { ...inv, role: 'viewer' } }), ctx).sentences)
      .toEqual(['Admin volvió a invitar a leo@x.com como Lector']);
  });

  it('ajustes: el primer guardado se compara con los valores por defecto', () => {
    const after = { ...DEFAULT_SETTINGS, taskPrefix: 'FL', updatedBy: 'admin' };
    expect(describeAuditEntry(entry({ entityType: 'settings', entityId: 'workspace', actorId: 'admin', action: 'create', rev: 1, after }), ctx))
      .toEqual({ type: 'Ajustes', subject: 'Espacio de trabajo', sentences: ['Admin cambió el prefijo de las tareas a FL'] });
  });

  it('ajustes: logo, colores y nombre', () => {
    const before = { ...DEFAULT_SETTINGS, logo: 'data:image/png;base64,x' };
    const after = { ...before, logo: null, palette: ['#000000', ...DEFAULT_SETTINGS.palette.slice(1)], name: 'Ferretería' };
    expect(describeAuditEntry(entry({ entityType: 'settings', entityId: 'workspace', actorId: 'admin', before, after }), ctx).sentences)
      .toEqual(['Admin quitó el logo', 'Admin cambió el nombre del espacio a «Ferretería»', 'Admin cambió los colores']);
  });
});
