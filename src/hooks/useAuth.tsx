import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authService from '@/services/auth.service';
import type { AppUser, AuthContextValue } from '@/types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Devuelve la función de desuscripción: React la llama al desmontar.
    return authService.subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: authService.loginWithEmail,
      loginWithGoogle: authService.loginWithGoogle,
      register: async (input) => {
        setUser(await authService.registerWithEmail(input));
      },
      logout: authService.logout,
    }),
    [user, loading],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

// eslint-disable-next-line react/only-export-components -- el hook y su provider viven juntos a propósito
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
