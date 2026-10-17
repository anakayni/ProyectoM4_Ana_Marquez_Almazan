import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AvatarGroup } from '@/components/layout/AvatarGroup';
import { peopleRows } from '@/features/projects/projectPeople';
import type { UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';
import { ShareProjectDialog } from './ShareProjectDialog';
import styles from './ProjectPeople.module.css';

/** `bare`: sin el título propio (cuando quien lo usa ya lo pone, como la fila de datos del proyecto). */
type Props = { project: Project; members: UserProfile[]; tasks: Task[]; actorId: string; canManage: boolean; bare?: boolean };

/** Caras de quienes trabajan en el proyecto; al tocarlas se ve la lista. El admin además tiene "+" para agregar. */
export function ProjectPeople(props: Props) {
  const [open, setOpen] = useState(false);
  const rows = peopleRows(props.project, props.members);
  return (
    <div className={styles.summary}>
      {!props.bare && <p className={styles.label}>Personas del proyecto</p>}
      <div className={styles.facesRow}>
        <button type="button" className={styles.facesButton} aria-label="Ver personas del proyecto" onClick={() => setOpen(true)}>
          <AvatarGroup people={rows.map(({ name, photo, active }) => ({ name, photo, active }))} max={5} />
        </button>
        {props.canManage && (
          <button type="button" className={styles.addButton} aria-label="Agregar persona al proyecto" onClick={() => setOpen(true)}>
            <Plus size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && <ShareProjectDialog {...props} onClose={() => setOpen(false)} />}
    </div>
  );
}
