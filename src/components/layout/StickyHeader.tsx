import type { ReactNode } from 'react';
import styles from './StickyHeader.module.css';

/** Encabezado y filtros de una página: quedan fijos arriba y lo de abajo se desplaza. */
export function StickyHeader({ children }: { children: ReactNode }) {
  return <div className={styles.sticky}>{children}</div>;
}
