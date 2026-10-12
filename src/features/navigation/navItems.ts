import { CalendarDays, FolderKanban, ListChecks, Settings, Users, type LucideIcon } from 'lucide-react';
import { can } from '@/features/auth/permissions';
import type { UserProfile } from '@/types/auth';

export type NavKey = 'tasks' | 'projects' | 'calendar' | 'team' | 'settings';

/** `to: null` = la sección todavía no existe para esta persona ("Próximamente"). */
export type NavItem = { key: NavKey; label: string; shortLabel: string; icon: LucideIcon; to: string | null };

/**
 * Secciones del menú. Para "encender" una sección en una etapa futura, se le pone su ruta acá.
 * Ajustes es solo para el admin: a las demás personas ni siquiera se les muestra.
 */
export function navItems(profile: UserProfile): NavItem[] {
  const items: NavItem[] = [
    { key: 'tasks', label: 'Mis tareas', shortLabel: 'Tareas', icon: ListChecks, to: '/tasks' },
    { key: 'projects', label: 'Proyectos', shortLabel: 'Proyectos', icon: FolderKanban, to: '/projects' },
    { key: 'calendar', label: 'Calendario', shortLabel: 'Calendario', icon: CalendarDays, to: '/calendar' },
    { key: 'team', label: 'Equipo', shortLabel: 'Equipo', icon: Users, to: '/team' },
    { key: 'settings', label: 'Ajustes', shortLabel: 'Ajustes', icon: Settings, to: '/settings' },
  ];
  return items.filter((item) => item.key !== 'settings' || can(profile, 'team:manage'));
}
