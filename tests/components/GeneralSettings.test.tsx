import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const svc = vi.hoisted(() => ({ saveWorkspaceSettings: vi.fn() }));
vi.mock('@/services/settings.service', () => ({ saveWorkspaceSettings: svc.saveWorkspaceSettings, subscribeToSettings: () => () => {} }));

import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { DEFAULT_SETTINGS } from '@/features/settings/defaults';

describe('GeneralSettings', () => {
  beforeEach(() => {
    svc.saveWorkspaceSettings.mockReset();
    svc.saveWorkspaceSettings.mockResolvedValue(undefined);
  });

  it('guarda nombre y prefijo', async () => {
    render(<GeneralSettings actorId="admin" />);
    await userEvent.clear(screen.getByLabelText('Nombre del espacio'));
    await userEvent.type(screen.getByLabelText('Nombre del espacio'), 'Ferretería López');
    await userEvent.clear(screen.getByLabelText('Prefijo de las tareas'));
    await userEvent.type(screen.getByLabelText('Prefijo de las tareas'), 'fl');
    expect(screen.getByText('Ejemplo: FL-12')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(svc.saveWorkspaceSettings).toHaveBeenCalledWith('admin', { ...DEFAULT_SETTINGS, name: 'Ferretería López', taskPrefix: 'FL' });
  });

  it('bloquea guardar si un color no tiene contraste, y restaura la paleta', async () => {
    render(<GeneralSettings actorId="admin" />);
    fireEvent.change(screen.getByLabelText('Color 1'), { target: { value: '#f5e663' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Texto blanco sobre el color 1');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Restaurar paleta original' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cada bloque explica para qué sirve', () => {
    render(<GeneralSettings actorId="admin" />);
    expect(screen.getByRole('heading', { name: 'Identidad' })).toBeInTheDocument();
    expect(screen.getByText('Se ve en el menú y en el login.')).toBeInTheDocument();
    expect(screen.getByText('Se controla el contraste antes de guardar.')).toBeInTheDocument();
    expect(screen.getByText('Cómo se numeran las tareas.')).toBeInTheDocument();
  });
});
