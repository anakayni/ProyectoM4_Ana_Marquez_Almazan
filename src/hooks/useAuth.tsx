import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { resolveAccess } from '@/features/auth/resolveAccess';
import * as authService from '@/services/auth.service';
import { claimInvitation, NoInvitationError, subscribeToProfile } from '@/services/team.service';
import type { AuthContextValue, AuthUser, UserProfile } from '@/types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  // undefined = todavía no llegó el perfil; null = no existe
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [claimFailed, setClaimFailed] = useState(false);
  const claimTried = useRef<string | null>(null);

  useEffect(() => {
    // Devuelve la función de desuscripción: React la llama al desmontar.
    return authService.subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setProfile(undefined);
      setClaimFailed(false);
      setAuthReady(true);
    });
  }, []);

  const uid = user?.uid;
  const verified = user?.emailVerified ?? false;

  // Perfil en tiempo real (solo con email verificado). Si no existe, se reclama la invitación una vez.
  useEffect(() => {
    if (!uid || !verified || !user) return;
    const currentUser = user;
    return subscribeToProfile(
      uid,
      (next) => {
        setProfile(next);
        if (next !== null || claimTried.current === uid) return;
        claimTried.current = uid;
        claimInvitation(currentUser).catch((err: unknown) => {
          if (!(err instanceof NoInvitationError)) console.error('Error al reclamar la invitación:', err);
          setClaimFailed(true);
        });
      },
      (err) => {
        console.error('Error al leer el perfil:', err);
        setProfile(null);
        setClaimFailed(true);
      },
    );
    // `user` cambia de referencia con cada evento de auth; alcanza con uid y verified.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, verified]);

  const access = resolveAccess({ authReady, user, profile, claimFailed });

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile: profile ?? null,
      access,
      loading: access === 'loading',
      login: authService.loginWithEmail,
      loginWithGoogle: authService.loginWithGoogle,
      register: async (input) => {
        setUser(await authService.registerWithEmail(input));
      },
      logout: authService.logout,
      resendVerification: authService.resendVerification,
      refreshVerification: async () => {
        const next = await authService.reloadUser();
        setUser(next);
        return next?.emailVerified ?? false;
      },
    }),
    [user, profile, access],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

// eslint-disable-next-line react/only-export-components -- el hook y su provider viven juntos a propósito
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
