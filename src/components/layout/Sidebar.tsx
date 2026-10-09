import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router';
import type { NavItem } from '@/features/navigation/navItems';
import { ROLE_LABEL, type UserProfile } from '@/types/auth';
import { Avatar } from './Avatar';
import { BrandMark } from './BrandMark';
import styles from './Sidebar.module.css';

type SidebarProps = { items: NavItem[]; profile: UserProfile; onLogout: () => void };

/** Menú lateral de escritorio. */
export function Sidebar({ items, profile, onLogout }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}><BrandMark inverse /></div>
      <nav aria-label="Principal">
        <ul className={styles.list}>
          {items.map(({ key, label, icon: Icon, to }) => (
            <li key={key}>
              {to ? (
                <NavLink to={to} className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ) : (
                <span className={`${styles.item} ${styles.soon}`} aria-disabled="true">
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                  <span className={styles.badge}>Próximamente</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.user}>
        <Avatar name={profile.displayName} />
        <div className={styles.userText}>
          <span className={styles.userName}>{profile.displayName}</span>
          <span className={styles.userRole}>{ROLE_LABEL[profile.role]}</span>
        </div>
        <button type="button" className={styles.logout} onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
