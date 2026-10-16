import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import type { ProjectOf } from '@/features/projects/projectOf';
import { MAX_SUBTASKS, newSubtask, SUBTASK_TITLE_MAX, subtaskProgress } from '@/features/tasks/subtasks';
import type { AssigneeOption, NameOf } from '@/features/team/members';
import type { Project } from '@/types/project';
import {
  PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL,
  type Priority, type Subtask, type Task, type TaskPatch, type TaskStatus,
} from '@/types/task';
import { formatDay } from '@/utils/formatDate';
import { validateTask } from '@/utils/validators';
import { useTaskNumberFormat } from '@/hooks/useWorkspaceSettings';
import styles from './TaskDetailPanel.module.css';
import { TaskHistory } from './TaskHistory';

type Draft = Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'assigneeId' | 'projectId' | 'subtasks'>;

const FIELDS: (keyof Draft)[] = ['title', 'description', 'status', 'priority', 'dueDate', 'assigneeId', 'projectId', 'subtasks'];

function toDraft(task: Task): Draft {
  return {
    title: task.title, description: task.description, status: task.status, priority: task.priority,
    dueDate: task.dueDate, assigneeId: task.assigneeId, projectId: task.projectId, subtasks: task.subtasks,
  };
}

/** Solo los campos que cambiaron respecto de la tarea guardada. */
function changedFields(task: Task, draft: Draft): TaskPatch {
  const before = toDraft(task);
  const patch: Record<string, unknown> = {};
  for (const field of FIELDS) {
    if (JSON.stringify(before[field]) !== JSON.stringify(draft[field])) patch[field] = draft[field];
  }
  return patch as TaskPatch;
}

type Props = {
  task: Task;
  nameOf: NameOf;
  projectOf: ProjectOf;
  assignees?: AssigneeOption[];
  /** Responsables según el proyecto elegido (si no se pasa, se usa `assignees`). */
  assigneesFor?: (projectId: string | null) => AssigneeOption[];
  projects: Project[];
  /** El Invitado siempre trabaja dentro de un proyecto. */
  projectRequired?: boolean;
  /** El Invitado deja de ver la tarea al terminarla: confirma antes de guardarla como hecha. */
  confirmDone?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSave: (patch: TaskPatch) => Promise<void>;
  onDelete: (id: string) => void;
};

/** Todo sobre una tarea, editable en el lugar: se guarda junto con "Guardar cambios". */
export function TaskDetailPanel({
  task, nameOf, projectOf, assignees = [], assigneesFor, projects, projectRequired = false, confirmDone = false, canEdit, canDelete, onClose, onSave, onDelete,
}: Props) {
  const formatNumber = useTaskNumberFormat();
  const [draft, setDraft] = useState<Draft>(() => toDraft(task));
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<'discard' | 'delete' | 'done' | null>(null);
  const set = (change: Partial<Draft>) => setDraft((d) => ({ ...d, ...change }));
  const patch = changedFields(task, draft);
  const dirty = Object.keys(patch).length > 0;
  const progress = subtaskProgress(draft.subtasks);
  const projectName = (id: string | null) => projectOf(id)?.name ?? null;
  const options = assigneesFor ? assigneesFor(draft.projectId) : assignees;

  function requestClose() {
    if (dirty) setConfirm('discard');
    else onClose();
  }

  function updateSubtask(id: string, change: Partial<Subtask>) {
    set({ subtasks: draft.subtasks.map((s) => (s.id === id ? { ...s, ...change } : s)) });
  }

  function addSubtask() {
    const title = newTitle.trim();
    if (!title || draft.subtasks.length >= MAX_SUBTASKS) return;
    set({ subtasks: [...draft.subtasks, newSubtask(title)] });
    setNewTitle('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const errors = validateTask({ title: draft.title, description: draft.description });
    const problem = errors.title ?? errors.description ?? null;
    setError(problem);
    if (problem || !dirty) return;
    if (confirmDone && draft.status === 'done' && task.status !== 'done') {
      setConfirm('done');
      return;
    }
    await commit();
  }

  async function commit() {
    setConfirm(null);
    setSaving(true);
    try {
      await onSave(patch);
    } catch (err) {
      console.error('Error al guardar la tarea:', err);
      setError('No pudimos guardar los cambios. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={task.title} onClose={requestClose} variant="panel">
      <form className={styles.body} onSubmit={save} noValidate>
        <p className={styles.meta}>
          <span className={styles.number}>{formatNumber(task.number)}</span>
          Creada por {nameOf(task.createdBy) ?? 'alguien'} · {formatDay(task.createdAt)}
          {task.completedAt !== null && ` · Hecha por ${nameOf(task.completedBy) ?? 'alguien'} · ${formatDay(task.completedAt)}`}
        </p>
        {error && <Alert kind="error">{error}</Alert>}

        <fieldset className={styles.fields} disabled={!canEdit}>
          <legend className="visually-hidden">Datos de la tarea</legend>
          <Field id="panel-title" label="Título">
            <input id="panel-title" className={fieldInputClass} maxLength={80} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <div className={styles.grid}>
            <Field id="panel-status" label="Estado">
              <select id="panel-status" className={fieldInputClass} value={draft.status} onChange={(e) => set({ status: e.target.value as TaskStatus })}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </Field>
            <Field id="panel-priority" label="Prioridad">
              <select id="panel-priority" className={fieldInputClass} value={draft.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </Field>
            <Field id="panel-due" label="Vence">
              <input
                id="panel-due" type="date" className={fieldInputClass}
                value={draft.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value || null })}
              />
            </Field>
            <Field id="panel-project" label="Proyecto">
              <select
                id="panel-project" className={fieldInputClass} value={draft.projectId ?? ''}
                onChange={(e) => {
                  const projectId = e.target.value || null;
                  // Si el responsable no puede estar en el nuevo proyecto, se quita.
                  const allowed = !assigneesFor || draft.assigneeId === null || assigneesFor(projectId).some((a) => a.uid === draft.assigneeId);
                  set({ projectId, ...(!allowed && { assigneeId: null }) });
                }}
              >
                {!projectRequired && <option value="">Sin proyecto</option>}
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archived ? ' (archivado)' : ''}</option>)}
              </select>
            </Field>
          </div>
          <Field id="panel-assignee" label="Responsable">
            <select id="panel-assignee" className={fieldInputClass} value={draft.assigneeId ?? ''} onChange={(e) => set({ assigneeId: e.target.value || null })}>
              <option value="">Sin asignar</option>
              {options.map((a) => <option key={a.uid} value={a.uid}>{a.label}</option>)}
            </select>
          </Field>
          <Field id="panel-description" label="Descripción">
            <textarea
              id="panel-description" className={fieldInputClass} maxLength={500}
              value={draft.description} onChange={(e) => set({ description: e.target.value })}
            />
          </Field>

          <section aria-labelledby="subtasks-title" className={styles.subtasks}>
            <h3 id="subtasks-title" className={styles.sectionTitle}>
              <span>Subtareas ({progress.done} de {progress.total})</span>
              {progress.total > 0 && <span className={styles.percent}>{progress.percent}%</span>}
            </h3>
            <ul className={styles.subList}>
              {draft.subtasks.map((s) => (
                <li key={s.id} className={styles.subItem}>
                  <label className={styles.subLabel}>
                    <input type="checkbox" checked={s.done} onChange={(e) => updateSubtask(s.id, { done: e.target.checked })} />
                    <span className={s.done ? styles.subDone : undefined}>{s.title}</span>
                  </label>
                  {canEdit && (
                    <button
                      type="button" className={styles.subRemove} aria-label={`Quitar la subtarea «${s.title}»`}
                      onClick={() => set({ subtasks: draft.subtasks.filter((x) => x.id !== s.id) })}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit &&
              (draft.subtasks.length < MAX_SUBTASKS ? (
                <div className={styles.subAdd}>
                  <label className="visually-hidden" htmlFor="panel-new-subtask">Nueva subtarea</label>
                  <input
                    id="panel-new-subtask" className={fieldInputClass} maxLength={SUBTASK_TITLE_MAX} placeholder="+ Agregar subtarea"
                    value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                  />
                  <Button size="sm" variant="secondary" onClick={addSubtask}>Agregar</Button>
                </div>
              ) : (
                <p className={styles.hint}>Llegaste al máximo de {MAX_SUBTASKS} subtareas.</p>
              ))}
          </section>
        </fieldset>

        {confirm === 'discard' && (
          <div className={styles.confirm} role="group" aria-label="Confirmar descarte">
            <p>¿Descartar los cambios?</p>
            <div className={styles.actions}>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Seguir editando</Button>
              <Button size="sm" variant="danger" onClick={onClose}>Descartar</Button>
            </div>
          </div>
        )}
        {confirm === 'done' && (
          <div className={styles.confirm} role="group" aria-label="Confirmar tarea hecha">
            <p>¿Marcar como hecha? Dejarás de verla: las tareas terminadas solo las ven el admin y los miembros.</p>
            <div className={styles.actions}>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
              <Button size="sm" onClick={() => void commit()}>Sí, marcar</Button>
            </div>
          </div>
        )}
        {confirm === 'delete' && (
          <div className={styles.confirm} role="group" aria-label="Confirmar eliminación">
            <p>¿Eliminar esta tarea? No se puede deshacer.</p>
            <div className={styles.actions}>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancelar</Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(task.id)}>Sí, eliminar</Button>
            </div>
          </div>
        )}

        <div className={styles.footer}>
          {canDelete && <Button size="sm" variant="ghost" className={styles.delete} onClick={() => setConfirm('delete')}>Eliminar</Button>}
          <div className={styles.actions}>
            <Button size="sm" variant="ghost" onClick={requestClose}>Cerrar</Button>
            {canEdit && <Button size="sm" type="submit" loading={saving} disabled={!dirty}>Guardar cambios</Button>}
          </div>
        </div>

        <section aria-labelledby="history-title" className={styles.history}>
          <h3 id="history-title" className={styles.sectionTitle}>Historial</h3>
          <TaskHistory key={task.id} taskId={task.id} nameOf={nameOf} projectNameOf={projectName} />
        </section>
      </form>
    </Modal>
  );
}
