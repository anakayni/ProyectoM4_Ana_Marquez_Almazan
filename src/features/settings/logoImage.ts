import { AvatarImageError } from '@/features/team/avatarImage';

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const LOGO_MAX_WIDTH = 240;
export const LOGO_MAX_HEIGHT = 64;

/** Tamaño que entra en el máximo sin deformar ni agrandar. */
export function fitWithin(width: number, height: number, maxW: number, maxH: number): { width: number; height: number } {
  const scale = Math.min(1, maxW / width, maxH / height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Logo como PNG (conserva la transparencia), achicado en el navegador para guardarlo en Firestore. */
export async function imageToLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    throw new AvatarImageError('Elige una imagen PNG, JPG o WebP.');
  }
  if (file.size > MAX_INPUT_BYTES) throw new AvatarImageError('La imagen pesa más de 5 MB. Elige una más liviana.');
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new AvatarImageError('Tu navegador no pudo procesar la imagen.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL('image/png');
}
