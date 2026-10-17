import type { AuditAction, AuditEntry } from '@/types/audit';
import { actorName } from './describeChange';
import { describeAuditEntry, type AuditContext } from './describeAuditEntry';

export type AuditCsvRow = { at: number; person: string; type: string; subject: string; action: string; detail: string };

const ACTION_LABEL: Record<AuditAction, string> = { create: 'Creación', update: 'Cambio', delete: 'Eliminación' };
const HEADER = ['Fecha', 'Persona', 'Tipo', 'Elemento', 'Acción', 'Detalle'];
/** Excel en español espera ";" como separador. */
const SEPARATOR = ';';

/**
 * Celda segura: entre comillas, con las comillas internas duplicadas y, si empieza como una fórmula
 * (= + - @, tabulador o retorno), con un apóstrofo delante para que la planilla la muestre como texto.
 */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-13 09:05" en hora local: se ordena bien en una planilla. */
function csvDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function auditCsvRow(entry: AuditEntry, ctx: AuditContext): AuditCsvRow {
  const { type, subject, sentences } = describeAuditEntry(entry, ctx);
  return {
    at: entry.at,
    person: actorName(entry.actorId, ctx.nameOf),
    type,
    subject,
    action: ACTION_LABEL[entry.action],
    detail: sentences.join('; '),
  };
}

/** CSV con BOM (para que Excel lea bien los acentos) y fin de línea de Windows. */
export function auditToCsv(rows: AuditCsvRow[]): string {
  const lines = [HEADER, ...rows.map((r) => [csvDate(r.at), r.person, r.type, r.subject, r.action, r.detail])];
  return `﻿${lines.map((cells) => cells.map(csvCell).join(SEPARATOR)).join('\r\n')}\r\n`;
}
