import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_AUDIT_FILTERS } from '@/features/audit/auditFilters';

vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: () => [
    { uid: 'leo', email: 'l@x.com', displayName: 'Leo', role: 'member', active: false, invitedBy: null, rev: 1 },
    { uid: 'ana', email: 'a@x.com', displayName: 'Ana', role: 'admin', active: true, invitedBy: null, rev: 1 },
  ],
}));

import { AuditFilters } from '@/components/settings/AuditFilters';

describe('AuditFilters', () => {
  it('cambia el tipo y la persona', async () => {
    const onChange = vi.fn();
    render(<AuditFilters value={EMPTY_AUDIT_FILTERS} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Proyectos');
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_AUDIT_FILTERS, entityType: 'project' });
    const people = screen.getByLabelText('Persona');
    expect([...people.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Todas', 'Ana', 'Leo (desactivada)', 'El sistema']);
    await userEvent.selectOptions(people, 'Ana');
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_AUDIT_FILTERS, actorId: 'ana' });
  });

  it('"Limpiar filtros" aparece solo con filtros y los vacía', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<AuditFilters value={EMPTY_AUDIT_FILTERS} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
    rerender(<AuditFilters value={{ ...EMPTY_AUDIT_FILTERS, from: '2026-10-01' }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onChange).toHaveBeenLastCalledWith(EMPTY_AUDIT_FILTERS);
  });
});
