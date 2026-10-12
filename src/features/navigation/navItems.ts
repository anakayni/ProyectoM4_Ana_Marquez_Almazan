import { CalendarDays, FolderKanban, ListChecks, Settings, Users, type LucideIcon } from 'lucide-react';
import type { UserProfile } from '@/types/auth';

export type NavKey = 'tasks' | 'projects' | 'calendar' | 'team' | 'settings';

/** `to: null` = la sección todavía no existe para esta persona ("Próximamente"). */
export type NavItem = { key: NavKey; label: string; shortLabel: string; icon: LucideIcon; to: string | null };

/**
 * Secciones del menú. Para "encender" una sección en una etapa futura, se le pone su ruta acá.
 * Hoy ninguna depende del rol; el perfil queda como parámetro para Ajustes (etapa 8, solo admin).
 */
export function navItems(_profile: UserProfile): NavItem[] {
  return [
    { key: 'tasks', label: 'Mis tareas', shortLabel: 'Tareas', icon: ListChecks, to: '/tasks' },
    { key: 'projects', label: 'Proyectos', shortLabel: 'Proyectos', icon: FolderKanban, to: '/projects' },
    { key: 'calendar', label: 'Calendario', shortLabel: 'Calendario', icon: CalendarDays, to: null },
    { key: 'team', label: 'Equipo', shortLabel: 'Equipo', icon: Users, to: '/team' },
    { key: 'settings', label: 'Ajustes', shortLabel: 'Ajustes', icon: Settings, to: null },
  ];
}
