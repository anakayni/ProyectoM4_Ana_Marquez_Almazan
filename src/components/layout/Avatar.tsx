import styles from './Avatar.module.css';

// eslint-disable-next-line react/only-export-components -- helper puro del avatar
export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/** Círculo con la inicial. Decorativo: el nombre siempre está escrito al lado o en la etiqueta del botón. */
export function Avatar({ name }: { name: string }) {
  return <span className={styles.avatar} aria-hidden="true">{initial(name)}</span>;
}
