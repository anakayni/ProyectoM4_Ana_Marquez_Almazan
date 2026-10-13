import { Modal } from '@/components/ui/Modal';
import { fieldLabel, formatAuditValue } from '@/features/audit/auditFields';
import { actorName } from '@/features/audit/describeChange';
import { describeAuditEntry, type AuditContext } from '@/features/audit/describeAuditEntry';
import { diffSnapshots } from '@/features/audit/diffSnapshots';
import type { AuditEntry } from '@/types/audit';
import { formatDateTime } from '@/utils/formatDate';
import styles from './AuditEntryDialog.module.css';

type Props = { entry: AuditEntry; ctx: AuditContext; onClose: () => void };

/** Detalle de un cambio: quién, cuándo, las frases y cada campo antes → después. */
export function AuditEntryDialog({ entry, ctx, onClose }: Props) {
  const { type, subject, sentences } = describeAuditEntry(entry, ctx);
  const changes = diffSnapshots(entry.before, entry.after);
  return (
    <Modal title="Detalle del cambio" onClose={onClose}>
      <dl className={styles.facts}>
        <dt>Quién</dt>
        <dd>{actorName(entry.actorId, ctx.nameOf)}</dd>
        <dt>Cuándo</dt>
        <dd>{formatDateTime(entry.at)}</dd>
        <dt>{type}</dt>
        <dd>{subject}</dd>
      </dl>
      <ul className={styles.sentences}>
        {sentences.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      {changes.length > 0 && (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className="visually-hidden">Valores antes y después del cambio</caption>
            <thead>
              <tr><th scope="col">Campo</th><th scope="col">Antes</th><th scope="col">Después</th></tr>
            </thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.field}>
                  <th scope="row">{fieldLabel(c.field)}</th>
                  <td>{formatAuditValue(c.field, c.from, ctx)}</td>
                  <td>{formatAuditValue(c.field, c.to, ctx)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
