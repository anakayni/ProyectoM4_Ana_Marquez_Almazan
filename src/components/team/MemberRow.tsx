import { useState } from 'react';
import { Avatar } from '@/components/layout/Avatar';
import { Button } from '@/components/ui/Button';
import { deactivateMessage } from '@/features/team/members';
import { ROLE_LABEL, type Role, type UserProfile } from '@/types/auth';
import styles from './MemberRow.module.css';

const ROLES: Role[] = ['admin', 'member', 'viewer', 'guest'];

type Props = {
  member: UserProfile;
  isMe: boolean;
  /** Admin mirando a otra persona */
  canManage: boolean;
  openTasks: number;
  /** Solo para Invitados: en qué proyectos está. */
  projectsLabel?: string;
  onRoleChange: (role: Role) => void;
  onActiveChange: (active: boolean) => void;
};

function openLabel(n: number): string {
  if (n === 0) return 'Sin tareas abiertas';
  return n === 1 ? '1 tarea abierta' : `${n} tareas abiertas`;
}

export function MemberRow({ member, isMe, canManage, openTasks, projectsLabel, onRoleChange, onActiveChange }: Props) {
  const [confirming, setConfirming] = useState(false);
  const name = member.displayName;

  return (
    <li className={`${styles.row} ${member.active ? '' : styles.inactive}`}>
      <Avatar name={name} photo={member.photo} inactive={!member.active} />
      <div className={styles.info}>
        <p className={styles.name}>
          {name}
          {isMe && <span className={`${styles.tag} ${styles.me}`}>Tú</span>}
          {!member.active && <span className={styles.tag}>Inactiva</span>}
        </p>
        <p className={styles.email}>{member.email}</p>
        {projectsLabel && <p className={styles.projects}>{projectsLabel}</p>}
      </div>
      <span className={styles.count}>{openLabel(openTasks)}</span>
      {canManage && member.active ? (
        <div className={styles.controls}>
          <select
            className={styles.select} aria-label={`Rol de ${name}`} value={member.role}
            onChange={(e) => onRoleChange(e.target.value as Role)}
          >
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          {!confirming && <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>Desactivar</Button>}
        </div>
      ) : canManage ? (
        <div className={styles.controls}>
          <span className={styles.role}>{ROLE_LABEL[member.role]}</span>
          <Button size="sm" variant="secondary" onClick={() => onActiveChange(true)}>Reactivar</Button>
        </div>
      ) : (
        <span className={styles.role}>{ROLE_LABEL[member.role]}</span>
      )}
      {confirming && (
        <div className={styles.confirm}>
          <p>{deactivateMessage(name, openTasks)}</p>
          <div className={styles.controls}>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
            <Button
              size="sm" variant="danger"
              onClick={() => {
                setConfirming(false);
                onActiveChange(false);
              }}
            >
              Sí, desactivar
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
