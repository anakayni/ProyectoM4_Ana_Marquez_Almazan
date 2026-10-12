import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/auth';

const mocks = vi.hoisted(() => ({ updateOwnProfile: vi.fn(), imageToAvatar: vi.fn() }));
vi.mock('@/services/team.service', () => ({ updateOwnProfile: mocks.updateOwnProfile }));
vi.mock('@/features/team/avatarImage', () => ({
  imageToAvatar: mocks.imageToAvatar,
  AvatarImageError: class AvatarImageError extends Error {},
}));

import { ProfileDialog } from '@/components/team/ProfileDialog';

const profile: UserProfile = {
  uid: 'ana', email: 'ana@x.com', displayName: 'Ana', role: 'admin', active: true, invitedBy: null, rev: 1,
  photo: 'data:image/jpeg;base64,AA',
};

describe('ProfileDialog', () => {
  beforeEach(() => {
    mocks.updateOwnProfile.mockReset();
    mocks.updateOwnProfile.mockResolvedValue(undefined);
    mocks.imageToAvatar.mockReset();
  });

  it('guarda el nombre y cierra', async () => {
    const onClose = vi.fn();
    render(<ProfileDialog profile={profile} onClose={onClose} />);
    await userEvent.clear(screen.getByLabelText('Nombre'));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Ana M.');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(mocks.updateOwnProfile).toHaveBeenCalledWith('ana', { displayName: 'Ana M.', photo: 'data:image/jpeg;base64,AA' });
    expect(onClose).toHaveBeenCalled();
  });

  it('quita la foto', async () => {
    render(<ProfileDialog profile={profile} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar foto' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(mocks.updateOwnProfile).toHaveBeenCalledWith('ana', { displayName: 'Ana', photo: null });
  });

  it('sube una foto nueva (achicada en el navegador)', async () => {
    mocks.imageToAvatar.mockResolvedValue('data:image/jpeg;base64,NUEVA');
    render(<ProfileDialog profile={{ ...profile, photo: null }} onClose={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText('Subir foto'), new File(['x'], 'yo.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(mocks.updateOwnProfile).toHaveBeenCalledWith('ana', { displayName: 'Ana', photo: 'data:image/jpeg;base64,NUEVA' });
  });

  it('no guarda un nombre vacío', async () => {
    render(<ProfileDialog profile={profile} onClose={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText('Nombre'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa tu nombre.');
    expect(mocks.updateOwnProfile).not.toHaveBeenCalled();
  });
});
