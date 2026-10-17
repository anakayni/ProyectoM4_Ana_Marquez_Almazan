import type { Snapshot } from '@/types/audit';

export type FieldChange = { field: string; from: unknown; to: unknown };

/** Campos que cambian en cada escritura y no aportan al historial. */
const IGNORED = new Set(['rev', 'updatedAt', 'updatedBy']);

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Diferencias campo a campo entre dos fotos de un documento (null = no existía / fue borrado). */
export function diffSnapshots(before: Snapshot | null, after: Snapshot | null): FieldChange[] {
  const fields = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return [...fields]
    .filter((field) => !IGNORED.has(field))
    .map((field) => ({ field, from: before?.[field] ?? null, to: after?.[field] ?? null }))
    .filter((change) => !same(change.from, change.to))
    .sort((a, b) => a.field.localeCompare(b.field));
}
