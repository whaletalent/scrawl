export function validateNickname(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Nickname must be at least 2 characters";
  if (trimmed.length > 16) return "Nickname must be 16 characters or less";
  return null;
}
