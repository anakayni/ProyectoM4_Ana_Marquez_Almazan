import type { StatCard, TaskStats as Stats } from '@/types/task';
import styles from './TaskStats.module.css';

const CARDS: { key: StatCard; label: string }[] = [
  { key: 'todo', label: 'Pendientes' },
  { key: 'doing', label: 'En curso' },
  { key: 'done', label: 'Hechas' },
  { key: 'overdue', label: 'Vencidas' },
];

/** `showDone: false` (Lector e Invitado): sin la tarjeta "Hechas". */
type Props = { stats: Stats; selected: StatCard | null; onSelect: (card: StatCard | null) => void; showDone?: boolean };

/** Números reales del alcance elegido. Cada tarjeta filtra la lista; otro clic quita el filtro. */
export function TaskStats({ stats, selected, onSelect, showDone = true }: Props) {
  return (
    <div className={styles.grid} role="group" aria-label="Resumen de tareas">
      {CARDS.filter((c) => showDone || c.key !== 'done').map(({ key, label }) => (
        <button
          key={key} type="button" aria-pressed={selected === key}
          className={`${styles.card} ${key === 'overdue' && stats.overdue > 0 ? styles.alert : ''}`}
          onClick={() => onSelect(selected === key ? null : key)}
        >
          <span className={styles.label}>{label}</span>{' '}
          <span className={styles.value}>{stats[key]}</span>
        </button>
      ))}
    </div>
  );
}
