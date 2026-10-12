import type { Project } from '@/types/project';
import { readableTextColor } from '@/utils/color';
import styles from './ProjectTag.module.css';

/** Nombre del proyecto con su color (la letra se elige para que siempre se lea). */
export function ProjectTag({ project }: { project: Project }) {
  return (
    <span className={styles.tag} style={{ backgroundColor: project.color, color: readableTextColor(project.color) }}>
      {project.name}
    </span>
  );
}
