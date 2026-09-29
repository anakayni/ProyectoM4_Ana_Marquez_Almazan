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

  it('envía título y descripción y limpia el formulario', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TodoForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Llamar al proveedor');
    await userEvent.type(screen.getByLabelText('Descripción'), 'Pedir cotización');
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Llamar al proveedor', description: 'Pedir cotización' });
    expect(screen.getByLabelText('Título')).toHaveValue('');
  });

  it('en modo edición precarga valores y no se limpia', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TodoForm initialValues={{ title: 'Original', description: '' }} submitLabel="Guardar cambios" onSubmit={onSubmit} />);
    const title = screen.getByLabelText('Título');
    expect(title).toHaveValue('Original');
    await userEvent.clear(title);
    await userEvent.type(title, 'Editada');
    await userEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Editada', description: '' });
    expect(title).toHaveValue('Editada');
  });

  it('muestra un error y conserva lo escrito si falla el guardado', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('offline'));
    render(<TodoForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Tarea');
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar la tarea');
    expect(screen.getByLabelText('Título')).toHaveValue('Tarea');
  });
});
