import { useCallback, useState } from 'react';
import { Outlet } from 'react-router';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { navItems } from '@/features/navigation/navItems';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/types/auth';
import styles from './AppShell.module.css';
import { BottomTabs } from './BottomTabs';
import { MobileTopBar } from './MobileTopBar';
import { Sidebar } from './Sidebar';

/**
 * Marco de las páginas internas. Escritorio y celular se renderizan juntos:
 * CSS muestra uno u otro, así no hace falta detectar el ancho con JavaScript.
 */
export function AppShell() {
  const { profile, logout } = useAuth();
  const user = profile as UserProfile; // RequireAccess garantiza un perfil activo
  const items = navItems(user);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const onLogout = () => void logout();

  return (
    <div className={styles.shell}>
      <Sidebar items={items} profile={user} onLogout={onLogout} />
      <MobileTopBar profile={user} onLogout={onLogout} />
      <div className={styles.content}>
        <Outlet />
      </div>
      <BottomTabs items={items} onUnavailable={(item) => setToast({ kind: 'info', message: `${item.label}: próximamente.` })} />
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </div>
  );
}
