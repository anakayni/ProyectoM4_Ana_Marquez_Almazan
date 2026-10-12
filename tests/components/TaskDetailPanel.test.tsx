import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/tasks/TaskHistory', () => ({ TaskHistory: () => <ol><li>Ana creó la tarea</li></ol> }));

import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import type { Task } from '@/types/task';

const task: Task = {
  id: 't', createdBy: 'luis', updatedBy: 'ana', rev: 3, title: 'Revisar factura', description: 'Del proveedor',
  status: 'doing', assigneeId: 'ana', completedBy: null, completedAt: null, projectId: null, number: 108,
  subtasks: [{ id: 's1', title: 'Validar', done: true }, { id: 's2', title: 'Probar', done: false }],
  priority: 'alta', dueDate: '2026-10-20', createdAt: new Date(2026, 9, 3).getTime(),
};
const names: Record<string, string> = { ana: 'Ana', luis: 'Luis' };
const nameOf = (uid: string | null) => (uid ? names[uid] ?? null : null);
const closeButton = () => screen.getAllByRole('button', { name: 'Cerrar' })[0];

function setup(perms = { canEdit: true, canDelete: true }) {
  const handlers = { onClose: vi.fn(), onSave: vi.fn().mockResolvedValue(undefined), onDelete: vi.fn() };
  render(
    <TaskDetailPanel
      task={task} nameOf={nameOf} projectOf={() => null}
      assignees={[{ uid: 'ana', label: 'Ana' }, { uid: 'luis', label: 'Luis' }]} projects={[]}
      {...perms} {...handlers}
    />,
  );
  return handlers;
}

describe('TaskDetailPanel', () => {
  it('muestra número, datos, subtareas con su avance e historial', () => {
    setup();
    expect(screen.getByText('MC-108')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Revisar factura');
    expect(screen.getByLabelText('Estado')).toHaveValue('doing');
    expect(screen.getByText(/Subtareas \(1 de 2\)/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Validar' })).toBeChecked();
    expect(screen.getByText('Ana creó la tarea')).toBeInTheDocument();
  });

  it('guarda solo lo que cambió, en una sola escritura', async () => {
    const { onSave } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'done');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Probar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith({
      status: 'done',
      subtasks: [{ id: 's1', title: 'Validar', done: true }, { id: 's2', title: 'Probar', done: true }],
    });
  });

  it('agrega y quita subtareas', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText('Nueva subtarea'), 'Enviar informe{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Quitar la subtarea «Validar»' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    const saved = onSave.mock.calls[0][0].subtasks.map((s: { title: string }) => s.title);
    expect(saved).toEqual(['Probar', 'Enviar informe']);
  });

  it('pregunta antes de descartar cambios', async () => {
    const { onClose } = setup();
    await userEvent.clear(screen.getByLabelText('Título'));
    await userEvent.type(screen.getByLabelText('Título'), 'Otro título');
    await userEvent.click(closeButton());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('¿Descartar los cambios?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('sin cambios cierra directo', async () => {
    const { onClose } = setup();
    await userEvent.click(closeButton());
    expect(onClose).toHaveBeenCalled();
  });

  it('no guarda un título vacío', async () => {
    const { onSave } = setup();
    await userEvent.clear(screen.getByLabelText('Título'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('eliminar pide confirmación', async () => {
    const { onDelete } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Confirmar eliminación' })).getByRole('button', { name: 'Sí, eliminar' }));
    expect(onDelete).toHaveBeenCalledWith('t');
  });

  it('un lector ve todo deshabilitado y sin botones de guardar ni eliminar', () => {
    setup({ canEdit: false, canDelete: false });
    expect(screen.getByLabelText('Título')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Validar' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });
});
