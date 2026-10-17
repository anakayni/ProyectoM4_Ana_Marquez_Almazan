import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

/** `description`: la frase corta debajo del título (etapa 10). */
type PageHeaderProps = { title: string; subtitle?: ReactNode; description?: string; actions?: ReactNode };

/** Encabezado de cada página dentro del marco: título y acciones propias de la página. */
export function PageHeader({ title, subtitle, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
