import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_SETTINGS, type WorkspaceSettings } from '@/features/settings/defaults';
import * as audited from '@/services/audited/settings';
import { db } from './firebase';

/** Ajustes en tiempo real; sin documento, los valores por defecto. */
export function subscribeToSettings(onData: (s: WorkspaceSettings) => void, onError: (e: Error) => void): () => void {
  return onSnapshot(
    doc(db, 'settings', 'workspace'),
    (snap) => {
      const d = snap.data();
      onData(d ? { name: d.name, logo: d.logo ?? null, palette: d.palette, taskPrefix: d.taskPrefix } : DEFAULT_SETTINGS);
    },
    onError,
  );
}

export const saveWorkspaceSettings = (actorId: string, values: WorkspaceSettings) => audited.saveSettings(db, actorId, values);
