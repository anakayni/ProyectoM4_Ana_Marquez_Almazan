import type { AgendaDay } from '@/features/calendar/month';
import { dayLabel } from '@/features/calendar/month';
import type { ProjectOf } from '@/features/projects/projectOf';
import { isOverdue } from '@/features/tasks/taskStats';
import type { NameOf } from '@/features/team/members';
import { STATUS_LABEL, type Task } from '@/types/task';
import { useTaskNumberFormat } from '@/hooks/useWorkspaceSettings';
import { MarkerChip } from './CalendarItem';
import styles from './AgendaView.module.css';

const weekdayDay = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });

function heading(date: string, today: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const label = weekdayDay.format(new Date(y, m - 1, d));
  return date === today ? `Hoy · ${label}` : label;
}

type Props = {
  days: AgendaDay[];
  projectOf: ProjectOf;
  nameOf: NameOf;
  today: string;
  onOpenTask: (task: Task) => void;
  onCreate: ((date: string) => void) | null;
};

/** Agenda del celular: un bloque por día con tareas o fechas de proyecto. */
export function AgendaView({ days, projectOf, nameOf, today, onOpenTask, onCreate }: Props) {
  const formatNumber = useTaskNumberFormat();
  return (
    <div className={styles.agenda}>
      {days.length === 0 && <p className={styles.empty}>No hay tareas ni fechas de proyectos este mes.</p>}
      {days.map((day) => (
        <section key={day.date} aria-labelledby={`agenda-${day.date}`} className={styles.day}>
          <div className={styles.head}>
            <h3 id={`agenda-${day.date}`} className={styles.title}>{heading(day.date, today)}</h3>
            {onCreate && (
              <button type="button" className={styles.add} aria-label={`Nueva tarea el ${dayLabel(day.date)}`} onClick={() => onCreate(day.date)}>+</button>
            )}
          </div>
          {day.markers.map((m) => <MarkerChip key={`${m.project.id}-${m.kind}`} marker={m} />)}
          {day.tasks.map((task) => {
            const project = projectOf(task.projectId);
            const state = task.status === 'done' ? styles.done : isOverdue(task, today) ? styles.overdue : '';
            return (
              <button
                key={task.id} type="button" className={`${styles.item} ${state}`}
                style={{ borderLeftColor: project?.color ?? 'var(--color-border-strong)' }} onClick={() => onOpenTask(task)}
              >
                <span className={styles.itemTitle}>{formatNumber(task.number)} {task.title}</span>
                <span className={styles.itemMeta}>
                  {project?.name ?? 'Sin proyecto'} · {STATUS_LABEL[task.status]} · {nameOf(task.assigneeId) ?? 'Sin asignar'}
                </span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
