import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Avatar } from '@/components/layout/Avatar';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { AvatarImageError, imageToAvatar } from '@/features/team/avatarImage';
import { updateOwnProfile } from '@/services/team.service';
import { ROLE_LABEL, type UserProfile } from '@/types/auth';
import styles from './ProfileDialog.module.css';

/** Foto y nombre de la persona que usa la app (el rol y el email no se cambian acá). */
export function ProfileDialog({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const [name, setName] = useState(profile.displayName);
  const [photo, setPhoto] = useState<string | null>(profile.photo ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    setError(null);
    try {
      setPhoto(await imageToAvatar(file));
    } catch (err) {
      if (!(err instanceof AvatarImageError)) console.error('Error al procesar la foto:', err);
      setError(err instanceof AvatarImageError ? err.message : 'No pudimos leer la imagen. Prueba con otra.');
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const displayName = name.trim();
    if (!displayName) {
      setError('Ingresa tu nombre.');
      return;
    }
    setSaving(true);
    try {
      await updateOwnProfile(profile.uid, { displayName, photo });
      onClose();
    } catch (err) {
      console.error('Error al guardar el perfil:', err);
      setError('No pudimos guardar tu perfil. Inténtalo de nuevo.');
      setSaving(false);
    }
  }

  return (
    <Modal title="Mi perfil" onClose={onClose}>
      <form className={styles.form} onSubmit={save} noValidate>
        {error && <Alert kind="error">{error}</Alert>}
        <div className={styles.photoRow}>
          <Avatar name={name} photo={photo} size="lg" />
          <div className={styles.photoActions}>
            <label className={styles.upload}>
              Subir foto
              <input type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={(e) => void pickPhoto(e)} />
            </label>
            {photo && <Button size="sm" variant="ghost" onClick={() => setPhoto(null)}>Quitar foto</Button>}
          </div>
        </div>
        <Field id="profile-name" label="Nombre">
          <input id="profile-name" className={fieldInputClass} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </Field>
        <p className={styles.meta}>{profile.email} · {ROLE_LABEL[profile.role]}</p>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
