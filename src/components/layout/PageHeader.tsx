import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

type PageHeaderProps = { title: string; subtitle?: ReactNode; actions?: ReactNode };

/** Encabezado de cada página dentro del marco: título y acciones propias de la página. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
