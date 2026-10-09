import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

type ModalProps = { title: string; onClose: () => void; children: ReactNode; variant?: 'center' | 'panel' };

/**
 * Usa <dialog> nativo: el navegador se encarga del foco, del fondo oscuro
 * y de cerrar con Escape (que dispara el evento `close`).
 */
export function Modal({ title, onClose, children, variant = 'center' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    // Sin showModal (jsdom en los tests, navegadores viejos) se abre igual, aunque sin fondo oscuro.
    if (dialog.showModal) dialog.showModal();
    else dialog.open = true;
  }, []);

  return (
    <dialog
      ref={ref} className={`${styles.dialog} ${variant === 'panel' ? styles.panel : ''}`}
      aria-labelledby="modal-title" onClose={onClose}
    >
      <header className={styles.header}>
        <h2 id="modal-title" className={styles.title}>{title}</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      {children}
    </dialog>
  );
}
