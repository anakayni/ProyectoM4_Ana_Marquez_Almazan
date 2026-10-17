import { describe, expect, it } from 'vitest';
import { AvatarImageError, imageToAvatar, squareCrop } from '@/features/team/avatarImage';

describe('squareCrop', () => {
  it('horizontal: recorta los costados', () => {
    expect(squareCrop(400, 200)).toEqual({ sx: 100, sy: 0, size: 200 });
  });
  it('vertical: recorta arriba y abajo', () => {
    expect(squareCrop(300, 500)).toEqual({ sx: 0, sy: 100, size: 300 });
  });
  it('cuadrada: queda igual', () => {
    expect(squareCrop(128, 128)).toEqual({ sx: 0, sy: 0, size: 128 });
  });
});

describe('imageToAvatar', () => {
  it('rechaza archivos que no son imágenes', async () => {
    await expect(imageToAvatar(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).rejects.toBeInstanceOf(AvatarImageError);
  });
  it('rechaza imágenes de más de 5 MB', async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'a.jpg', { type: 'image/jpeg' });
    await expect(imageToAvatar(big)).rejects.toThrow('más de 5 MB');
  });
});
