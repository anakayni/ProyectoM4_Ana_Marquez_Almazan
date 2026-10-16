import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { addDays, barPosition, pointPosition, type GanttRange } from '@/features/calendar/gantt';
import { dayLabel } from '@/features/calendar/month';
import { openTasksLabel, projectOpenSummary, projectProgress } from '@/features/projects/projectProgress';
import { isOverdue } from '@/features/tasks/taskStats';
import type { NameOf } from '@/features/team/members';
import type { Project } from '@/types/project';
import { STATUS_LABEL, type Task } from '@/types/task';
import { readableTextColor } from '@/utils/color';
import { useTaskNumberFormat } from '@/hooks/useWorkspaceSettings';
import styles from './GanttView.module.css';

type Props = {
  projects: Project[];
  tasks: Task[];
  range: GanttRange;
  today: string;
  nameOf: NameOf;
  onOpenTask: (task: Task) => void;
  /** Lector e Invitado no ven las hechas: la barra dice cuántas tareas quedan abiertas. */
  showDone?: boolean;
};

/** Una fila por proyecto: barra de inicio a fin con su progreso real y las tareas como ◆ en su vencimiento. */
export function GanttView({ projects, tasks, range, today, nameOf, onOpenTask, showDone = true }: Props) {
  const formatNumber = useTaskNumberFormat();
  const rows = projects
    .map((project) => ({ project, bar: barPosition(project.startDate, project.endDate, range) }))
    .filter((row) => row.bar !== null);
  const todayAt = pointPosition(today, range);
  const thisWeek = range.weeks.findIndex((w) => w.start <= today && today <= addDays(w.start, 6));

  return (
    <div className={styles.scroll}>
      <div className={styles.gantt}>
        <div className={`${styles.row} ${styles.header}`}>
          <div className={styles.label}><span className={styles.caption}>Proyecto</span></div>
          <div className={styles.weeks}>
            {range.weeks.map((w, i) => (
              <div key={w.start} className={i === thisWeek ? styles.now : undefined}>
                <b>Sem {w.week}</b>
                <span>{dayLabel(w.start)}</span>
              </div>
            ))}
          </div>
        </div>

        {rows.length === 0 && <p className={styles.empty}>No hay proyectos en estas semanas.</p>}

        {rows.map(({ project, bar }) => {
          const own = tasks.filter((t) => t.projectId === project.id);
          const progress = projectProgress(own, project.endDate, today);
          const openSummary = projectOpenSummary(own, project.endDate, today);
          const late = showDone ? progress.late : openSummary.late;
          const status = showDone ? `${progress.percent}% hecho` : openTasksLabel(openSummary.open);
          const owner = nameOf(project.ownerId);
          const points = own.filter((t) => t.dueDate && pointPosition(t.dueDate, range) !== null);
          const barStyle: CSSProperties = {
            left: `${bar!.left}%`, width: `${bar!.width}%`, backgroundColor: project.color, color: readableTextColor(project.color),
          };
          return (
            <div key={project.id} className={styles.row}>
              <div className={styles.label}>
                <span className={styles.name}>{project.name}</span>
                <span className={styles.meta}>
                  {owner && `A cargo: ${owner}`}
                  {late && <span className={styles.late}> · Atrasado</span>}
                </span>
              </div>
              <div className={styles.track}>
                <Link
                  to={`/projects/${project.id}`} className={styles.bar} style={barStyle}
                  aria-label={`${project.name}, ${dayLabel(project.startDate)} a ${dayLabel(project.endDate)}, ${status}${late ? ', atrasado' : ''}`}
                >
                  <span className={styles.barText}>{project.name}</span>
                  <span className={styles.percent}>{showDone ? `${progress.percent}%` : `${openSummary.open} abiertas`}</span>
                </Link>
                {points.map((t) => {
                  const state = t.status === 'done' ? styles.done : isOverdue(t, today) ? styles.overdue : '';
                  return (
                    <button
                      key={t.id} type="button" className={`${styles.point} ${state}`}
                      style={{ left: `${pointPosition(t.dueDate!, range)}%` }}
                      aria-label={`${formatNumber(t.number)} ${t.title}, vence ${dayLabel(t.dueDate!)}, ${STATUS_LABEL[t.status]}`}
                      title={`${formatNumber(t.number)} ${t.title}`}
                      onClick={() => onOpenTask(t)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {todayAt !== null && (
          <div className={styles.todayLine} style={{ left: `calc(var(--gantt-label) + (100% - var(--gantt-label)) * ${todayAt / 100})` }}>
            <span className={styles.todayText}>Hoy · {dayLabel(today)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
