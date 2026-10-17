import type { Access, AuthUser, UserProfile } from '@/types/auth';

type Input = {
  /** Firebase ya respondió si había una sesión guardada */
  authReady: boolean;
  user: AuthUser | null;
  /** undefined = todavía no llegó; null = no existe */
  profile: UserProfile | null | undefined;
  /** Se intentó reclamar una invitación y no había ninguna pendiente */
  claimFailed: boolean;
};

/** Decide qué puede ver la persona a partir de su sesión, su email y su perfil. */
export function resolveAccess({ authReady, user, profile, claimFailed }: Input): Access {
  if (!authReady) return 'loading';
  if (!user) return 'signed-out';
  if (!user.emailVerified) return 'unverified';
  if (profile === undefined) return 'loading';
  if (profile === null) return claimFailed ? 'no-invitation' : 'loading';
  return profile.active ? 'active' : 'inactive';
}
