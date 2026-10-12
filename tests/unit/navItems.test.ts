import { describe, expect, it } from 'vitest';
import { navItems } from '@/features/navigation/navItems';
import type { Role, UserProfile } from '@/types/auth';

const profile = (role: Role): UserProfile => ({
  uid: 'u', email: 'u@x.com', displayName: 'U', role, active: true, invitedBy: 'a', rev: 1,
});
const find = (role: Role, key: string) => navItems(profile(role)).find((i) => i.key === key)!;

describe('navItems', () => {
  it('lista las 5 secciones en orden', () => {
    expect(navItems(profile('admin')).map((i) => i.label)).toEqual([
      'Mis tareas', 'Proyectos', 'Calendario', 'Equipo', 'Ajustes',
    ]);
  });

  it.each(['admin', 'member', 'viewer'] as const)('Mis tareas está disponible para %s', (role) => {
    expect(find(role, 'tasks').to).toBe('/tasks');
  });

  it.each(['admin', 'member', 'viewer'] as const)('Equipo está disponible para %s', (role) => {
    expect(find(role, 'team').to).toBe('/team');
  });

  it.each(['admin', 'member', 'viewer'] as const)('Proyectos está disponible para %s', (role) => {
    expect(find(role, 'projects').to).toBe('/projects');
  });

  it.each(['calendar', 'settings'])('%s es "Próximamente" para todos', (key) => {
    expect(find('admin', key).to).toBeNull();
  });

  it('cada sección tiene ícono y etiqueta corta', () => {
    for (const item of navItems(profile('viewer'))) {
      expect(item.icon).toBeTruthy();
      expect(item.shortLabel.length).toBeGreaterThan(0);
    }
  });
});
