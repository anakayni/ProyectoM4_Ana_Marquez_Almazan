import { Filter } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import styles from './FiltersPopover.module.css';

type Props = { activeCount: number; onClear: () => void; children: ReactNode };

/** Botón "Filtros" que abre un panel con los filtros; cierra con "Listo", Escape o un clic afuera. */
export function FiltersPopover({ activeCount, onClear, children }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Con teclado se entra directo a los filtros.
    panel.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function close() {
    setOpen(false);
    button.current?.focus();
  }

  return (
    <div className={styles.root} ref={root} onKeyDown={(e) => { if (open && e.key === 'Escape') close(); }}>
      <button
        ref={button} type="button" className={styles.trigger} aria-expanded={open} aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <Filter size={15} aria-hidden="true" />
        {activeCount > 0 ? `Filtros · ${activeCount}` : 'Filtros'}
      </button>
      {open && (
        <div id={panelId} ref={panel} tabIndex={-1} role="dialog" aria-label="Filtros" className={styles.panel}>
          <div className={styles.fields}>{children}</div>
          <div className={styles.footer}>
            <button type="button" className={styles.link} onClick={onClear}>Limpiar filtros</button>
            <button type="button" className={styles.done} onClick={close}>Listo</button>
          </div>
        </div>
      )}
    </div>
  );
}
