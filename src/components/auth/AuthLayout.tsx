import type { ReactNode } from 'react';
import styles from './AuthLayout.module.css';

// Clases compartidas por LoginPage y RegisterPage.
// eslint-disable-next-line react/only-export-components
export const authFormClass = styles.form;
// eslint-disable-next-line react/only-export-components
export const authDividerClass = styles.divider;

type AuthLayoutProps = { title: string; subtitle: string; children: ReactNode; footer?: ReactNode };

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">M</span>
          <span>MateCode <span className={styles.muted}>Tasks</span></span>
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
        {footer && <p className={styles.footer}>{footer}</p>}
      </div>
    </main>
  );
}
