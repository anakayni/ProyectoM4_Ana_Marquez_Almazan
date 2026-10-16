import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { assigneeOptions } from '@/features/team/members';
import { createProject, updateProject } from '@/services/projects.service';
import type { UserProfile } from '@/types/auth';
import type { Project, ProjectInput } from '@/types/project';
import { ColorPicker, PALETTE } from './ColorPicker';
import styles from './ProjectDialog.module.css';

/** `onCreated`: recibe el id del proyecto nuevo (para abrir "Compartir proyecto"). */
type Props = { actorId: string; project?: Project; members: UserProfile[]; onClose: () => void; onCreated?: (id: string) => void };

/** Crear o editar un proyecto. */
export function ProjectDialog({ actorId, project, members, onClose, onCreated }: Props) {
  const [values, setValues] = useState<ProjectInput>(
    project
      ? {
          name: project.name, description: project.description, color: project.color,
          ownerId: project.ownerId, startDate: project.startDate, endDate: project.endDate,
        }
      : { name: '', description: '', color: PALETTE[0], ownerId: actorId, startDate: '', endDate: '' },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<ProjectInput>) => setValues((v) => ({ ...v, ...patch }));

  function validate(): string | null {
    if (!values.name.trim()) return 'Ingresa el nombre del proyecto.';
    if (!values.startDate || !values.endDate) return 'Elige las fechas de inicio y fin.';
    if (values.endDate < values.startDate) return 'La fecha de fin no puede ser anterior al inicio.';
    return null;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      if (project) await updateProject(actorId, project.id, values);
      else {
        // Primero se crea (siempre) y después se avisa, si alguien quiere saber el id.
        const id = await createProject(actorId, values);
        onCreated?.(id);
      }
      onClose();
    } catch (err) {
      console.error('Error al guardar el proyecto:', err);
      setError('No pudimos guardar el proyecto. Inténtalo de nuevo.');
      setSaving(false);
    }
  }

  return (
    <Modal title={project ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={onClose}>
      <form className={styles.form} onSubmit={save} noValidate>
        {error && <Alert kind="error">{error}</Alert>}
        <Field id="project-name" label="Nombre">
          <input id="project-name" className={fieldInputClass} maxLength={80} value={values.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field id="project-description" label="Descripción">
          <textarea
            id="project-description" className={fieldInputClass} maxLength={500}
            value={values.description} onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <div className={styles.row}>
          <Field id="project-start" label="Inicio">
            <input id="project-start" type="date" className={fieldInputClass} value={values.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </Field>
          <Field id="project-end" label="Fin">
            <input id="project-end" type="date" className={fieldInputClass} value={values.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </Field>
        </div>
        <Field id="project-owner" label="A cargo">
          <select id="project-owner" className={fieldInputClass} value={values.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
            {assigneeOptions(members, values.ownerId).map((m) => <option key={m.uid} value={m.uid}>{m.label}</option>)}
          </select>
        </Field>
        <ColorPicker value={values.color} onChange={(color) => set({ color })} />
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{project ? 'Guardar cambios' : 'Crear proyecto'}</Button>
        </div>
      </form>
    </Modal>
  );
}
