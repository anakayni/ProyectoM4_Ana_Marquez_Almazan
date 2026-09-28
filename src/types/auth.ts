export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterFormValues extends RegisterInput {
  confirmPassword: string;
}

export interface AuthContextValue {
  user: AppUser | null;
  /** true mientras Firebase resuelve si ya había una sesión */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}
