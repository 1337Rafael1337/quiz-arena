const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
}

export function escapeHtml(str: string): string {
  if (!str) return str
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char)
}
