import type { Role } from '@/types/auth';

export type Action =
  | 'task:create' | 'task:edit' | 'task:delete'
  | 'project:create' | 'project:edit' | 'project:people'
  | 'team:view' | 'team:manage' | 'audit:read-all';

type Actor = { uid: string; role: Role } | null;

/**
 * Permisos para la UI (mostrar u ocultar acciones).
 * La seguridad real la imponen las reglas de Firestore: esta función debe coincidir con firestore.rules.
 * El Invitado trabaja con tareas solo en sus proyectos: eso lo garantizan las reglas y las listas que ve.
 */
export function can(actor: Actor, action: Action, ctx: { createdBy?: string } = {}): boolean {
  if (!actor) return false;
  const { role, uid } = actor;
  switch (action) {
    case 'task:create':
    case 'task:edit':
      return role === 'admin' || role === 'member' || role === 'guest';
    case 'task:delete':
      return role === 'admin' || ((role === 'member' || role === 'guest') && ctx.createdBy === uid);
    case 'project:create':
    case 'project:edit':
      return role === 'admin' || role === 'member';
    case 'team:view':
      return role !== 'guest';
    case 'project:people':
    case 'team:manage':
    case 'audit:read-all':
      return role === 'admin';
  }
}

/** Invitado y Lector nunca ven tareas hechas (las reglas tampoco se las dejan leer). */
export function seesDoneTasks(role: Role): boolean {
  return role === 'admin' || role === 'member';
}
