import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import styles from './BrandMark.module.css';

/** Logo y nombre del espacio (configurables en Ajustes). */
export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  const { name, logo } = useWorkspaceSettings();
  return (
    <span className={`${styles.brand} ${inverse ? styles.inverse : ''}`}>
      {logo ? <img className={styles.image} src={logo} alt={name} /> : <span className={styles.logo} aria-hidden="true" />}
      {/* Con logo, la imagen ya lleva el nombre como texto alternativo: el texto visible no se lee dos veces. */}
      <span aria-hidden={logo ? 'true' : undefined}>{name}</span>
    </span>
  );
}
