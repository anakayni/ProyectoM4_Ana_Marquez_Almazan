import styles from './PalettePreview.module.css';

/** Vista previa en vivo: usa las variables --brand-* del contenedor (no toca el resto de la app hasta guardar). */
export function PalettePreview({ palette, name }: { palette: string[]; name: string }) {
  const vars = Object.fromEntries(palette.map((c, i) => [`--brand-${i + 1}`, c])) as React.CSSProperties;
  return (
    <div className={styles.preview} style={vars} aria-label="Vista previa de los colores" role="group">
      <div className={styles.nav}>
        <span className={styles.brand}>{name}</span>
        <span className={styles.active}>Mis tareas</span>
        <span className={styles.item}>Proyectos</span>
      </div>
      <div className={styles.body}>
        <span className={styles.title}>Título de página</span>
        <span className={styles.button}>Botón principal</span>
        <span className={styles.link}>Un enlace</span>
        <span className={styles.info}>En curso</span>
        <span className={styles.success}>Hecha</span>
      </div>
    </div>
  );
}
