import { useCallback, useState } from 'react';
import { Navigate } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { InviteDialog } from '@/components/team/InviteDialog';
import { MemberRow } from '@/components/team/MemberRow';
import { PendingInvitations } from '@/components/team/PendingInvitations';
import { Button } from '@/components/ui/Button';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { can } from '@/features/auth/permissions';
import { ownedProjects, projectsOfGuest } from '@/features/projects/projectPeople';
import { openTasksByMember } from '@/features/team/members';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { updateMember } from '@/services/team.service';
import type { Role, UserProfile } from '@/types/auth';
import { StickyHeader } from '@/components/layout/StickyHeader';
import styles from './TeamPage.module.css';

export function TeamPage() {
  const { profile } = useAuth();
  // RequireAccess garantiza un perfil activo. El Invitado no ve el equipo (las reglas tampoco se lo dejan leer).
  const me = profile as UserProfile;
  if (!can(me, 'team:view')) return <Navigate to="/tasks" replace />;
  return <TeamView me={me} />;
}

function TeamView({ me }: { me: UserProfile }) {
  const isAdmin = can(me, 'team:manage');
  const members = useTeamMembers();
  const { tasks } = useTasks(me.uid);
  const { projects } = useProjects();
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const openTasks = openTasksByMember(tasks);
  const sorted = [...members].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.displayName.localeCompare(b.displayName),
  );
  const activeCount = members.filter((m) => m.active).length;

  async function change(member: UserProfile, patch: { role?: Role; active?: boolean }, message: string) {
    try {
      await updateMember(me.uid, member.uid, patch);
      setToast({ kind: 'success', message });
    } catch (err) {
      console.error('Error al actualizar integrante:', err);
      setToast({ kind: 'error', message: 'No pudimos guardar el cambio. Inténtalo de nuevo.' });
    }
  }

  const projectsLabel = (member: UserProfile) => {
    if (member.role !== 'guest') return undefined;
    const names = projectsOfGuest(projects, member.uid).map((p) => p.name);
    return names.length > 0 ? `Proyectos: ${names.join(', ')}` : 'Sin proyectos';
  };

  // Un Invitado no puede ser responsable de un proyecto: primero hay que cambiar el responsable.
  function changeRole(member: UserProfile, role: Role) {
    const owned = ownedProjects(projects, member.uid);
    if (role === 'guest' && owned.length > 0) {
      const list = owned.map((p) => `«${p.name}»`).join(', ');
      setToast({ kind: 'error', message: `${member.displayName} es responsable de ${list}: cambia el responsable antes de pasarlo a Invitado.` });
      return;
    }
    void change(member, { role }, `Rol de ${member.displayName} actualizado.`);
  }

  return (
    <>
      <StickyHeader>
        <PageHeader
          title="Equipo"
          subtitle={`${activeCount} ${activeCount === 1 ? 'integrante activo' : 'integrantes activos'}`}
          actions={isAdmin && <Button size="sm" onClick={() => setInviting(true)}>+ Invitar</Button>}
        />
      </StickyHeader>
      <main className={styles.page}>
        <section aria-labelledby="members-title" className={styles.section}>
          <h2 id="members-title" className={styles.title}>Integrantes</h2>
          <ul className={styles.list}>
            {sorted.map((member) => (
              <MemberRow
                key={member.uid}
                member={member}
                isMe={member.uid === me.uid}
                canManage={isAdmin && member.uid !== me.uid}
                openTasks={openTasks.get(member.uid) ?? 0}
                projectsLabel={projectsLabel(member)}
                onRoleChange={(role) => changeRole(member, role)}
                onActiveChange={(active) =>
                  void change(member, { active }, `Acceso ${active ? 'reactivado' : 'desactivado'} para ${member.displayName}.`)
                }
              />
            ))}
          </ul>
        </section>
        {isAdmin && <PendingInvitations adminUid={me.uid} />}
      </main>
      {inviting && <InviteDialog adminUid={me.uid} onClose={() => setInviting(false)} />}
      {toast && <Toast toast={toast} onDismiss={dismissToast} />}
    </>
  );
}
