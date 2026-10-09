import styles from './BrandMark.module.css';

/** Logo de la app. En la etapa 8 el cuadrado se reemplaza por el logo que suba el admin. */
export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`${styles.brand} ${inverse ? styles.inverse : ''}`}>
      <span className={styles.logo} aria-hidden="true" />
      <span>MateCode <span className={styles.product}>Tasks</span></span>
    </span>
  );
}
