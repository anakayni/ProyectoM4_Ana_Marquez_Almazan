import styles from './Avatar.module.css';

// eslint-disable-next-line react/only-export-components -- helper puro del avatar
export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

type AvatarProps = { name: string; photo?: string | null; inactive?: boolean; size?: 'md' | 'lg' };

/** Foto o inicial. Decorativo: el nombre siempre está escrito al lado o en la etiqueta del botón. */
export function Avatar({ name, photo = null, inactive = false, size = 'md' }: AvatarProps) {
  const classes = [styles.avatar, size === 'lg' ? styles.lg : '', inactive ? styles.inactive : ''].filter(Boolean).join(' ');
  return (
    <span className={classes} aria-hidden="true">
      {photo ? <img className={styles.photo} src={photo} alt="" /> : initial(name)}
    </span>
  );
}
