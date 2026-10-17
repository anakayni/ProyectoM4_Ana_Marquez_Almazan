import { Button } from '@/components/ui/Button';
import { EMPTY_AUDIT_FILTERS, ENTITY_FILTER_OPTIONS, type AuditFilters as Filters } from '@/features/audit/auditFilters';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import styles from './AuditFilters.module.css';

type Props = { value: Filters; onChange: (next: Filters) => void };

/** Filtros de la auditoría: tipo, persona y rango de fechas. */
export function AuditFilters({ value, onChange }: Props) {
  const members = [...useTeamMembers()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  const isEmpty = JSON.stringify(value) === JSON.stringify(EMPTY_AUDIT_FILTERS);
  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        Tipo
        <select value={value.entityType} onChange={(e) => set({ entityType: e.target.value as Filters['entityType'] })}>
          <option value="all">Todos</option>
          {ENTITY_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        Persona
        <select value={value.actorId} onChange={(e) => set({ actorId: e.target.value })}>
          <option value="">Todas</option>
          {members.map((m) => <option key={m.uid} value={m.uid}>{m.displayName}{m.active ? '' : ' (desactivada)'}</option>)}
          <option value="system">El sistema</option>
        </select>
      </label>
      <label className={styles.field}>
        Desde
        <input type="date" value={value.from} max={value.to || undefined} onChange={(e) => set({ from: e.target.value })} />
      </label>
      <label className={styles.field}>
        Hasta
        <input type="date" value={value.to} min={value.from || undefined} onChange={(e) => set({ to: e.target.value })} />
      </label>
      {!isEmpty && <Button size="sm" variant="ghost" onClick={() => onChange(EMPTY_AUDIT_FILTERS)}>Limpiar filtros</Button>}
    </div>
  );
}
