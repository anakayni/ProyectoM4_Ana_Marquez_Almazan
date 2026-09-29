import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import type { AppUser, RegisterInput } from '@/types/auth';
import { auth, googleProvider } from './firebase';

function toAppUser(user: User): AppUser {
  return { uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? '' };
}

export async function registerWithEmail({ name, email, password }: RegisterInput): Promise<AppUser> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  // onAuthStateChanged se dispara antes de updateProfile, por eso devolvemos el nombre acá.
  return { ...toAppUser(credential.user), displayName: name.trim() };
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

export function subscribeToAuth(callback: (user: AppUser | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => callback(user ? toAppUser(user) : null));
}

export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay una sesión activa.');
  return user.getIdToken();
}
