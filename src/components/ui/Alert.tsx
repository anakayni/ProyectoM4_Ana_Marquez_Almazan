import type { ReactNode } from 'react';
import styles from './Alert.module.css';

type AlertProps = { kind: 'error' | 'success' | 'info'; children: ReactNode };

export function Alert({ kind, children }: AlertProps) {
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`${styles.alert} ${styles[kind]}`}>
      {children}
    </div>
  );
}
