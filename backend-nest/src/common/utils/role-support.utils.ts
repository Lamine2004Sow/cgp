/**
 * Utilitaires partagés pour la détection des rôles "support / secrétariat".
 * Utilisés par EntitesService et OrganigrammesService.
 */

export const SUPPORT_ROLE_HINTS = [
  'secretariat',
  'secretaire',
  'assistante',
  'assistant',
  'gestionnaire',
  'coordonnatrice',
  'coordinatrice',
  'coordonatrice',
  'contact',
] as const;

export function normalizeRoleText(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isSupportRole(roleId: string, roleLabel?: string | null): boolean {
  const haystack = `${normalizeRoleText(roleId)} ${normalizeRoleText(roleLabel)}`;
  return SUPPORT_ROLE_HINTS.some((hint) => haystack.includes(hint));
}
