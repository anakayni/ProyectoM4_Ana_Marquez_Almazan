import { describe, expect, it } from 'vitest';
import { migrateTask } from '@/features/tasks/migrateTask';

const base = { title: 'Pagar luz', description: '', priority: 'media', dueDate: null, createdAt: 100 };

describe('migrateTask', () => {
  it('formato etapa 1 pendiente → todo, sin responsable ni completado, sube rev', () => {
    const result = migrateTask({ ...base, createdBy: 'ana', updatedBy: 'luis', updatedAt: 200, rev: 3, completed: false });
    expect(result?.action).toBe('update');
    expect(result?.data).toEqual({
      ...base, createdBy: 'ana', updatedBy: 'luis', updatedAt: 200, rev: 4,
      status: 'todo', assigneeId: null, completedBy: null, completedAt: null,
    });
  });

  it('formato etapa 1 completada → done, con el último editor y fecha como aproximación', () => {
    const result = migrateTask({ ...base, createdBy: 'ana', updatedBy: 'luis', updatedAt: 200, rev: 2, completed: true });
    expect(result?.data).toMatchObject({ status: 'done', completedBy: 'luis', completedAt: 200 });
    expect(result?.data).not.toHaveProperty('completed');
  });

  it('formato de producción (userId) → createdBy, updatedBy y rev 1', () => {
    const result = migrateTask({ ...base, userId: 'ana', completed: true });
    expect(result?.action).toBe('create');
    expect(result?.data).toEqual({
      ...base, createdBy: 'ana', updatedBy: 'ana', rev: 1,
      status: 'done', assigneeId: null, completedBy: 'ana', completedAt: 100,
    });
    expect(result?.data).not.toHaveProperty('userId');
  });

  it('una tarea ya migrada no se toca', () => {
    expect(
      migrateTask({ ...base, createdBy: 'ana', updatedBy: 'ana', rev: 2, status: 'doing', assigneeId: 'luis', completedBy: null, completedAt: null }),
    ).toBeNull();
  });
});
