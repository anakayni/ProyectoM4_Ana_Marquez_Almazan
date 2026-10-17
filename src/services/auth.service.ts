import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import type { AuthUser, RegisterInput } from '@/types/auth';
import { auth, googleProvider } from './firebase';

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    emailVerified: user.emailVerified,
  };
}

/**
 * Crea la cuenta y envía el email de verificación de Firebase (gratis, no usa SES).
 * Sin email verificado no se puede reclamar una invitación.
 */
export async function registerWithEmail({ name, email, password }: RegisterInput): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  await sendEmailVerification(credential.user);
  // onAuthStateChanged se dispara antes de updateProfile, por eso devolvemos el nombre acá.
  return { ...toAuthUser(credential.user), displayName: name.trim() };
}

export async function loginWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function loginWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export function logout(): Promise<void> {
  return signOut(auth);
}

export function subscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => callback(user ? toAuthUser(user) : null));
}

export async function resendVerification(): Promise<void> {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}

/** Recarga el usuario y renueva el token: así las reglas ven email_verified = true. */
export async function reloadUser(): Promise<AuthUser | null> {
  const user = auth.currentUser;
  if (!user) return null;
  await user.reload();
  await user.getIdToken(true);
  return toAuthUser(user);
}

export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay una sesión activa.');
  return user.getIdToken();
}
