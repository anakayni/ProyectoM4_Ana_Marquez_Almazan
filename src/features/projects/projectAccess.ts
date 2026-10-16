import { can } from '@/features/auth/permissions';
import type { Role } from '@/types/auth';
import type { GuestAccess, Project } from '@/types/project';

export const ACCESS_LABEL: Record<GuestAccess, string> = { view: 'Solo ver', edit: 'Puede editar' };

/** Acceso de un Invitado en el proyecto: sin entrada = "Puede editar" (los agregados antes no pierden permisos). */
export function guestAccessOf(project: Pick<Project, 'memberIds' | 'guestAccess'>, uid: string): GuestAccess | null {
  if (!(project.memberIds ?? []).includes(uid)) return null;
  return project.guestAccess?.[uid] ?? 'edit';
}

/** Si alguien puede crear, editar o cambiar el estado de tareas en ese proyecto. */
export function canEditInProject(role: Role, uid: string, project: Project | null): boolean {
  if (role !== 'guest') return can({ uid, role }, 'task:edit');
  return project !== null && guestAccessOf(project, uid) === 'edit';
}
