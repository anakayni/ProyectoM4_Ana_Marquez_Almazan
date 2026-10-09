import { LogOut } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { ROLE_LABEL, type UserProfile } from '@/types/auth';
import { Avatar } from './Avatar';
import styles from './UserMenu.module.css';

/** Menú de cuenta del celular: se abre con la inicial y se cierra con Escape, clic fuera o al elegir. */
export function UserMenu({ profile, onLogout }: { profile: UserProfile; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onMouseDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={triggerRef} type="button" className={styles.trigger}
        aria-label={`Cuenta de ${profile.displayName}`} aria-expanded={open} aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={profile.displayName} />
      </button>
      {open && (
        <div id={panelId} className={styles.panel}>
          <p className={styles.name}>{profile.displayName}</p>
          <p className={styles.role}>{ROLE_LABEL[profile.role]}</p>
          <button
            type="button" className={styles.logout}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
