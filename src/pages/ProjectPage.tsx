import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { ProjectPeople } from '@/components/projects/ProjectPeople';
import { TaskWorkspace } from '@/components/tasks/TaskWorkspace';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { can, seesDoneTasks } from '@/features/auth/permissions';
import { openTasksLabel, projectOpenSummary, projectProgress } from '@/features/projects/projectProgress';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { deleteProject, updateProject } from '@/services/projects.service';
import type { UserProfile } from '@/types/auth';
import { formatDateLabel, toDateInputValue } from '@/utils/formatDate';
import styles from './ProjectPage.module.css';

type Confirm = 'archive' | 'delete' | null;

/** Un proyecto: encabezado con sus datos y acciones, y debajo sus tareas con las mismas vistas de Mis tareas. */
export function ProjectPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const me = profile as UserProfile; // RequireAccess garantiza un perfil activo
  const { projects, loading } = useProjects();
  const { tasks } = useTasks(me.uid);
  const members = useTeamMembers();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const [today] = useState(() => toDateInputValue(new Date()));

  const project = projects.find((p) => p.id === id);
  if (loading) return <Spinner label="Cargando proyecto…" />;
  if (!project) {
    return (
      <main className={styles.missing}>
        <p>Este proyecto no existe o fue eliminado.</p>
        <Link to="/projects">Volver a Proyectos</Link>
      </main>
    );
  }

  const canEdit = can(me, 'project:edit');
  const isAdmin = can(me, 'team:manage');
  const own = tasks.filter((t) => t.projectId === project.id);
  const progress = projectProgress(own, project.endDate, today);
  // Lector e Invitado no ven las hechas: en lugar del avance, cuánto falta.
  const showDone = seesDoneTasks(me.role);
  const openSummary = projectOpenSummary(own, project.endDate, today);
  const late = showDone ? progress.late : openSummary.late;

  async function run(action: () => Promise<void>, onDone?: () => void) {
    setError(null);
    try {
      await action();
      setConfirm(null);
      onDone?.();
    } catch (err) {
      console.error('Error en el proyecto:', err);
      setError('No pudimos guardar el cambio. Inténtalo de nuevo.');
    }
  }

  const header = (newTaskButton: ReactNode) => (
    <header className={styles.header} style={{ '--project-color': project.color } as CSSProperties}>
      <Link to="/projects" className={styles.back}>← Proyectos</Link>
      <div className={styles.top}>
        <h1 className={styles.title}><span className={styles.dot} aria-hidden="true" />{project.name}</h1>
        <div className={styles.actions}>
          {canEdit && <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Editar</Button>}
          {canEdit &&
            (project.archived ? (
              <Button size="sm" variant="secondary" onClick={() => void run(() => updateProject(me.uid, project.id, { archived: false }))}>
                Reactivar
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setConfirm('archive')}>Archivar</Button>
            ))}
          {isAdmin && <Button size="sm" variant="ghost" onClick={() => setConfirm('delete')}>Eliminar</Button>}
          {!project.archived && newTaskButton}
        </div>
      </div>
      {project.description && <p className={styles.description}>{project.description}</p>}
      <ul className={styles.facts} aria-label="Datos del proyecto">
        <li>
          <span className={styles.factLabel}>Fechas</span>
          <span className={styles.factValue}>
            {formatDateLabel(project.startDate)} → <span className={late ? styles.late : undefined}>{formatDateLabel(project.endDate)}</span>
            {late && <span className={styles.chip}>Atrasado</span>}
            {project.archived && <span className={styles.archived}>Archivado</span>}
          </span>
        </li>
        <li>
          <span className={styles.factLabel}>Avance</span>
          <span className={styles.factValue}>
            {showDone ? `${progress.percent}% · ${progress.done} de ${progress.total} hechas` : openTasksLabel(openSummary.open)}
          </span>
        </li>
        <li>
          <span className={styles.factLabel}>Personas del proyecto</span>
          <ProjectPeople project={project} members={members} tasks={tasks} actorId={me.uid} canManage={can(me, 'project:people')} bare />
        </li>
      </ul>
      {error && <Alert kind="error">{error}</Alert>}
      {confirm && (
        <div className={styles.confirm}>
          <p>
            {confirm === 'archive'
              ? `¿Archivar "${project.name}"? Ya no se podrán agregar tareas; puedes reactivarlo cuando quieras.`
              : `¿Eliminar "${project.name}"? No se puede deshacer; sus tareas quedarán "Sin proyecto".`}
          </p>
          <div className={styles.actions}>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
            {confirm === 'archive' ? (
              <Button size="sm" variant="danger" onClick={() => void run(() => updateProject(me.uid, project.id, { archived: true }))}>
                Sí, archivar
              </Button>
            ) : (
              <Button
                size="sm" variant="danger"
                onClick={() => void run(() => deleteProject(me.uid, project.id), () => navigate('/projects'))}
              >
                Sí, eliminar
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );

  return (
    <>
      <TaskWorkspace profile={me} projectId={project.id} renderHeader={header} />
      {editing && <ProjectDialog actorId={me.uid} project={project} members={members} onClose={() => setEditing(false)} />}
    </>
  );
}
