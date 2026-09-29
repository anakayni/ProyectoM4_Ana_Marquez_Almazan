import { useState } from 'react';
import { mapAuthError } from '@/features/auth/mapAuthError';

/**
 * Ejecuta una acción de auth (login, registro, Google) manejando
 * el estado "enviando" y traduciendo el error a un mensaje para el usuario.
 * Lo comparten LoginPage y RegisterPage.
 */
export function useAuthAction() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function run(action: () => Promise<void>) {
    setError(null);
    setSubmitting(true);
    try {
      await action();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return { error, submitting, run };
}
