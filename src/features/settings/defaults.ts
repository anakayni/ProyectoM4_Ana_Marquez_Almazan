export const DEFAULT_PALETTE: readonly string[] = ['#1B4079', '#4D7C8A', '#7F9C96', '#8FAD88', '#CBDF90'];

export type WorkspaceSettings = { name: string; logo: string | null; palette: string[]; taskPrefix: string };

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  name: 'MateCode Tasks', logo: null, palette: [...DEFAULT_PALETTE], taskPrefix: 'MC',
};

export function isValidPrefix(value: string): boolean {
  return /^[A-Z0-9]{1,5}$/.test(value);
}
