import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { inviteLink } from '@/features/team/inviteLink';
import { useAuth } from '@/hooks/useAuth';
import { createInvitation, InvitationError, revokeInvitation, subscribeToInvitations } from '@/services/team.service';
import { ROLE_LABEL, type Role, type UserProfile } from '@/types/auth';
import { INVITATION_STATUS_LABEL, type Invitation } from '@/types/invitation';
import { validateEmail } from '@/utils/validators';
import styles from './InvitePage.module.css';

const ROLES: Role[] = ['member', 'viewer', 'admin'];

/** Invitaciones del equipo (la sección Equipo completa llega en la etapa 4). */
export function InvitePage() {
  const { profile } = useAuth();
  const admin = profile as UserProfile; // AdminRoute garantiza un admin activo
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(
    () =>
      subscribeToInvitations(setInvitations, (err) => {
        console.error('Error al leer invitaciones:', err);
        setError('No pudimos cargar las invitaciones.');
      }),
    [],
  );

  const linkFor = (invited: string) => inviteLink(window.location.origin, invited);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validateEmail(email);
    setEmailError(problem);
    if (problem) return;

    setError(null);
    setCreated(null);
    setSubmitting(true);
    try {
      const invited = await createInvitation(admin.uid, email, role);
      setCreated(invited);
      setEmail('');
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

  async function copy(invited: string) {
    try {
      await navigator.clipboard.writeText(linkFor(invited));
      setCopied(invited);
    } catch {
      setError('No pudimos copiar el link. Selecciónalo y cópialo a mano.');
    }
  }

  async function revoke(invited: string) {
    setError(null);
    try {
      await revokeInvitation(admin.uid, invited);
    } catch (err) {
      console.error('Error al cancelar la invitación:', err);
      setError(err instanceof InvitationError ? err.message : 'No pudimos cancelar la invitación.');
    }
  }

  return (
    <>
      <PageHeader
        title="Equipo"
        subtitle="Solo pueden entrar las personas que invites. Comparte el link con ellas: deben registrarse con el mismo email."
      />
      <main className={styles.page}>
        <section className={styles.card} aria-labelledby="invite-title">
          <h2 id="invite-title" className={styles.sectionTitle}>Nueva invitación</h2>
          {error && <Alert kind="error">{error}</Alert>}
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
            </Field>
            <Button type="submit" loading={submitting}>Invitar</Button>
          </form>

          {created && (
            <div className={styles.created}>
              <Alert kind="success">Invitación creada para {created}. Comparte este link:</Alert>
              <code className={styles.link}>{linkFor(created)}</code>
              <Button size="sm" variant="secondary" onClick={() => void copy(created)}>
                {copied === created ? 'Link copiado' : 'Copiar link'}
              </Button>
            </div>
          )}
        </section>

        <section aria-labelledby="list-title">
          <h2 id="list-title" className={styles.sectionTitle}>Invitaciones</h2>
          {invitations.length === 0 ? (
            <p className={styles.empty}>Todavía no invitaste a nadie.</p>
          ) : (
            <ul className={styles.list}>
              {invitations.map((inv) => (
                <li key={inv.email} className={styles.item}>
                  <div className={styles.itemBody}>
                    <span className={styles.email}>{inv.email}</span>
                    <span className={styles.meta}>
                      {ROLE_LABEL[inv.role]} · <span className={styles[inv.status]}>{INVITATION_STATUS_LABEL[inv.status]}</span>
                    </span>
                  </div>
                  {inv.status === 'pending' && (
                    <div className={styles.itemActions}>
                      <Button size="sm" variant="ghost" onClick={() => void copy(inv.email)}>
                        {copied === inv.email ? 'Link copiado' : 'Copiar link'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void revoke(inv.email)}>Cancelar</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
