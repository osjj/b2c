export type CaseTextSegment = { text: string; href?: string }

function trimSentenceEnding(value: string): string {
  let end = value.length
  const unmatchedClosings: Record<string, number> = {
    ')': value.split(')').length - value.split('(').length,
    ']': value.split(']').length - value.split('[').length,
    '}': value.split('}').length - value.split('{').length,
  }
  while (end > 0) {
    const last = value[end - 1]
    if (/[.,!?;:'"`\u2026\u3002\uff0c\uff01\uff1f\uff1b\uff1a\u201d\u2019]/.test(last)) {
      end--
      continue
    }
    if (unmatchedClosings[last] > 0) {
      unmatchedClosings[last]--
      end--
      continue
    }
    break
  }
  return value.slice(0, end)
}

function isSafeSourceUrl(value: string): boolean {
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return false
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:')
      && Boolean(url.hostname) && url.hostname !== '.' && url.hostname !== '..'
      && !url.username && !url.password
  } catch {
    return false
  }
}

/** Preserve prose verbatim while identifying safe absolute web destinations. */
export function caseTextSegments(value: string): CaseTextSegment[] {
  const segments: CaseTextSegment[] = []
  let cursor = 0
  for (const match of value.matchAll(/https?:\/\/[^\s<>]+/gi)) {
    const start = match.index
    // A URL inside another scheme or word is ordinary text, not a destination.
    if (start > 0 && /[\w:/@\\]/.test(value[start - 1])) continue
    const href = trimSentenceEnding(match[0])
    if (!isSafeSourceUrl(href)) continue
    if (start > cursor) segments.push({ text: value.slice(cursor, start) })
    segments.push({ text: href, href })
    cursor = start + href.length
  }
  if (cursor < value.length) segments.push({ text: value.slice(cursor) })
  return segments
}
