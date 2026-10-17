import { Modal } from '@/components/ui/Modal';
import type { ToastMessage } from '@/components/ui/Toast';
import { can } from '@/features/auth/permissions';
import { canEditInProject } from '@/features/projects/projectAccess';
import { makeProjectOf } from '@/features/projects/projectOf';
import { assigneeOptions, makeNameOf, unknownPersonFor } from '@/features/team/members';
import type { useTasks } from '@/hooks/useTasks';
import type { UserProfile } from '@/types/auth';
import type { Project } from '@/types/project';
import type { NewTask, Task, TaskInput } from '@/types/task';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TodoForm } from './TodoForm';

type TaskDialogsProps = {
  profile: UserProfile;
  /** Lista viva: si la tarea abierta se borra, el panel se cierra solo */
  tasks: Task[];
  members: UserProfile[];
  projects: Project[];
  openId: string | null;
  onCloseTask: () => void;
  /** Valores iniciales de "Nueva tarea" (p. ej. proyecto o vencimiento); null = ventana cerrada */
  /** Valores iniciales de "Nueva tarea" (con `status` si se abrió desde una columna del tablero). */
  creating: Partial<NewTask> | null;
  onCloseCreate: () => void;
  actions: Pick<ReturnType<typeof useTasks>, 'create' | 'update' | 'remove'>;
  onToast: (toast: ToastMessage) => void;
};

/** Panel de una tarea y ventana "Nueva tarea", compartidos por Mis tareas, cada proyecto y el Calendario. */
export function TaskDialogs({
  profile, tasks, members, projects, openId, onCloseTask, creating, onCloseCreate, actions, onToast,
}: TaskDialogsProps) {
  const openTask = tasks.find((t) => t.id === openId) ?? null;
  const nameOf = makeNameOf(members, unknownPersonFor(profile.role));
  const projectOf = makeProjectOf(projects);
  const isGuest = profile.role === 'guest';
  /** El Invitado trabaja solo en sus proyectos donde "Puede editar"; el resto, según su rol. */
  const editableHere = (project: Project | null) => canEditInProject(profile.role, profile.uid, project);
  /** Responsables posibles según el proyecto elegido en el formulario y quién asigna. */
  const assigneesFor = (currentId: string | null) => (projectId: string | null) =>
    assigneeOptions(members, currentId, { project: projects.find((p) => p.id === projectId) ?? null, actorRole: profile.role });

  async function handleCreate(values: TaskInput) {
    await actions.create({ ...values, ...(creating?.status && { status: creating.status }) }); // si falla, TodoForm muestra el error
    onCloseCreate();
    onToast({ kind: 'success', message: 'Tarea creada.' });
  }

  return (
    <>
      {openTask && (
        <TaskDetailPanel
          key={openTask.id}
          task={openTask}
          nameOf={nameOf}
          projectOf={projectOf}
          assigneesFor={assigneesFor(openTask.assigneeId)}
          projects={projects.filter((p) => p.id === openTask.projectId || (!p.archived && editableHere(p)))}
          projectRequired={isGuest}
          confirmDone={isGuest}
          canEdit={editableHere(projectOf(openTask.projectId))}
          canDelete={can(profile, 'task:delete', { createdBy: openTask.createdBy }) && editableHere(projectOf(openTask.projectId))}
          onClose={onCloseTask}
          onSave={async (patch) => {
            await actions.update(openTask.id, patch); // si falla, el panel muestra el error
            onToast({ kind: 'success', message: 'Cambios guardados.' });
          }}
          onDelete={(id) => {
            onCloseTask();
            actions.remove(id).then(
              () => onToast({ kind: 'success', message: 'Tarea eliminada.' }),
              (err: unknown) => {
                console.error('Error al eliminar la tarea:', err);
                onToast({ kind: 'error', message: 'No pudimos eliminar la tarea. Inténtalo de nuevo.' });
              },
            );
          }}
        />
      )}

      {creating && (
        <Modal title="Nueva tarea" onClose={onCloseCreate}>
          <TodoForm
            // Empieza asignada a quien la crea: si no, desaparecería de "Mías" al guardarla.
            initialValues={{ title: '', description: '', priority: 'media', dueDate: null, assigneeId: profile.uid, projectId: isGuest && projects.length === 1 ? projects[0].id : null, ...creating }}
            submitLabel="Crear tarea"
            assigneesFor={assigneesFor(profile.uid)}
            projects={projects.filter((p) => !p.archived && editableHere(p))}
            projectRequired={isGuest}
            onSubmit={handleCreate}
            onCancel={onCloseCreate}
          />
        </Modal>
      )}
    </>
  );
}
