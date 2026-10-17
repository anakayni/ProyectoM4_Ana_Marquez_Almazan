import styles from './ColorPicker.module.css';

// eslint-disable-next-line react/only-export-components -- constante ligada al selector
export const PALETTE: readonly string[] = ['#1B4079', '#4D7C8A', '#7F9C96', '#8FAD88', '#CBDF90'];

/** Atajos con la paleta + selector libre. Siempre devuelve '#RRGGBB' en mayúsculas. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const current = value.toUpperCase();
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>Color</legend>
      <div className={styles.row}>
        {PALETTE.map((color) => (
          <label key={color} className={styles.swatch} style={{ backgroundColor: color }} title={color}>
            <input
              type="radio" name="project-color" className="visually-hidden" value={color} aria-label={color}
              checked={current === color} onChange={() => onChange(color)}
            />
          </label>
        ))}
        <label className={styles.custom}>
          <input type="color" value={value} aria-label="Otro color" onChange={(e) => onChange(e.target.value.toUpperCase())} />
          <span aria-hidden="true">Otro color</span>
        </label>
      </div>
    </fieldset>
  );
}
