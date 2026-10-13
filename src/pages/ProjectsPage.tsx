import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Spinner } from '@/components/ui/Spinner';
import { can } from '@/features/auth/permissions';
import { projectProgress } from '@/features/projects/projectProgress';
import { makePersonOf, unknownPersonFor } from '@/features/team/members';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { UserProfile } from '@/types/auth';
import { toDateInputValue } from '@/utils/formatDate';
import { StickyHeader } from '@/components/layout/StickyHeader';
import styles from './ProjectsPage.module.css';

type Filter = 'active' | 'archived';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function ProjectsPage() {
  const { profile } = useAuth();
  const me = profile as UserProfile; // RequireAccess garantiza un perfil activo
  const { projects, loading, error } = useProjects();
  const { tasks } = useTasks(me.uid);
  const members = useTeamMembers();
  const [filter, setFilter] = useState<Filter>('active');
  const [creating, setCreating] = useState(false);
  // "Hoy" se fija al abrir la página (para saber qué proyecto está atrasado).
  const [today] = useState(() => toDateInputValue(new Date()));

  const personOf = makePersonOf(members, unknownPersonFor(me.role));
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const shown = filter === 'active' ? active : archived;

  return (
    <>
      <StickyHeader>
        <PageHeader
          title="Proyectos"
          subtitle={`${plural(active.length, 'activo', 'activos')} · ${plural(archived.length, 'archivado', 'archivados')}`}
          actions={can(me, 'project:create') && <Button size="sm" onClick={() => setCreating(true)}>+ Nuevo proyecto</Button>}
        />
        <div className={styles.bars}>
          <SegmentedControl
            label="Mostrar" name="project-filter" value={filter} onChange={setFilter}
            options={[{ value: 'active', label: 'Activos' }, { value: 'archived', label: 'Archivados' }]}
          />
        </div>
      </StickyHeader>
      <main className={styles.page}>
        {loading && <Spinner label="Cargando proyectos…" />}
        {error && <Alert kind="error">{error}</Alert>}
        {!loading && !error && shown.length === 0 && (
          <p className={styles.empty}>{filter === 'active' ? 'Todavía no hay proyectos activos.' : 'No hay proyectos archivados.'}</p>
        )}
        <ul className={styles.grid}>
          {shown.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              progress={projectProgress(tasks.filter((t) => t.projectId === project.id), project.endDate, today)}
              owner={personOf(project.ownerId)}
            />
          ))}
        </ul>
      </main>
      {creating && <ProjectDialog actorId={me.uid} members={members} onClose={() => setCreating(false)} />}
    </>
  );
}
