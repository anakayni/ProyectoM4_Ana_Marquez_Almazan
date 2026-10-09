import type { Role } from '@/types/auth';

export type Action = 'task:create' | 'task:edit' | 'task:delete' | 'team:manage' | 'audit:read-all';

type Actor = { uid: string; role: Role } | null;

/**
 * Permisos para la UI (mostrar u ocultar acciones).
 * La seguridad real la imponen las reglas de Firestore: esta función debe coincidir con firestore.rules.
 */
export function can(actor: Actor, action: Action, ctx: { createdBy?: string } = {}): boolean {
  if (!actor) return false;
  const { role, uid } = actor;
  switch (action) {
    case 'task:create':
    case 'task:edit':
      return role === 'admin' || role === 'member';
    case 'task:delete':
      return role === 'admin' || (role === 'member' && ctx.createdBy === uid);
    case 'team:manage':
    case 'audit:read-all':
      return role === 'admin';
  }
}
