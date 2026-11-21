/**
 * Rules for the things a player types when creating an account.
 * No imports on purpose: the unit tests load this file with plain node.
 */

/** 3–16 characters: letters, digits, `_` and `.`. Uniqueness ignores case. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_.]{3,16}$/;
export const MIN_PASSWORD_LENGTH = 8;

export function validateUsername(username: string): string | null {
  if (username.length < 3)
    return "O username precisa ter pelo menos 3 caracteres";
  if (username.length > 16)
    return "O username pode ter no máximo 16 caracteres";
  if (!USERNAME_PATTERN.test(username))
    return "Use só letras sem acento, números, _ e .";
  return null;
}

export function validatePassword(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
  if (password !== confirmation) return "As senhas não são iguais";
  return null;
}

/** Shape only — nothing ever confirms the address exists. */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (trimmed.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
    return "Digite um e-mail válido";
  return null;
}

/**
 * A profile's avatar URL is written by its owner's browser, so it could point
 * anywhere. Returns it only if it is a file in this Supabase project, inside
 * that account's own avatars folder; otherwise null (show the placeholder).
 */
export function projectAvatarUrl(
  url: string | null | undefined,
  supabaseUrl: string | undefined,
  userId: string,
): string | null {
  if (!url || !supabaseUrl) return null;
  const prefix = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/avatars/${userId}/`;
  return url.startsWith(prefix) ? url : null;
}
