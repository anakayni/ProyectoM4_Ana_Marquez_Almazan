import { useState } from 'react';
import { Avatar } from '@/components/layout/Avatar';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { addableMembers, peopleRows, removePersonMessage, type PersonRow } from '@/features/projects/projectPeople';
import { usePendingGuestInvitations } from '@/hooks/usePendingGuestInvitations';
import { setProjectMembers } from '@/services/projects.service';
import type { UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { Task } from '@/types/task';
import styles from './ProjectPeople.module.css';

type Props = { project: Project; members: UserProfile[]; tasks: Task[]; actorId: string; canManage: boolean };

/** Caras de quienes trabajan en el proyecto y botón para ver (y, el admin, cambiar) la lista. */
export function ProjectPeople(props: Props) {
  const [open, setOpen] = useState(false);
  const rows = peopleRows(props.project, props.members);
  return (
    <div className={styles.summary}>
      <span className={styles.faces} aria-hidden="true">
        {rows.slice(0, 5).map((r) => <Avatar key={r.uid} name={r.name} photo={r.photo} inactive={!r.active} />)}
      </span>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Personas del proyecto ({rows.length})</Button>
      {open && <PeopleDialog {...props} rows={rows} onClose={() => setOpen(false)} />}
    </div>
  );
}

function PeopleDialog({ project, members, tasks, actorId, canManage, rows, onClose }: Props & { rows: PersonRow[]; onClose: () => void }) {
  const pendingGuests = usePendingGuestInvitations(canManage);
  const addable = addableMembers(project, members);
  const memberIds = project.memberIds ?? [];
  const [selected, setSelected] = useState('');
  const [removing, setRemoving] = useState<PersonRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openAssigned = (uid: string) =>
    tasks.filter((t) => t.projectId === project.id && t.assigneeId === uid && t.status !== 'done').length;

  async function save(next: string[]) {
    setSaving(true);
    setError(null);
    try {
      await setProjectMembers(actorId, project.id, next);
      setSelected('');
      setRemoving(null);
    } catch (err) {
      console.error('Error al cambiar las personas del proyecto:', err);
      setError('No pudimos guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Personas del proyecto" onClose={onClose}>
      <p className={styles.help}>Quienes trabajan en «{project.name}». Un Invitado solo ve los proyectos donde está.</p>
      {error && <Alert kind="error">{error}</Alert>}
      <ul className={styles.list}>
        {rows.map((r) => (
          <li key={r.uid} className={styles.row}>
            <Avatar name={r.name} photo={r.photo} inactive={!r.active} />
            <span className={styles.name}>{r.name}</span>
            {r.isOwner && <span className={styles.tag}>Responsable</span>}
            {r.isGuest && <span className={styles.tag}>Invitado</span>}
            {canManage && !r.isOwner && (
              <Button size="sm" variant="ghost" aria-label={`Quitar a ${r.name}`} onClick={() => setRemoving(r)}>Quitar</Button>
            )}
          </li>
        ))}
      </ul>
      {removing && (
        <div className={styles.confirm}>
          <p>{removePersonMessage(removing.name, removing.isGuest, openAssigned(removing.uid))}</p>
          <div className={styles.actions}>
            <Button size="sm" variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button>
            <Button size="sm" variant="danger" disabled={saving} onClick={() => void save(memberIds.filter((id) => id !== removing.uid))}>
              Sí, quitar
            </Button>
          </div>
        </div>
      )}
      {canManage && (
        <div className={styles.add}>
          <Field id="people-add" label="Agregar persona">
            <select id="people-add" className={fieldInputClass} value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Elige a alguien</option>
              {addable.map((m) => <option key={m.uid} value={m.uid}>{m.displayName}{m.role === 'guest' ? ' (Invitado)' : ''}</option>)}
            </select>
          </Field>
          <Button size="sm" disabled={!selected || saving} onClick={() => void save([...memberIds, selected])}>Agregar</Button>
        </div>
      )}
      {canManage && pendingGuests.length > 0 && (
        <p className={styles.pending}>
          Invitaciones pendientes con rol Invitado: {pendingGuests.join(', ')}. Podrás agregarla cuando cree su cuenta.
        </p>
      )}
    </Modal>
  );
}
