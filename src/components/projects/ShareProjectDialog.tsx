import { useState } from 'react';
import { Avatar } from '@/components/layout/Avatar';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ACCESS_LABEL, guestAccessOf } from '@/features/projects/projectAccess';
import { isNewEmail, peopleRows, removePersonMessage, searchPeople, type PersonRow } from '@/features/projects/projectPeople';
import { usePendingGuestInvitations } from '@/hooks/usePendingGuestInvitations';
import { setProjectMembers, updateProject } from '@/services/projects.service';
import { createInvitation } from '@/services/team.service';
import { ROLE_LABEL, type UserProfile } from '@/types/auth';
import type { GuestAccess, Project } from '@/types/project';
import type { Task } from '@/types/task';
import styles from './ShareProjectDialog.module.css';

type Props = {
  project: Project;
  members: UserProfile[];
  tasks: Task[];
  actorId: string;
  /** Solo el admin agrega, quita, cambia el acceso y elige responsable. */
  canManage: boolean;
  /** Se abrió apenas se creó el proyecto. */
  justCreated?: boolean;
  onClose: () => void;
};

type Confirm = { kind: 'remove' | 'owner'; row: PersonRow } | null;

const ACCESS_OPTIONS: GuestAccess[] = ['view', 'edit'];

/** Quiénes ven y trabajan en el proyecto. Cada cambio se guarda al momento (y queda en la auditoría). */
export function ShareProjectDialog({ project, members, tasks, actorId, canManage, justCreated = false, onClose }: Props) {
  const pendingGuests = usePendingGuestInvitations(canManage);
  const rows = peopleRows(project, members);
  const memberIds = project.memberIds ?? [];
  const link = `${window.location.origin}/projects/${project.id}`;
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const email = query.trim();
  const results = canManage ? searchPeople(project, members, query).slice(0, 6) : [];
  const canInvite = canManage && isNewEmail(email, members, pendingGuests);
  const roleOf = (uid: string) => members.find((m) => m.uid === uid)?.role;
  const openAssigned = (uid: string) =>
    tasks.filter((t) => t.projectId === project.id && t.assigneeId === uid && t.status !== 'done').length;

  async function run(action: () => Promise<unknown>, done?: string) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setConfirm(null);
      if (done) setNotice(done);
    } catch (err) {
      console.error('Error al compartir el proyecto:', err);
      setError('No pudimos guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setNotice('Enlace copiado.');
    } catch {
      setNotice('No pudimos copiarlo: selecciónalo y cópialo a mano.');
    }
  }

  function control(r: PersonRow) {
    if (r.isOwner) return <span className={styles.tag}>Responsable</span>;
    if (r.isGuest) {
      const access = guestAccessOf(project, r.uid) ?? 'edit';
      if (!canManage) return <span className={styles.tag}>{ACCESS_LABEL[access]}</span>;
      return (
        <>
          <select
            className={styles.select} aria-label={`Acceso de ${r.name}`} value={access} disabled={saving}
            onChange={(e) => void run(() => setProjectMembers(actorId, project.id, memberIds, { [r.uid]: e.target.value as GuestAccess }))}
          >
            {ACCESS_OPTIONS.map((a) => <option key={a} value={a}>{ACCESS_LABEL[a]}</option>)}
          </select>
          <Button size="sm" variant="ghost" aria-label={`Quitar a ${r.name}`} onClick={() => setConfirm({ kind: 'remove', row: r })}>Quitar</Button>
        </>
      );
    }
    const role = roleOf(r.uid);
    return (
      <>
        <span className={styles.tag}>{role ? ROLE_LABEL[role] : 'Equipo'}</span>
        {canManage && (
          <>
            <Button size="sm" variant="ghost" aria-label={`Hacer responsable a ${r.name}`} onClick={() => setConfirm({ kind: 'owner', row: r })}>
              Hacer responsable
            </Button>
            <Button size="sm" variant="ghost" aria-label={`Quitar a ${r.name}`} onClick={() => setConfirm({ kind: 'remove', row: r })}>Quitar</Button>
          </>
        )}
      </>
    );
  }

  return (
    <Modal title={justCreated ? '¡Proyecto creado!' : 'Compartir proyecto'} onClose={onClose}>
      <div className={styles.body}>
        <p className={styles.help}>
          {justCreated
            ? `Agrega a las personas que van a trabajar en «${project.name}».`
            : `Quiénes ven y trabajan en «${project.name}». Un Invitado solo ve los proyectos donde está.`}
        </p>
        {error && <Alert kind="error">{error}</Alert>}
        {notice && <p role="status" className={styles.notice}>{notice}</p>}

        <Field id="share-link" label="Enlace del proyecto">
          <div className={styles.linkRow}>
            <input id="share-link" className={fieldInputClass} value={link} readOnly onFocus={(e) => e.target.select()} />
            <Button size="sm" variant="secondary" onClick={() => void copy()}>Copiar</Button>
          </div>
        </Field>

        {canManage && (
          <div className={styles.add}>
            <Field id="share-search" label="Agregar personas">
              <input
                id="share-search" type="search" className={fieldInputClass} placeholder="Nombre o email"
                value={query} onChange={(e) => setQuery(e.target.value)}
              />
            </Field>
            {(results.length > 0 || canInvite) && (
              <ul className={styles.results} aria-label="Personas encontradas">
                {results.map((m) => (
                  <li key={m.uid}>
                    <button
                      type="button" className={styles.result} disabled={saving}
                      onClick={() => void run(async () => {
                        await setProjectMembers(actorId, project.id, [...memberIds, m.uid]);
                        setQuery('');
                      })}
                    >
                      {m.displayName}{m.role === 'guest' ? ' (Invitado)' : ''}
                    </button>
                  </li>
                ))}
                {canInvite && (
                  <li>
                    <button
                      type="button" className={styles.result} disabled={saving}
                      onClick={() => void run(async () => {
                        await createInvitation(actorId, email, 'guest');
                        setQuery('');
                      }, 'Invitación creada. Cuando cree su cuenta, agrégala desde aquí.')}
                    >
                      Invitar a {email} como Invitado
                    </button>
                  </li>
                )}
              </ul>
            )}
            {pendingGuests.length > 0 && (
              <p className={styles.pending}>
                Invitaciones pendientes con rol Invitado: {pendingGuests.join(', ')}. Podrás agregarla cuando cree su cuenta.
              </p>
            )}
          </div>
        )}

        <h3 id="share-people" className={styles.subtitle}>En este proyecto</h3>
        <ul className={styles.list} aria-labelledby="share-people">
          {rows.map((r) => (
            <li key={r.uid} className={styles.row}>
              <Avatar name={r.name} photo={r.photo} inactive={!r.active} />
              <span className={styles.name}>
                {r.name}
                {r.uid === actorId && <span className={styles.you}>Tú</span>}
              </span>
              <span className={styles.control}>{control(r)}</span>
            </li>
          ))}
        </ul>

        {confirm && (
          <div className={styles.confirm}>
            <p>
              {confirm.kind === 'remove'
                ? removePersonMessage(confirm.row.name, confirm.row.isGuest, openAssigned(confirm.row.uid))
                : `¿Hacer responsable a ${confirm.row.name}? Pasará a estar a cargo de «${project.name}».`}
            </p>
            <div className={styles.actions}>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
              {confirm.kind === 'remove' ? (
                <Button
                  size="sm" variant="danger" disabled={saving}
                  onClick={() => void run(() => setProjectMembers(actorId, project.id, memberIds.filter((id) => id !== confirm.row.uid)))}
                >
                  Sí, quitar
                </Button>
              ) : (
                <Button size="sm" disabled={saving} onClick={() => void run(() => updateProject(actorId, project.id, { ownerId: confirm.row.uid }))}>
                  Sí, hacer responsable
                </Button>
              )}
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <Button onClick={onClose}>{justCreated ? 'Ahora no' : 'Listo'}</Button>
        </div>
      </div>
    </Modal>
  );
}
