const INVALID_CREDENTIALS = 'Email o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': INVALID_CREDENTIALS,
  'auth/wrong-password': INVALID_CREDENTIALS,
  'auth/user-not-found': INVALID_CREDENTIALS,
  'auth/invalid-email': 'El email no tiene un formato válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con este email. Inicia sesión o usa otro email.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada. Contacta al administrador.',
  'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar. Inténtalo de nuevo.',
  'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes e inténtalo de nuevo.',
  'auth/account-exists-with-different-credential':
    'Ya existe una cuenta con este email usando otro método. Inicia sesión con email y contraseña.',
};

export const DEFAULT_AUTH_ERROR = 'Ocurrió un error inesperado. Inténtalo de nuevo.';

function getErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String(error.code);
  }
  return '';
}

/** Traduce un error de Firebase Auth a un mensaje claro para el usuario. */
export function mapAuthError(error: unknown): string {
  return MESSAGES[getErrorCode(error)] ?? DEFAULT_AUTH_ERROR;
}
