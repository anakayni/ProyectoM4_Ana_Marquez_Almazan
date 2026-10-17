import { describe, expect, it } from 'vitest';
import { fitWithin, imageToLogo } from '@/features/settings/logoImage';
import { AvatarImageError } from '@/features/team/avatarImage';

describe('fitWithin', () => {
  it('reduce sin deformar', () => {
    expect(fitWithin(1200, 400, 240, 64)).toEqual({ width: 192, height: 64 });
    expect(fitWithin(1000, 100, 240, 64)).toEqual({ width: 240, height: 24 });
  });
  it('no agranda imágenes chicas', () => {
    expect(fitWithin(100, 30, 240, 64)).toEqual({ width: 100, height: 30 });
  });
});

describe('imageToLogo', () => {
  it('rechaza lo que no es imagen', async () => {
    await expect(imageToLogo(new File(['x'], 'a.txt', { type: 'text/plain' }))).rejects.toBeInstanceOf(AvatarImageError);
  });
});
