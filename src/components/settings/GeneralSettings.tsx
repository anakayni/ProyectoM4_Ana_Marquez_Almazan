import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';
import { DEFAULT_PALETTE, isValidPrefix, type WorkspaceSettings } from '@/features/settings/defaults';
import { imageToLogo } from '@/features/settings/logoImage';
import { paletteChecks } from '@/features/settings/paletteChecks';
import { formatTaskNumber } from '@/features/tasks/taskNumber';
import { AvatarImageError } from '@/features/team/avatarImage';
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import { saveWorkspaceSettings } from '@/services/settings.service';
import { PalettePreview } from './PalettePreview';
import styles from './GeneralSettings.module.css';

/** Identidad, colores y numeración del espacio (solo admin). */
export function GeneralSettings({ actorId }: { actorId: string }) {
  const current = useWorkspaceSettings();
  const [draft, setDraft] = useState<WorkspaceSettings>(current);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (change: Partial<WorkspaceSettings>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, ...change }));
  };
  const problems = paletteChecks(draft.palette).filter((c) => !c.ok);
  const prefixOk = isValidPrefix(draft.taskPrefix);
  const nameOk = draft.name.trim().length > 0;

  async function pickLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      set({ logo: await imageToLogo(file) });
      setError(null);
    } catch (err) {
      if (!(err instanceof AvatarImageError)) console.error('Error al procesar el logo:', err);
      setError(err instanceof AvatarImageError ? err.message : 'No pudimos leer la imagen. Prueba con otra.');
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (problems.length || !prefixOk || !nameOk) return;
    setSaving(true);
    setError(null);
    try {
      await saveWorkspaceSettings(actorId, { ...draft, name: draft.name.trim() });
      setSaved(true);
    } catch (err) {
      console.error('Error al guardar los ajustes:', err);
      setError('No pudimos guardar los ajustes. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={save} noValidate>
      {error && <Alert kind="error">{error}</Alert>}
      {saved && <Alert kind="success">Ajustes guardados. Toda la app ya los usa.</Alert>}

      <section aria-labelledby="identity-title" className={styles.section}>
        <h2 id="identity-title" className={styles.title}>Identidad</h2>
        <Field id="settings-name" label="Nombre del espacio" error={nameOk ? undefined : 'Ingresa un nombre.'}>
          <input id="settings-name" className={fieldInputClass} maxLength={60} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <div className={styles.logoRow}>
          <div className={styles.logoBox}>
            {draft.logo ? <img src={draft.logo} alt="Logo actual" className={styles.logo} /> : <span className={styles.noLogo}>Sin logo</span>}
          </div>
          <label className={styles.upload}>
            Subir logo
            <input type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden" onChange={(e) => void pickLogo(e)} />
          </label>
          {draft.logo && <Button size="sm" variant="ghost" onClick={() => set({ logo: null })}>Quitar logo</Button>}
        </div>
      </section>

      <section aria-labelledby="colors-title" className={styles.section}>
        <h2 id="colors-title" className={styles.title}>Colores</h2>
        <div className={styles.swatches}>
          {draft.palette.map((color, i) => (
            <label key={i} className={styles.swatch}>
              <input
                type="color" aria-label={`Color ${i + 1}`} value={color}
                onChange={(e) => set({ palette: draft.palette.map((c, j) => (j === i ? e.target.value.toUpperCase() : c)) })}
              />
              <span>Color {i + 1}</span>
            </label>
          ))}
          <Button size="sm" variant="secondary" onClick={() => set({ palette: [...DEFAULT_PALETTE] })}>Restaurar paleta original</Button>
        </div>
        <PalettePreview palette={draft.palette} name={draft.name} />
        {problems.length > 0 && (
          <Alert kind="error">
            Estos textos no se leerían bien (mínimo 4.5:1):{' '}
            {problems.map((p) => `${p.label} (${p.ratio.toFixed(1)}:1)`).join('; ')}.
          </Alert>
        )}
      </section>

      <section aria-labelledby="numbers-title" className={styles.section}>
        <h2 id="numbers-title" className={styles.title}>Numeración</h2>
        <Field id="settings-prefix" label="Prefijo de las tareas" error={prefixOk ? undefined : 'De 1 a 5 letras o números.'}>
          <input
            id="settings-prefix" className={fieldInputClass} maxLength={5} value={draft.taskPrefix}
            onChange={(e) => set({ taskPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
          />
        </Field>
        {prefixOk && <p className={styles.hint}>Ejemplo: {formatTaskNumber(12, draft.taskPrefix)}</p>}
      </section>

      <div className={styles.actions}>
        <Button type="submit" loading={saving} disabled={problems.length > 0 || !prefixOk || !nameOk}>Guardar cambios</Button>
      </div>
    </form>
  );
}
