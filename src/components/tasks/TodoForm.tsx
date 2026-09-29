import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import type { TaskInput } from '@/types/task';
import { DESCRIPTION_MAX, hasErrors, validateTask, type FieldErrors } from '@/utils/validators';
import styles from './TodoForm.module.css';

type TodoFormProps = {
  /** Si se pasa, el formulario funciona en modo edición y no se limpia al guardar. */
  initialValues?: TaskInput;
  submitLabel?: string;
  onSubmit: (values: TaskInput) => Promise<void>;
  onCancel?: () => void;
};

const EMPTY: TaskInput = { title: '', description: '' };

export function TodoForm({ initialValues, submitLabel = 'Agregar tarea', onSubmit, onCancel }: TodoFormProps) {
  const [values, setValues] = useState<TaskInput>(initialValues ?? EMPTY);
  const [errors, setErrors] = useState<FieldErrors<'title' | 'description'>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateTask(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit({ title: values.title.trim(), description: values.description.trim() });
      if (!initialValues) setValues(EMPTY);
    } catch {
      setSubmitError('No pudimos guardar la tarea. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {submitError && <Alert kind="error">{submitError}</Alert>}
      <Field id="task-title" label="Título" error={errors.title}>
        <input
          id="task-title" className={fieldInputClass}
          value={values.title} onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'task-title-error' : undefined}
        />
      </Field>
      <Field id="task-description" label="Descripción" error={errors.description}>
        <textarea
          id="task-description" className={fieldInputClass}
          value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'task-description-error' : undefined}
        />
      </Field>
      <p className={styles.counter}>{values.description.length}/{DESCRIPTION_MAX}</p>
      <div className={styles.actions}>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
