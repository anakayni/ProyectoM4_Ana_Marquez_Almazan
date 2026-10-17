import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { ShareProjectDialog } from '@/components/projects/ShareProjectDialog';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ViewTabs } from '@/components/ui/ViewTabs';
import { Spinner } from '@/components/ui/Spinner';
import { can, seesDoneTasks } from '@/features/auth/permissions';
import { peopleRows, searchProjects } from '@/features/projects/projectPeople';
import { projectOpenSummary, projectProgress } from '@/features/projects/projectProgress';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { UserProfile } from '@/types/auth';
import { toDateInputValue } from '@/utils/formatDate';
import { StickyHeader } from '@/components/layout/StickyHeader';
import { NoProjectsYet } from '@/components/projects/NoProjectsYet';
import styles from './ProjectsPage.module.css';

type Filter = 'active' | 'archived';

export function ProjectsPage() {
  const { profile } = useAuth();
  const me = profile as UserProfile; // RequireAccess garantiza un perfil activo
  const { projects, loading, error } = useProjects();
  const { tasks } = useTasks(me.uid);
  const members = useTeamMembers();
  const [filter, setFilter] = useState<Filter>('active');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  // "Hoy" se fija al abrir la página (para saber qué proyecto está atrasado).
  const [today] = useState(() => toDateInputValue(new Date()));

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const shown = searchProjects(filter === 'active' ? active : archived, query);

  // Aparece cuando la lista en tiempo real ya trae el proyecto recién creado.
  const sharingProject = sharingId ? projects.find((p) => p.id === sharingId) ?? null : null;

  return (
    <>
      <StickyHeader>
        <PageHeader
          title="Proyectos"
          description="Fechas, avance y quiénes trabajan en cada uno."
          actions={can(me, 'project:create') && <Button size="sm" onClick={() => setCreating(true)}>+ Nuevo proyecto</Button>}
        />
        <div className={styles.bar}>
          <ViewTabs
            label="Mostrar" name="project-filter" value={filter} onChange={setFilter}
            options={[{ value: 'active', label: 'Activos', count: active.length }, { value: 'archived', label: 'Archivados', count: archived.length }]}
          />
          <div className={styles.tools}>
            <label className="visually-hidden" htmlFor="project-search">Buscar proyecto</label>
            <input
              id="project-search" type="search" className={styles.search} placeholder="Buscar proyecto…"
              value={query} onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </StickyHeader>
      <main className={styles.page}>
        {loading && <Spinner label="Cargando proyectos…" />}
        {error && <Alert kind="error">{error}</Alert>}
        {!loading && !error && me.role === 'guest' && projects.length === 0 && <NoProjectsYet />}
        {!loading && !error && shown.length === 0 && !(me.role === 'guest' && projects.length === 0) && (
          <p className={styles.empty}>
            {query.trim() ? 'No encontramos proyectos con ese nombre.' : filter === 'active' ? 'Todavía no hay proyectos activos.' : 'No hay proyectos archivados.'}
          </p>
        )}
        <ul className={styles.grid}>
          {shown.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              progress={projectProgress(tasks.filter((t) => t.projectId === project.id), project.endDate, today)}
              showDone={seesDoneTasks(me.role)}
              open={projectOpenSummary(tasks.filter((t) => t.projectId === project.id), project.endDate, today)}
              people={peopleRows(project, members)}
            />
          ))}
        </ul>
      </main>
      {creating && (
        <ProjectDialog
          actorId={me.uid} members={members} onClose={() => setCreating(false)}
          // El admin agrega a las personas apenas crea el proyecto.
          onCreated={can(me, 'project:people') ? setSharingId : undefined}
        />
      )}
      {sharingProject && (
        <ShareProjectDialog
          project={sharingProject} members={members} tasks={tasks} actorId={me.uid} canManage justCreated
          onClose={() => setSharingId(null)}
        />
      )}
    </>
  );
}
