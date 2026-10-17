import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { ProjectMarker } from '@/features/calendar/month';
import { dayLabel } from '@/features/calendar/month';
import type { ProjectOf } from '@/features/projects/projectOf';
import type { Task } from '@/types/task';
import { MarkerChip, TaskChip } from './CalendarItem';

type Props = {
  date: string;
  tasks: Task[];
  markers: ProjectMarker[];
  projectOf: ProjectOf;
  today: string;
  onOpenTask: (task: Task) => void;
  onCreate: ((date: string) => void) | null;
  onClose: () => void;
};

/** Todo lo de un día (cuando no entra en la celda). */
export function DayDialog({ date, tasks, markers, projectOf, today, onOpenTask, onCreate, onClose }: Props) {
  return (
    <Modal title={dayLabel(date)} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {markers.map((m) => <MarkerChip key={`${m.project.id}-${m.kind}`} marker={m} />)}
        {tasks.map((t) => <TaskChip key={t.id} task={t} projectOf={projectOf} today={today} onOpen={onOpenTask} />)}
        {onCreate && <Button size="sm" onClick={() => onCreate(date)}>+ Nueva tarea este día</Button>}
      </div>
    </Modal>
  );
}
