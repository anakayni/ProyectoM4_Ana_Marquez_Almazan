export type Role = 'admin' | 'member' | 'viewer';

export const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador', member: 'Miembro', viewer: 'Lector' };

/** Usuario de Firebase Auth (la sesión). */
export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

/** Perfil del equipo en Firestore (users/{uid}). */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  active: boolean;
  invitedBy: string | null;
  rev: number;
}

/** Qué puede ver la persona según su sesión, su email y su perfil. */
export type Access = 'loading' | 'signed-out' | 'unverified' | 'no-invitation' | 'inactive' | 'active';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterFormValues extends RegisterInput {
  confirmPassword: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  /** Perfil del equipo; null si todavía no existe o no se sabe */
  profile: UserProfile | null;
  access: Access;
  /** @deprecated Temporal hasta que las rutas usen `access` (etapa 1, tarea 6) */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  resendVerification: () => Promise<void>;
  /** Recarga el usuario para detectar si ya confirmó el email. Devuelve si está verificado. */
  refreshVerification: () => Promise<boolean>;
}
