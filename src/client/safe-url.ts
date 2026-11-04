export function safePublicUrl(value: string): string | null {
  try {
    const u = new URL(value)
    return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null
  } catch {
    return null
  }
}
