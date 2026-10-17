import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { WorkspaceSettings } from '@/features/settings/defaults';
import { auditEntry, auditRef } from './audit';

/** Guarda los ajustes (solo admin): crea el documento la primera vez y deja la auditoría. */
export async function saveSettings(db: Firestore, actorId: string, values: WorkspaceSettings): Promise<void> {
  const ref = doc(db, 'settings', 'workspace');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const before = snap.exists() ? snap.data() : null;
    const rev = before ? before.rev + 1 : 1;
    const after = {
      name: values.name.trim(), logo: values.logo, palette: values.palette.map((c) => c.toUpperCase()),
      taskPrefix: values.taskPrefix, updatedAt: serverTimestamp(), updatedBy: actorId, rev,
    };
    tx.set(ref, after);
    tx.set(
      auditRef(db, 'settings', 'workspace', rev),
      auditEntry({ type: 'settings', id: 'workspace', rev, action: before ? 'update' : 'create', actorId, before, after }),
    );
  });
}
