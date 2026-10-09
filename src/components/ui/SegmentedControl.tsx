import styles from './SegmentedControl.module.css';

type Option<T extends string> = { value: T; label: string };
type Props<T extends string> = { label: string; name: string; options: Option<T>[]; value: T; onChange: (value: T) => void };

/** Grupo de opciones excluyentes (radios con aspecto de botones). Se usa para el alcance y la vista. */
export function SegmentedControl<T extends string>({ label, name, options, value, onChange }: Props<T>) {
  return (
    <fieldset className={styles.group}>
      <legend className="visually-hidden">{label}</legend>
      {options.map((option) => (
        <label key={option.value} className={`${styles.option} ${option.value === value ? styles.selected : ''}`}>
          <input
            type="radio" className="visually-hidden" name={name} value={option.value}
            checked={option.value === value} onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
