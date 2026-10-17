import { describe, expect, it } from 'vitest';
import { migrateTask } from '@/features/tasks/migrateTask';

const base = { title: 'Pagar luz', description: '', priority: 'media', dueDate: null, createdAt: 100 };

describe('migrateTask', () => {
  it('formato etapa 1 pendiente → todo, sin responsable ni completado, sube rev', () => {
    const result = migrateTask({ ...base, createdBy: 'ana', updatedBy: 'luis', updatedAt: 200, rev: 3, completed: false }, 1);
    expect(result?.action).toBe('update');
    expect(result?.data).toEqual({
      ...base, createdBy: 'ana', updatedBy: 'luis', updatedAt: 200, rev: 4,
      status: 'todo', assigneeId: null, completedBy: null, completedAt: null, projectId: null, number: 1, subtasks: [],
    });
  });

  it('formato etapa 1 completada → done, con el último editor y fecha como aproximación', () => {
    const result = migrateTask({ ...base, createdBy: 'ana', updatedBy: 'luis', updatedAt: 200, rev: 2, completed: true }, 1);
    expect(result?.data).toMatchObject({ status: 'done', completedBy: 'luis', completedAt: 200 });
    expect(result?.data).not.toHaveProperty('completed');
  });

  it('formato de producción (userId) → createdBy, updatedBy y rev 1', () => {
    const result = migrateTask({ ...base, userId: 'ana', completed: true }, 1);
    expect(result?.action).toBe('create');
    expect(result?.data).toEqual({
      ...base, createdBy: 'ana', updatedBy: 'ana', rev: 1,
      status: 'done', assigneeId: null, completedBy: 'ana', completedAt: 100, projectId: null, number: 1, subtasks: [],
    });
    expect(result?.data).not.toHaveProperty('userId');
  });

  it('una tarea ya migrada no se toca', () => {
    expect(
      migrateTask({ ...base, createdBy: 'ana', updatedBy: 'ana', rev: 2, status: 'doing', assigneeId: 'luis', completedBy: null, completedAt: null, projectId: null, number: 4, subtasks: [] }, 1),
    ).toBeNull();
  });

  it('una tarea de la etapa 3 sin proyecto recibe projectId: null', () => {
    const result = migrateTask({
      ...base, createdBy: 'ana', updatedBy: 'ana', rev: 2, status: 'todo', assigneeId: null, completedBy: null, completedAt: null,
    }, 1);
    expect(result?.data).toMatchObject({ projectId: null, rev: 3 });
  });

  it('conserva el número que ya tenía y agrega subtareas vacías', () => {
    const result = migrateTask({
      ...base, createdBy: 'ana', updatedBy: 'ana', rev: 2, status: 'todo', assigneeId: null, completedBy: null,
      completedAt: null, projectId: null, number: 7,
    }, 50);
    expect(result?.data).toMatchObject({ number: 7, subtasks: [] });
  });

  it('formato de producción: el dueño queda como responsable si todavía tiene cuenta', () => {
    const known = new Set(['ana']);
    expect(migrateTask({ ...base, userId: 'ana', completed: false }, 1, known)?.data.assigneeId).toBe('ana');
    const orphan = migrateTask({ ...base, userId: 'borrado', completed: false }, 1, known);
    expect(orphan?.data.assigneeId).toBeNull();
    expect(orphan?.data.createdBy).toBe('borrado');
  });

  it('sin la lista de cuentas, como antes: sin responsable', () => {
    expect(migrateTask({ ...base, userId: 'ana', completed: false }, 1)?.data.assigneeId).toBeNull();
  });
});
