import { NavLink } from 'react-router';
import type { NavItem } from '@/features/navigation/navItems';
import styles from './BottomTabs.module.css';

type BottomTabsProps = { items: NavItem[]; onUnavailable: (item: NavItem) => void };

/** Pestañas del celular. Las secciones pendientes avisan "Próximamente" al tocarlas. */
export function BottomTabs({ items, onUnavailable }: BottomTabsProps) {
  return (
    <nav aria-label="Principal" className={styles.tabs}>
      <ul className={styles.list}>
        {items.map((item) => {
          const { key, shortLabel, icon: Icon, to } = item;
          return (
            <li key={key}>
              {to ? (
                <NavLink to={to} className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}>
                  <Icon size={20} aria-hidden="true" />
                  <span>{shortLabel}</span>
                </NavLink>
              ) : (
                <button type="button" className={`${styles.tab} ${styles.soon}`} aria-disabled="true" onClick={() => onUnavailable(item)}>
                  <Icon size={20} aria-hidden="true" />
                  <span>{shortLabel}</span>
                  <span className="visually-hidden"> (Próximamente)</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
