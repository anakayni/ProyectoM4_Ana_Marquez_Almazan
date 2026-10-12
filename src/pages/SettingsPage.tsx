import { Navigate } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { can } from '@/features/auth/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/types/auth';
import styles from './SettingsPage.module.css';

/** Ajustes del espacio (solo admin; las reglas también lo exigen). */
export function SettingsPage() {
  const { profile } = useAuth();
  const me = profile as UserProfile;
  if (!can(me, 'team:manage')) return <Navigate to="/tasks" replace />;
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Nombre, logo, colores y numeración del espacio." />
      <main className={styles.page}>
        <GeneralSettings actorId={me.uid} />
      </main>
    </>
  );
}
