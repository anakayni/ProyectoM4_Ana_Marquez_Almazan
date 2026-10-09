import { expect, it } from 'vitest';
import { inviteLink } from '@/features/team/inviteLink';

it('arma el link de registro con el email codificado', () => {
  expect(inviteLink('https://app.test', 'ana+1@x.com')).toBe('https://app.test/register?email=ana%2B1%40x.com');
});

it('no duplica la barra final del origen', () => {
  expect(inviteLink('https://app.test/', 'ana@x.com')).toBe('https://app.test/register?email=ana%40x.com');
});
