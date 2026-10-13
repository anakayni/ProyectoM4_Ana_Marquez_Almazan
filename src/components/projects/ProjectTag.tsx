import type { Project } from '@/types/project';
import { readableTextColor } from '@/utils/color';
import styles from './ProjectTag.module.css';

/**
 * Nombre del proyecto con su color (la letra se elige para que siempre se lea).
 * `muted`: en gris, para tareas terminadas.
 */
export function ProjectTag({ project, muted = false }: { project: Project; muted?: boolean }) {
  if (muted) return <span className={`${styles.tag} ${styles.muted}`}>{project.name}</span>;
  return (
    <span className={styles.tag} style={{ backgroundColor: project.color, color: readableTextColor(project.color) }}>
      {project.name}
    </span>
  );
}
