export const AVATAR_SIZE = 128;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;

/** Error con un mensaje listo para mostrar. */
export class AvatarImageError extends Error {}

/** El cuadrado más grande centrado dentro de la imagen. */
export function squareCrop(width: number, height: number): { sx: number; sy: number; size: number } {
  const size = Math.min(width, height);
  return { sx: Math.floor((width - size) / 2), sy: Math.floor((height - size) / 2), size };
}

/**
 * Recorta la imagen en cuadrado y la reduce a 128×128 JPEG (unos 10 KB) en el navegador.
 * Así la foto entra en el perfil de Firestore sin usar Firebase Storage (que exige el plan pago).
 */
export async function imageToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new AvatarImageError('Elige un archivo de imagen (JPG, PNG o WebP).');
  if (file.size > MAX_INPUT_BYTES) throw new AvatarImageError('La imagen pesa más de 5 MB. Elige una más liviana.');

  const bitmap = await createImageBitmap(file);
  const { sx, sy, size } = squareCrop(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new AvatarImageError('Tu navegador no pudo procesar la imagen.');
  context.drawImage(bitmap, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.8);
}
