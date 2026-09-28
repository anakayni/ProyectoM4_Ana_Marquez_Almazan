import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, fieldInputClass } from '@/components/ui/Field';

describe('Button', () => {
  it('queda deshabilitado y anuncia carga cuando loading=true', () => {
    render(<Button loading>Guardar</Button>);
    const button = screen.getByRole('button', { name: /guardar/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Field', () => {
  it('asocia label y mensaje de error al input', () => {
    render(
      <Field id="email" label="Email" error="Email inválido">
        <input id="email" className={fieldInputClass} aria-invalid aria-describedby="email-error" />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('Email inválido');
  });
});

describe('Alert', () => {
  it('usa role=alert para errores', () => {
    render(<Alert kind="error">Falló</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Falló');
  });
});
