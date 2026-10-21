export function parseLinePosition(input: string, count: number): number | null {
  const text = input.trim()
  if (!/^\d+$/.test(text) || !Number.isInteger(count) || count < 1) return null
  const position = Number(text)
  return Number.isSafeInteger(position) && position >= 1 && position <= count ? position : null
}

// Move the complete row to an insertion position while preserving each row's identity.
export function moveLine<T>(items: T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
