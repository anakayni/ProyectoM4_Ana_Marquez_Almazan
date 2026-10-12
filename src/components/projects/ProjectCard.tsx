import { Link } from 'react-router';
import { Avatar } from '@/components/layout/Avatar';
import type { ProjectProgress } from '@/features/projects/projectProgress';
import type { Person } from '@/features/team/members';
import type { Project } from '@/types/project';
import { formatDateLabel } from '@/utils/formatDate';
import styles from './ProjectCard.module.css';

type Props = { project: Project; progress: ProjectProgress; owner: Person | null };

export function ProjectCard({ project, progress, owner }: Props) {
  return (
    <li className={styles.card} style={{ borderTopColor: project.color }}>
      <Link to={`/projects/${project.id}`} className={styles.title}>{project.name}</Link>
      {progress.late ? (
        <p className={styles.late}>Atrasado · terminó el {formatDateLabel(project.endDate)}</p>
      ) : (
        <p className={styles.dates}>{formatDateLabel(project.startDate)} → {formatDateLabel(project.endDate)}</p>
      )}
      <div
        className={styles.bar} role="progressbar" aria-label={`Progreso de ${project.name}`}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}
      >
        <span style={{ width: `${progress.percent}%`, backgroundColor: project.color }} />
      </div>
      <p className={styles.summary}>{progress.percent}% · {progress.done} de {progress.total} hechas</p>
      <p className={styles.detail}>{progress.doing} en curso · {progress.todo} pendientes</p>
      {owner && (
        <p className={styles.owner}>
          <Avatar name={owner.name} photo={owner.photo} inactive={!owner.active} />
          <span>A cargo: {owner.name}</span>
        </p>
      )}
    </li>
  );
}
