import type { CalendarDay, ProjectMarker } from '@/features/calendar/month';
import { dayLabel } from '@/features/calendar/month';
import type { ProjectOf } from '@/features/projects/projectOf';
import type { Task } from '@/types/task';
import { MarkerChip, TaskChip } from './CalendarItem';
import styles from './MonthView.module.css';

const WEEKDAYS = [
  ['Lun', 'lunes'], ['Mar', 'martes'], ['Mié', 'miércoles'], ['Jue', 'jueves'], ['Vie', 'viernes'], ['Sáb', 'sábado'], ['Dom', 'domingo'],
];
const VISIBLE = 3;

type Props = {
  grid: CalendarDay[][];
  byDay: Map<string, Task[]>;
  markers: Map<string, ProjectMarker[]>;
  projectOf: ProjectOf;
  today: string;
  onOpenTask: (task: Task) => void;
  /** null = no puede crear (lector) */
  onCreate: ((date: string) => void) | null;
  onOpenDay: (date: string) => void;
};

/** Grilla del mes como tabla: los días de la semana son encabezados de columna. */
export function MonthView({ grid, byDay, markers, projectOf, today, onOpenTask, onCreate, onOpenDay }: Props) {
  return (
    <table className={styles.grid}>
      <caption className="visually-hidden">Tareas del mes por día de vencimiento</caption>
      <thead>
        <tr>{WEEKDAYS.map(([short, long]) => <th key={short} scope="col" abbr={long}>{short}</th>)}</tr>
      </thead>
      <tbody>
        {grid.map((week) => (
          <tr key={week[0].date}>
            {week.map((day) => {
              const tasks = byDay.get(day.date) ?? [];
              const extra = tasks.length - VISIBLE;
              return (
                <td
                  key={day.date} data-testid={`day-${day.date}`} aria-current={day.isToday ? 'date' : undefined}
                  className={`${styles.day} ${day.inMonth ? '' : styles.out} ${day.isToday ? styles.today : ''}`}
                >
                  <div className={styles.head}>
                    <span className={styles.number}>{day.day}</span>
                    {onCreate && (
                      <button type="button" className={styles.add} aria-label={`Nueva tarea el ${dayLabel(day.date)}`} onClick={() => onCreate(day.date)}>
                        +
                      </button>
                    )}
                  </div>
                  {(markers.get(day.date) ?? []).map((m) => <MarkerChip key={`${m.project.id}-${m.kind}`} marker={m} />)}
                  {tasks.slice(0, VISIBLE).map((t) => <TaskChip key={t.id} task={t} projectOf={projectOf} today={today} onOpen={onOpenTask} />)}
                  {extra > 0 && (
                    <button type="button" className={styles.more} onClick={() => onOpenDay(day.date)}>+{extra} más</button>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
