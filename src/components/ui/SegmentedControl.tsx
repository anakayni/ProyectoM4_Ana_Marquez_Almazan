import type { LucideIcon } from 'lucide-react';
import styles from './SegmentedControl.module.css';

/** Con `icon`, se ve solo el ícono: el texto queda oculto para el lector de pantalla y como ayuda al pasar el mouse. */
type Option<T extends string> = { value: T; label: string; icon?: LucideIcon };
type Props<T extends string> = { label: string; name: string; options: Option<T>[]; value: T; onChange: (value: T) => void };

/** Grupo de opciones excluyentes (radios con aspecto de botones). Se usa para el alcance y la vista. */
export function SegmentedControl<T extends string>({ label, name, options, value, onChange }: Props<T>) {
  return (
    <fieldset className={styles.group}>
      <legend className="visually-hidden">{label}</legend>
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => (
        <label
          key={optionValue} title={Icon ? optionLabel : undefined}
          className={`${styles.option} ${Icon ? styles.iconOption : ''} ${optionValue === value ? styles.selected : ''}`}
        >
          <input
            type="radio" className="visually-hidden" name={name} value={optionValue}
            checked={optionValue === value} onChange={() => onChange(optionValue)}
          />
          {Icon ? (
            <>
              <Icon size={18} aria-hidden="true" />
              <span className="visually-hidden">{optionLabel}</span>
            </>
          ) : (
            optionLabel
          )}
        </label>
      ))}
    </fieldset>
  );
}
