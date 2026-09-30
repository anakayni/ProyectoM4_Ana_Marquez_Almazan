import type { TaskCounts, TaskFilter } from '@/types/task';
import styles from './TaskFilters.module.css';

const OPTIONS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'done', label: 'Completadas' },
];

type TaskFiltersProps = { value: TaskFilter; counts: TaskCounts; onChange: (filter: TaskFilter) => void };

export function TaskFilters({ value, counts, onChange }: TaskFiltersProps) {
  return (
    <div className={styles.group} role="group" aria-label="Filtrar tareas">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label} <span className={styles.count}>{counts[option.value]}</span>
        </button>
      ))}
    </div>
  );
}
