import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { inviteLink } from '@/features/team/inviteLink';
import { InvitationError, revokeInvitation, subscribeToInvitations } from '@/services/team.service';
import { ROLE_LABEL } from '@/types/auth';
import type { Invitation } from '@/types/invitation';
import { formatRelative } from '@/utils/formatDate';
import styles from './PendingInvitations.module.css';

/** Invitaciones que todavía nadie aceptó (solo el admin las puede leer). */
export function PendingInvitations({ adminUid }: { adminUid: string }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeToInvitations(setInvitations, (err) => {
        console.error('Error al leer invitaciones:', err);
        setError('No pudimos cargar las invitaciones.');
      }),
    [],
  );

  const pending = invitations.filter((inv) => inv.status === 'pending');

  async function copy(email: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(window.location.origin, email));
      setCopied(email);
    } catch {
      setError('No pudimos copiar el link. Selecciónalo y cópialo a mano.');
    }
  }

  async function revoke(email: string) {
    setError(null);
    try {
      await revokeInvitation(adminUid, email);
    } catch (err) {
      console.error('Error al cancelar la invitación:', err);
      setError(err instanceof InvitationError ? err.message : 'No pudimos cancelar la invitación.');
    }
  }

  return (
    <section aria-labelledby="invitations-title" className={styles.section}>
      <h2 id="invitations-title" className={styles.title}>Invitaciones pendientes</h2>
      {error && <Alert kind="error">{error}</Alert>}
      {pending.length === 0 ? (
        <p className={styles.empty}>No hay invitaciones pendientes.</p>
      ) : (
        <ul className={styles.list}>
          {pending.map((inv) => (
            <li key={inv.email} className={styles.item}>
              <div className={styles.body}>
                <span className={styles.email}>{inv.email}</span>
                <span className={styles.meta}>{ROLE_LABEL[inv.role]} · invitada {formatRelative(inv.createdAt)}</span>
              </div>
              <div className={styles.actions}>
                <Button size="sm" variant="ghost" onClick={() => void copy(inv.email)}>
                  {copied === inv.email ? 'Link copiado' : 'Copiar link'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void revoke(inv.email)}>Cancelar</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
