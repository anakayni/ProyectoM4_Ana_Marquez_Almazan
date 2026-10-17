import type { LucideIcon } from 'lucide-react';
import styles from './ViewTabs.module.css';

type Option<T extends string> = { value: T; label: string; icon?: LucideIcon; count?: number };
type Props<T extends string> = { label: string; name: string; options: Option<T>[]; value: T; onChange: (value: T) => void };

/** Pestañas para cambiar de vista: radios con aspecto de pestaña (línea debajo de la activa). */
export function ViewTabs<T extends string>({ label, name, options, value, onChange }: Props<T>) {
  return (
    <fieldset className={styles.tabs}>
      <legend className="visually-hidden">{label}</legend>
      {options.map(({ value: v, label: text, icon: Icon, count }) => (
        <label key={v} className={`${styles.tab} ${v === value ? styles.active : ''}`}>
          <input type="radio" className="visually-hidden" name={name} value={v} checked={v === value} onChange={() => onChange(v)} />
          {Icon && <Icon size={16} aria-hidden="true" />}
          {text}
          {count !== undefined && <span className={styles.count}>{count}</span>}
        </label>
      ))}
    </fieldset>
  );
}
