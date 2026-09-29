import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Modal.module.css';

type ModalProps = { title: string; onClose: () => void; children: ReactNode };

/**
 * Usa <dialog> nativo: el navegador se encarga del foco, del fondo oscuro
 * y de cerrar con Escape (que dispara el evento `close`).
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    // `?.` porque jsdom (tests) no implementa showModal.
    if (dialog && !dialog.open) dialog.showModal?.();
  }, []);

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="modal-title" onClose={onClose}>
      <header className={styles.header}>
        <h2 id="modal-title" className={styles.title}>{title}</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      {children}
    </dialog>
  );
}
