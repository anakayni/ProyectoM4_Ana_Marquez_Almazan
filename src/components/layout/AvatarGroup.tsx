import { Avatar } from './Avatar';
import styles from './AvatarGroup.module.css';

type Person = { name: string; photo: string | null; active: boolean };
type Props = { people: Person[]; max: number; overlap?: boolean };

function listLabel(names: string[], rest: number): string {
  if (rest > 0) return `${names.join(', ')} y ${rest} más`;
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : (names[0] ?? 'nadie');
}

/** Caras de varias personas (superpuestas o separadas) con "+N" para el resto. */
export function AvatarGroup({ people, max, overlap = false }: Props) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={`${styles.group} ${overlap ? styles.overlap : ''}`} role="img" aria-label={`Personas: ${listLabel(shown.map((p) => p.name), rest)}`}>
      {shown.map((p) => <span key={p.name} className={styles.face}><Avatar name={p.name} photo={p.photo} inactive={!p.active} /></span>)}
      {rest > 0 && <span className={`${styles.face} ${styles.more}`}>{rest}+</span>}
    </span>
  );
}
