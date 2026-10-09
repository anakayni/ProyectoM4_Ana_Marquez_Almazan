import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TodoForm } from '@/components/tasks/TodoForm';

describe('TodoForm', () => {
  it('no envía si el título está vacío y muestra el error', async () => {
    const onSubmit = vi.fn();
    render(<TodoForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(screen.getByText('El título es obligatorio.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía título y descripción con prioridad media y sin fecha por defecto, y limpia el formulario', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TodoForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Llamar al proveedor');
    await userEvent.type(screen.getByLabelText('Descripción'), 'Pedir cotización');
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Llamar al proveedor',
      description: 'Pedir cotización',
      priority: 'media',
      dueDate: null,
      assigneeId: null,
    });
    expect(screen.getByLabelText('Título')).toHaveValue('');
  });

  it('envía la prioridad y la fecha de vencimiento elegidas', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TodoForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Pagar alquiler');
    await userEvent.selectOptions(screen.getByLabelText('Prioridad'), 'alta');
    await userEvent.type(screen.getByLabelText('Vence'), '2026-10-05');
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ priority: 'alta', dueDate: '2026-10-05' }));
  });

  it('en modo edición precarga valores y no se limpia', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <TodoForm
        initialValues={{ title: 'Original', description: '', priority: 'baja', dueDate: '2026-10-01', assigneeId: null }}
        submitLabel="Guardar cambios"
        onSubmit={onSubmit}
      />,
    );
    const title = screen.getByLabelText('Título');
    expect(title).toHaveValue('Original');
    expect(screen.getByLabelText('Prioridad')).toHaveValue('baja');
    expect(screen.getByLabelText('Vence')).toHaveValue('2026-10-01');
    await userEvent.clear(title);
    await userEvent.type(title, 'Editada');
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Editada', description: '', priority: 'baja', dueDate: '2026-10-01', assigneeId: null });
    expect(title).toHaveValue('Editada');
  });

  it('muestra un error y conserva lo escrito si falla el guardado', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSubmit = vi.fn().mockRejectedValue(new Error('offline'));
    render(<TodoForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Tarea');
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar la tarea');
    expect(screen.getByLabelText('Título')).toHaveValue('Tarea');
  });
});
