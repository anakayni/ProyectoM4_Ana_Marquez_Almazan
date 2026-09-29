import { useEffect } from 'react';
import styles from './Toast.module.css';

export type ToastMessage = {
  kind: 'success' | 'error';
  message: string;
  action?: { label: string; onClick: () => void };
};

const DURATION_MS = 5000;

/** Aviso temporal abajo de la pantalla. Se cierra solo a los 5 segundos. */
export function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div role={toast.kind === 'error' ? 'alert' : 'status'} className={`${styles.toast} ${styles[toast.kind]}`}>
      <span className={styles.message}>{toast.message}</span>
      {toast.action && (
        <button type="button" className={styles.action} onClick={toast.action.onClick}>{toast.action.label}</button>
      )}
      <button type="button" className={styles.close} onClick={onDismiss} aria-label="Cerrar aviso">×</button>
    </div>
  );
}
