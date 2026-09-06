// Presentation-only labels; stored company fields remain untouched.
export function brandFieldLabel(key: 'Address' | 'Contact' | 'Website' | 'Email', value?: string): string {
  const text = value?.trim()
  if (!text) return ''
  return new RegExp(`^${key}\\s*[:：]`, 'i').test(text) ? text : `${key}: ${text}`
}
