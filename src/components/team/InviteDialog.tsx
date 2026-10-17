import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { inviteLink } from '@/features/team/inviteLink';
import { createInvitation, InvitationError } from '@/services/team.service';
import { ROLE_LABEL, type Role } from '@/types/auth';
import { validateEmail } from '@/utils/validators';
import styles from './InviteDialog.module.css';

const ROLES: Role[] = ['member', 'viewer', 'guest', 'admin'];

/** Invitar por email: crea la invitación y muestra el link para compartir. */
export function InviteDialog({ adminUid, onClose }: { adminUid: string; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validateEmail(email);
    setEmailError(problem);
    if (problem) return;
    setError(null);
    setSubmitting(true);
    try {
      setCreated(await createInvitation(adminUid, email, role));
    } catch (err) {
      if (err instanceof InvitationError) {
        setError(err.message);
      } else {
        console.error('Error al invitar:', err);
        setError('No pudimos crear la invitación. Inténtalo de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError('No pudimos copiar el link. Selecciónalo y cópialo a mano.');
    }
  }

  if (created) {
    const link = inviteLink(window.location.origin, created);
    return (
      <Modal title="Invitación creada" onClose={onClose}>
        <div className={styles.created}>
          {error && <Alert kind="error">{error}</Alert>}
          <p>Comparte este link con {created}. Debe registrarse con ese mismo email.</p>
          <code className={styles.link}>{link}</code>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => void copy(link)}>{copied ? 'Link copiado' : 'Copiar link'}</Button>
            <Button onClick={onClose}>Listo</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Invitar a alguien" onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error && <Alert kind="error">{error}</Alert>}
        <Field id="invite-email" label="Email" error={emailError}>
          <input
            id="invite-email" type="email" autoComplete="off" className={fieldInputClass}
            value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'invite-email-error' : undefined}
          />
        </Field>
        <Field id="invite-role" label="Rol">
          <select id="invite-role" className={fieldInputClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          {role === 'guest' && <p className={styles.hint}>Solo ve los proyectos a los que lo agregues.</p>}
        </Field>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={submitting}>Invitar</Button>
        </div>
      </form>
    </Modal>
  );
}
