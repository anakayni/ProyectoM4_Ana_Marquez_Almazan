import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceSettings } from '@/features/settings/defaults';

const svc = vi.hoisted(() => ({ emit: (() => {}) as (s: WorkspaceSettings) => void }));
vi.mock('@/services/settings.service', () => ({
  subscribeToSettings: (onData: (s: WorkspaceSettings) => void) => {
    svc.emit = onData;
    return () => {};
  },
}));

import { BrandMark } from '@/components/layout/BrandMark';
import { applyPalette, useTaskNumberFormat, WorkspaceSettingsProvider } from '@/hooks/useWorkspaceSettings';

function Number12() {
  return <span>{useTaskNumberFormat()(12)}</span>;
}

describe('ajustes del espacio en la app', () => {
  it('applyPalette escribe las 5 variables', () => {
    const root = document.createElement('div');
    applyPalette(['#111111', '#222222', '#333333', '#444444', '#555555'], root);
    expect(root.style.getPropertyValue('--brand-1')).toBe('#111111');
    expect(root.style.getPropertyValue('--brand-5')).toBe('#555555');
  });

  it('sin ajustes guardados usa nombre, logo y prefijo por defecto', () => {
    render(<WorkspaceSettingsProvider><BrandMark /><Number12 /></WorkspaceSettingsProvider>);
    expect(screen.getByText('MateCode Tasks')).toBeInTheDocument();
    expect(screen.getByText('MC-12')).toBeInTheDocument();
  });

  it('con ajustes muestra logo, nombre y prefijo, y aplica la paleta', () => {
    render(<WorkspaceSettingsProvider><BrandMark /><Number12 /></WorkspaceSettingsProvider>);
    act(() => svc.emit({ name: 'Ferretería López', logo: 'data:image/png;base64,AA', palette: ['#111111', '#222222', '#333333', '#444444', '#555555'], taskPrefix: 'FL' }));
    expect(screen.getByRole('img', { name: 'Ferretería López' })).toHaveAttribute('src', 'data:image/png;base64,AA');
    expect(screen.getByText('FL-12')).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue('--brand-1')).toBe('#111111');
  });
});
