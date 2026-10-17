import { ACCESS_LABEL } from '@/features/projects/projectAccess';
import { DEFAULT_SETTINGS } from '@/features/settings/defaults';
import type { NameOf } from '@/features/team/members';
import { ROLE_LABEL, type Role } from '@/types/auth';
import type { AuditEntry, EntityType, Snapshot } from '@/types/audit';
import type { GuestAccess } from '@/types/project';
import { formatDateLabel } from '@/utils/formatDate';
import { actorName, describeChange, type ProjectNameOf } from './describeChange';
import { diffSnapshots, type FieldChange } from './diffSnapshots';

export type AuditContext = { nameOf: NameOf; projectNameOf: ProjectNameOf; formatNumber: (n: number) => string };
export type AuditDescription = { type: string; subject: string; sentences: string[] };

export const ENTITY_LABEL: Record<EntityType, string> = {
  task: 'Tarea', project: 'Proyecto', user: 'Persona', invitation: 'Invitación', settings: 'Ajustes',
};

const role = (value: unknown) => ROLE_LABEL[value as Role] ?? 'sin rol';
/** Antes de existir la configuración, el espacio usaba los valores por defecto. */
const DEFAULT_SNAPSHOT: Snapshot = { ...DEFAULT_SETTINGS };

/** Frases a partir de las diferencias; si ningún campo "cuenta", una frase genérica. */
function fromDiff(changes: FieldChange[], toSentences: (change: FieldChange) => string[], fallback: string): string[] {
  const result = changes.flatMap(toSentences);
  return result.length > 0 ? result : [fallback];
}

function projectSentences(who: string, entry: AuditEntry, ctx: AuditContext, name: string): string[] {
  if (entry.action === 'create') return [`${who} creó el proyecto «${name}»`];
  if (entry.action === 'delete') return [`${who} eliminó el proyecto «${name}»`];
  return fromDiff(diffSnapshots(entry.before, entry.after), ({ field, from, to }) => {
    switch (field) {
      case 'name':
        return [`${who} cambió el nombre del proyecto de «${String(from)}» a «${String(to)}»`];
      case 'description':
        return [`${who} cambió la descripción del proyecto`];
      case 'color':
        return [`${who} cambió el color del proyecto`];
      case 'ownerId':
        return [`${who} puso a ${ctx.nameOf(String(to)) ?? 'alguien'} a cargo del proyecto`];
      case 'startDate':
        return [to ? `${who} cambió el inicio del proyecto a ${formatDateLabel(String(to))}` : `${who} quitó el inicio del proyecto`];
      case 'endDate':
        return [to ? `${who} cambió el fin del proyecto a ${formatDateLabel(String(to))}` : `${who} quitó el fin del proyecto`];
      case 'archived':
        return [to ? `${who} archivó el proyecto` : `${who} reactivó el proyecto`];
      case 'guestAccess': {
        // Solo quienes estaban y siguen: al agregar a alguien ya alcanza con "agregó a …".
        const before = (from ?? {}) as Record<string, GuestAccess>;
        const after = (to ?? {}) as Record<string, GuestAccess>;
        const stayed = (uid: string) =>
          ((entry.before?.memberIds ?? []) as string[]).includes(uid) && ((entry.after?.memberIds ?? []) as string[]).includes(uid);
        return Object.keys(after)
          .filter((uid) => after[uid] !== before[uid] && stayed(uid))
          .map((uid) => `${who} cambió a ${ctx.nameOf(uid) ?? 'alguien'} a «${ACCESS_LABEL[after[uid]]}» en «${name}»`);
      }
      case 'memberIds': {
        // Personas del proyecto: una frase por cada una que entra o sale.
        const prev = (from ?? []) as string[];
        const next = (to ?? []) as string[];
        const person = (uid: string) => ctx.nameOf(uid) ?? 'alguien';
        return [
          ...next.filter((uid) => !prev.includes(uid)).map((uid) => `${who} agregó a ${person(uid)} al proyecto «${name}»`),
          ...prev.filter((uid) => !next.includes(uid)).map((uid) => `${who} quitó a ${person(uid)} del proyecto «${name}»`),
        ];
      }
      default:
        return [];
    }
  }, `${who} actualizó el proyecto`);
}

function userSentences(who: string, entry: AuditEntry, name: string): string[] {
  if (entry.action === 'create') return [`${name} se unió al equipo`];
  if (entry.action === 'delete') return [`${who} eliminó a ${name}`];
  const self = entry.actorId === entry.entityId;
  return fromDiff(diffSnapshots(entry.before, entry.after), ({ field, from, to }) => {
    switch (field) {
      case 'role':
        return [`${who} cambió el rol de ${name} de ${role(from)} a ${role(to)}`];
      case 'active':
        return [to ? `${who} reactivó el acceso de ${name}` : `${who} desactivó el acceso de ${name}`];
      case 'displayName':
        return [self ? `${who} cambió su nombre a «${String(to)}»` : `${who} cambió el nombre de «${String(from)}» a «${String(to)}»`];
      case 'photo':
        if (to) return [self ? `${who} cambió su foto` : `${who} cambió la foto de ${name}`];
        return [self ? `${who} quitó su foto` : `${who} quitó la foto de ${name}`];
      default:
        return [];
    }
  }, `${who} actualizó el perfil de ${name}`);
}

function invitationSentences(who: string, entry: AuditEntry): string[] {
  const email = entry.entityId;
  if (entry.action === 'create') return [`${who} invitó a ${email} como ${role(entry.after?.role)}`];
  const from = entry.before?.status;
  const to = entry.after?.status;
  if (from !== to && to === 'revoked') return [`${who} canceló la invitación de ${email}`];
  if (from !== to && to === 'accepted') return [`${who} aceptó la invitación`];
  if (from !== to && to === 'pending') return [`${who} volvió a invitar a ${email} como ${role(entry.after?.role)}`];
  return [`${who} actualizó la invitación de ${email}`];
}

function settingsSentences(who: string, entry: AuditEntry): string[] {
  return fromDiff(diffSnapshots(entry.before ?? DEFAULT_SNAPSHOT, entry.after), ({ field, to }) => {
    switch (field) {
      case 'name':
        return [`${who} cambió el nombre del espacio a «${String(to)}»`];
      case 'logo':
        return [to ? `${who} cambió el logo` : `${who} quitó el logo`];
      case 'palette':
        return [`${who} cambió los colores`];
      case 'taskPrefix':
        return [`${who} cambió el prefijo de las tareas a ${String(to)}`];
      default:
        return [];
    }
  }, `${who} guardó los ajustes sin cambios`);
}

/** Qué elemento cambió, en palabras: "FL-12 · Pagar luz", "Portal", "Leo", un email o el espacio. */
function subjectOf(entry: AuditEntry, ctx: AuditContext): string {
  const snap = entry.after ?? entry.before ?? {};
  switch (entry.entityType) {
    case 'task': {
      const title = String(snap.title ?? 'Tarea');
      return typeof snap.number === 'number' ? `${ctx.formatNumber(snap.number)} · ${title}` : title;
    }
    case 'project':
      return String(snap.name ?? 'Proyecto');
    case 'user':
      return String(snap.displayName ?? ctx.nameOf(entry.entityId) ?? 'Persona');
    case 'invitation':
      return entry.entityId;
    case 'settings':
      return 'Espacio de trabajo';
  }
}

/** Una entrada de la auditoría contada para una persona: tipo, elemento y frases. */
export function describeAuditEntry(entry: AuditEntry, ctx: AuditContext): AuditDescription {
  const who = actorName(entry.actorId, ctx.nameOf);
  const subject = subjectOf(entry, ctx);
  const sentences = (() => {
    switch (entry.entityType) {
      case 'task':
        return describeChange(entry, ctx.nameOf, ctx.projectNameOf);
      case 'project':
        return projectSentences(who, entry, ctx, subject);
      case 'user':
        return userSentences(who, entry, subject);
      case 'invitation':
        return invitationSentences(who, entry);
      case 'settings':
        return settingsSentences(who, entry);
    }
  })();
  return { type: ENTITY_LABEL[entry.entityType], subject, sentences };
}
