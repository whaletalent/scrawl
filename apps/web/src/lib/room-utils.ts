export function validateNickname(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2)
    return "O apelido precisa ter pelo menos 2 caracteres";
  if (trimmed.length > 16) return "O apelido pode ter no máximo 16 caracteres";
  return null;
}
