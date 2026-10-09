import { CalendarDays, FolderKanban, ListChecks, Settings, Users, type LucideIcon } from 'lucide-react';
import { can } from '@/features/auth/permissions';
import type { UserProfile } from '@/types/auth';

export type NavKey = 'tasks' | 'projects' | 'calendar' | 'team' | 'settings';

/** `to: null` = la sección todavía no existe para esta persona ("Próximamente"). */
export type NavItem = { key: NavKey; label: string; shortLabel: string; icon: LucideIcon; to: string | null };

/** Secciones del menú. Para "encender" una sección en una etapa futura, se le pone su ruta acá. */
export function navItems(profile: UserProfile): NavItem[] {
  return [
    { key: 'tasks', label: 'Mis tareas', shortLabel: 'Tareas', icon: ListChecks, to: '/tasks' },
    { key: 'projects', label: 'Proyectos', shortLabel: 'Proyectos', icon: FolderKanban, to: null },
    { key: 'calendar', label: 'Calendario', shortLabel: 'Calendario', icon: CalendarDays, to: null },
    { key: 'team', label: 'Equipo', shortLabel: 'Equipo', icon: Users, to: can(profile, 'team:manage') ? '/team' : null },
    { key: 'settings', label: 'Ajustes', shortLabel: 'Ajustes', icon: Settings, to: null },
  ];
}
