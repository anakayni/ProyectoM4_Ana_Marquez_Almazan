import { useState } from 'react';
import { Navigate } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { StickyHeader } from '@/components/layout/StickyHeader';
import { AuditFilters } from '@/components/settings/AuditFilters';
import { AuditLog } from '@/components/settings/AuditLog';
import { GeneralSettings } from '@/components/settings/GeneralSettings';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EMPTY_AUDIT_FILTERS, type AuditFilters as Filters } from '@/features/audit/auditFilters';
import { can } from '@/features/auth/permissions';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/types/auth';
import styles from './SettingsPage.module.css';

type Tab = 'general' | 'audit';

const SUBTITLE: Record<Tab, string> = {
  general: 'Nombre, logo, colores y numeración del espacio.',
  audit: 'Todos los cambios del espacio, del más reciente al más antiguo.',
};

/** Ajustes del espacio (solo admin; las reglas también lo exigen). */
export function SettingsPage() {
  const { profile } = useAuth();
  const me = profile as UserProfile;
  const [tab, setTab] = useState<Tab>('general');
  const [filters, setFilters] = useState<Filters>(EMPTY_AUDIT_FILTERS);
  if (!can(me, 'team:manage')) return <Navigate to="/tasks" replace />;
  return (
    <>
      <StickyHeader>
        <PageHeader title="Ajustes" subtitle={SUBTITLE[tab]} />
        <div className={styles.bars}>
          <SegmentedControl
            label="Sección" name="settings-tab" value={tab} onChange={setTab}
            options={[{ value: 'general', label: 'General' }, { value: 'audit', label: 'Auditoría' }]}
          />
          {tab === 'audit' && <AuditFilters value={filters} onChange={setFilters} />}
        </div>
      </StickyHeader>
      <main className={styles.page}>
        {tab === 'general' ? <GeneralSettings actorId={me.uid} /> : <AuditLog key={JSON.stringify(filters)} filters={filters} />}
      </main>
    </>
  );
}
