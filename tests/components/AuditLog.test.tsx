import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_AUDIT_FILTERS } from '@/features/audit/auditFilters';
import type { AuditEntry } from '@/types/audit';

const svc = vi.hoisted(() => ({ fetchAuditPage: vi.fn(), fetchAllAudit: vi.fn(), downloadTextFile: vi.fn() }));
vi.mock('@/services/audit.service', () => ({ fetchAuditPage: svc.fetchAuditPage, fetchAllAudit: svc.fetchAllAudit }));
vi.mock('@/utils/download', () => ({ downloadTextFile: svc.downloadTextFile }));
vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: () => [{ uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'admin', active: true, invitedBy: null, rev: 1 }],
}));
vi.mock('@/hooks/useProjects', () => ({ useProjects: () => ({ projects: [], loading: false, error: null }) }));

import { AuditLog } from '@/components/settings/AuditLog';

const statusChange: AuditEntry = {
  entityType: 'task', entityId: 't1', rev: 2, action: 'update', actorId: 'ana', at: new Date(2026, 9, 13, 9, 5).getTime(),
  before: { number: 4, title: 'Luz', status: 'todo' }, after: { number: 4, title: 'Luz', status: 'done' },
};
const created: AuditEntry = { ...statusChange, rev: 1, action: 'create', before: null, after: { number: 4, title: 'Luz', status: 'todo' } };

describe('AuditLog', () => {
  beforeEach(() => {
    svc.fetchAuditPage.mockReset();
    svc.fetchAllAudit.mockReset();
    svc.downloadTextFile.mockReset();
  });

  it('muestra los cambios en frases y "Cargar más" trae la siguiente página', async () => {
    svc.fetchAuditPage
      .mockResolvedValueOnce({ entries: [statusChange], cursor: 'c1', hasMore: true })
      .mockResolvedValueOnce({ entries: [created], cursor: 'c2', hasMore: false });
    render(<AuditLog filters={EMPTY_AUDIT_FILTERS} />);
    expect(await screen.findByRole('button', { name: /Ana cambió el estado de Pendiente a Hecha/ })).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 cambio')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByRole('button', { name: /Ana creó la tarea/ })).toBeInTheDocument();
    expect(svc.fetchAuditPage).toHaveBeenLastCalledWith(EMPTY_AUDIT_FILTERS, 'c1');
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
  });

  it('sin resultados lo dice', async () => {
    svc.fetchAuditPage.mockResolvedValueOnce({ entries: [], cursor: null, hasMore: false });
    render(<AuditLog filters={EMPTY_AUDIT_FILTERS} />);
    expect(await screen.findByText('No hay cambios con estos filtros.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  });

  it('el detalle muestra antes y después', async () => {
    svc.fetchAuditPage.mockResolvedValueOnce({ entries: [statusChange], cursor: 'c1', hasMore: false });
    render(<AuditLog filters={EMPTY_AUDIT_FILTERS} />);
    await userEvent.click(await screen.findByRole('button', { name: /Ana cambió el estado/ }));
    const dialog = screen.getByRole('dialog', { name: 'Detalle del cambio' });
    const row = within(dialog).getByRole('row', { name: /Estado/ });
    expect(within(row).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Pendiente', 'Hecha']);
  });

  it('exporta todo lo filtrado a CSV', async () => {
    svc.fetchAuditPage.mockResolvedValueOnce({ entries: [statusChange], cursor: 'c1', hasMore: true });
    svc.fetchAllAudit.mockResolvedValueOnce({ entries: [statusChange, created], truncated: false });
    render(<AuditLog filters={EMPTY_AUDIT_FILTERS} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));
    expect(svc.fetchAllAudit).toHaveBeenCalledWith(EMPTY_AUDIT_FILTERS);
    const [filename, text] = svc.downloadTextFile.mock.calls[0];
    expect(filename).toMatch(/^auditoria-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(text).toContain('"Ana creó la tarea"');
    expect(await screen.findByText('Se exportaron 2 cambios.')).toBeInTheDocument();
  });
});
