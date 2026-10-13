import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_AUDIT_FILTERS } from '@/features/audit/auditFilters';
import type { AuditEntry } from '@/types/audit';

const svc = vi.hoisted(() => ({ fetchAuditPage: vi.fn() }));
vi.mock('@/services/audit.service', () => ({ fetchAuditPage: svc.fetchAuditPage }));

import { useAuditLog } from '@/hooks/useAuditLog';

const e = (rev: number): AuditEntry => ({
  entityType: 'task', entityId: 't', rev, action: 'update', actorId: 'ana', at: rev, before: null, after: null,
});

describe('useAuditLog', () => {
  beforeEach(() => {
    svc.fetchAuditPage.mockReset();
  });

  it('carga la primera página y agrega la siguiente con "Cargar más"', async () => {
    svc.fetchAuditPage
      .mockResolvedValueOnce({ entries: [e(3), e(2)], cursor: 'c1', hasMore: true })
      .mockResolvedValueOnce({ entries: [e(1)], cursor: 'c2', hasMore: false });
    const { result } = renderHook(() => useAuditLog(EMPTY_AUDIT_FILTERS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((x) => x.rev)).toEqual([3, 2]);
    expect(result.current.hasMore).toBe(true);

    await act(() => result.current.loadMore());
    expect(svc.fetchAuditPage).toHaveBeenLastCalledWith(EMPTY_AUDIT_FILTERS, 'c1');
    expect(result.current.entries.map((x) => x.rev)).toEqual([3, 2, 1]);
    expect(result.current.hasMore).toBe(false);
  });

  it('si falla, muestra un mensaje', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    svc.fetchAuditPage.mockRejectedValueOnce(new Error('index'));
    const { result } = renderHook(() => useAuditLog(EMPTY_AUDIT_FILTERS));
    await waitFor(() => expect(result.current.error).toBe('No pudimos cargar la auditoría.'));
  });
});
