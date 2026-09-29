import { useState } from 'react';
import { SummaryError, sendSummary } from '@/api/summary.api';
import { Button } from '@/components/ui/Button';
import type { ToastMessage } from '@/components/ui/Toast';

export function SendSummaryButton({ onResult }: { onResult: (toast: ToastMessage) => void }) {
  const [sending, setSending] = useState(false);

  async function handleClick() {
    setSending(true);
    try {
      const { to } = await sendSummary();
      onResult({ kind: 'success', message: `Resumen enviado a ${to}.` });
    } catch (error) {
      console.error('Error al enviar el resumen:', error);
      onResult({
        kind: 'error',
        message: error instanceof SummaryError ? error.message : 'No pudimos enviar el resumen.',
        action: { label: 'Reintentar', onClick: () => void handleClick() },
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Button size="sm" onClick={() => void handleClick()} loading={sending}>
      {sending ? 'Enviando…' : 'Enviar resumen por email'}
    </Button>
  );
}
