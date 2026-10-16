import { Link } from 'react-router';
import { Avatar } from '@/components/layout/Avatar';
import { openTasksLabel, type OpenSummary, type ProjectProgress } from '@/features/projects/projectProgress';
import type { Person } from '@/features/team/members';
import type { Project } from '@/types/project';
import { formatDateLabel } from '@/utils/formatDate';
import styles from './ProjectCard.module.css';

type Props = {
  project: Project;
  progress: ProjectProgress;
  owner: Person | null;
  /** Lector e Invitado no ven las hechas: se muestra cuánto falta en lugar del avance. */
  showDone?: boolean;
  open?: OpenSummary;
};

export function ProjectCard({ project, progress, owner, showDone = true, open }: Props) {
  const late = showDone ? progress.late : (open?.late ?? false);
  return (
    <li className={styles.card} style={{ borderTopColor: project.color }}>
      <Link to={`/projects/${project.id}`} className={styles.title}>{project.name}</Link>
      {late ? (
        <p className={styles.late}>Atrasado · terminó el {formatDateLabel(project.endDate)}</p>
      ) : (
        <p className={styles.dates}>{formatDateLabel(project.startDate)} → {formatDateLabel(project.endDate)}</p>
      )}
      {showDone ? (
        <>
          <div
            className={styles.bar} role="progressbar" aria-label={`Progreso de ${project.name}`}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}
          >
            <span style={{ width: `${progress.percent}%`, backgroundColor: project.color }} />
          </div>
          <p className={styles.summary}>{progress.percent}% · {progress.done} de {progress.total} hechas</p>
          <p className={styles.detail}>{progress.doing} en curso · {progress.todo} pendientes</p>
        </>
      ) : (
        <p className={styles.summary}>{openTasksLabel(open?.open ?? 0)}</p>
      )}
      {owner && (
        <p className={styles.owner}>
          <Avatar name={owner.name} photo={owner.photo} inactive={!owner.active} />
          <span>A cargo: {owner.name}</span>
        </p>
      )}
    </li>
  );
}
