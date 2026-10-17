import { CalendarDays, CheckSquare, Users } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { AvatarGroup } from '@/components/layout/AvatarGroup';
import type { PersonRow } from '@/features/projects/projectPeople';
import { openTasksLabel, type OpenSummary, type ProjectProgress } from '@/features/projects/projectProgress';
import type { Project } from '@/types/project';
import { formatDateLabel } from '@/utils/formatDate';
import styles from './ProjectCard.module.css';

type Props = {
  project: Project;
  progress: ProjectProgress;
  /** Lector e Invitado no ven las hechas: se muestra cuánto falta en lugar del avance. */
  showDone?: boolean;
  open?: OpenSummary;
  /** Personas del proyecto (responsable primero). */
  people?: PersonRow[];
};

/** Tarjeta de un proyecto: avance, personas y, al pie, fecha de fin, tareas y cantidad de personas. */
export function ProjectCard({ project, progress, showDone = true, open, people = [] }: Props) {
  const late = showDone ? progress.late : (open?.late ?? false);
  const color = { '--project-color': project.color } as CSSProperties;
  const end = formatDateLabel(project.endDate);
  return (
    <li className={styles.card} style={color}>
      <h2 className={styles.name}>
        <span className={styles.dot} aria-hidden="true" />
        <Link to={`/projects/${project.id}`} className={styles.title}>{project.name}</Link>
      </h2>
      {project.description && <p className={styles.description}>{project.description}</p>}

      {showDone ? (
        <div className={styles.progress}>
          <div className={styles.row}><span>Avance</span><span>{progress.percent}%</span></div>
          <div
            className={styles.track} role="progressbar" aria-label={`Avance de ${project.name}`}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}
          >
            <span style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      ) : (
        <p className={styles.open}>{openTasksLabel(open?.open ?? 0)}</p>
      )}

      {people.length > 0 && (
        <div className={styles.row}>
          <span>Personas</span>
          <AvatarGroup people={people.map(({ name, photo, active }) => ({ name, photo, active }))} max={3} overlap />
        </div>
      )}

      <div className={styles.footer}>
        <span className={`${styles.fact} ${late ? styles.late : ''}`} aria-label={`Fin: ${end}${late ? ', atrasado' : ''}`}>
          <CalendarDays size={15} aria-hidden="true" />{end}
        </span>
        {late && <span className={styles.chip}>Atrasado</span>}
        {showDone ? (
          <span className={styles.fact} aria-label={`Tareas hechas: ${progress.done} de ${progress.total}`}>
            <CheckSquare size={15} aria-hidden="true" />{progress.done}/{progress.total}
          </span>
        ) : (
          <span className={styles.fact} aria-label={`Tareas abiertas: ${open?.open ?? 0}`}>
            <CheckSquare size={15} aria-hidden="true" />{open?.open ?? 0}
          </span>
        )}
        <span className={`${styles.fact} ${styles.push}`} aria-label={`Personas: ${people.length}`}>
          <Users size={15} aria-hidden="true" />{people.length}
        </span>
      </div>
    </li>
  );
}
