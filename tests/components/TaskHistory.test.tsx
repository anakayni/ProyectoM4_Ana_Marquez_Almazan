import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AuditEntry } from '@/types/audit';

const history = vi.hoisted(() => ({ entries: [] as AuditEntry[], loading: false, error: null as string | null }));
vi.mock('@/hooks/useTaskHistory', () => ({ useTaskHistory: () => history }));

import { TaskHistory } from '@/components/tasks/TaskHistory';

const nameOf = (uid: string | null) => (uid === 'ana' ? 'Ana' : null);

describe('TaskHistory', () => {
  it('muestra las frases, la más nueva primero', () => {
    history.entries = [
      { entityType: 'task', entityId: 't', rev: 2, action: 'update', actorId: 'ana', at: Date.now(), before: { status: 'todo' }, after: { status: 'doing' } },
      { entityType: 'task', entityId: 't', rev: 1, action: 'create', actorId: 'ana', at: Date.now() - 1000, before: null, after: { status: 'todo' } },
    ];
    render(<TaskHistory taskId="t" nameOf={nameOf} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Ana cambió el estado de Pendiente a En curso');
    expect(items[1]).toHaveTextContent('Ana creó la tarea');
  });

  it('avisa si no se pudo cargar', () => {
    history.entries = [];
    history.error = 'No pudimos cargar el historial.';
    render(<TaskHistory taskId="t" nameOf={nameOf} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar el historial.');
  });
});
