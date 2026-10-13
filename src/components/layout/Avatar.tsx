import styles from './Avatar.module.css';

// eslint-disable-next-line react/only-export-components -- helper puro del avatar
export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/** `muted`: en blanco y negro (tareas terminadas), sin bajar el contraste de la inicial. */
type AvatarProps = { name: string; photo?: string | null; inactive?: boolean; muted?: boolean; size?: 'md' | 'lg' };

/** Foto o inicial. Decorativo: el nombre siempre está escrito al lado o en la etiqueta del botón. */
export function Avatar({ name, photo = null, inactive = false, muted = false, size = 'md' }: AvatarProps) {
  const classes = [styles.avatar, size === 'lg' ? styles.lg : '', inactive ? styles.inactive : '', muted ? styles.muted : ''].filter(Boolean).join(' ');
  return (
    <span className={classes} aria-hidden="true">
      {photo ? <img className={styles.photo} src={photo} alt="" /> : initial(name)}
    </span>
  );
}
