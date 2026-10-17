import styles from './CreditsFooter.module.css';

/** Firma de la desarrolladora: fija, no se cambia desde Ajustes. (El logo de Imago Design se agrega cuando esté.) */
export function CreditsFooter({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  return (
    <footer className={`${styles.footer} ${variant === 'dark' ? styles.dark : ''}`}>
      Desarrollado por <strong>Imago Design</strong>
    </footer>
  );
}
