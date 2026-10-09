import type { ReactNode } from 'react';
import { BrandMark } from '@/components/layout/BrandMark';
import styles from './AuthLayout.module.css';

// Clases compartidas por LoginPage y RegisterPage.
// eslint-disable-next-line react/only-export-components
export const authFormClass = styles.form;
// eslint-disable-next-line react/only-export-components
export const authDividerClass = styles.divider;

type AuthLayoutProps = { title: string; subtitle: string; children: ReactNode; footer?: ReactNode };

/** Pantalla dividida: panel de marca a la izquierda (franja arriba en celular) y formulario. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <BrandMark inverse />
        <div className={styles.pitch}>
          <p className={styles.headline}>Las tareas de tu equipo, en un solo lugar.</p>
          <p className={styles.note}>Acceso solo con invitación del administrador.</p>
        </div>
        <div className={styles.swatches} aria-hidden="true">
          <span /><span /><span /><span />
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          {children}
          {footer && <p className={styles.footer}>{footer}</p>}
        </div>
      </main>
    </div>
  );
}
