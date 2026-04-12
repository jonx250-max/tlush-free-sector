const UNSAFE_CHARS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => UNSAFE_CHARS[ch])
}

export function sanitizeText(input: string): string {
  return input.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}
