import type { ReactNode } from 'react';
import styles from './Field.module.css';

export const fieldInputClass = styles.input;

type FieldProps = { id: string; label: string; error?: string; children: ReactNode };

/** Label + control + mensaje de error. El control hijo debe usar el mismo `id`. */
export function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      {children}
      {error && <p id={`${id}-error`} className={styles.error}>{error}</p>}
    </div>
  );
}
