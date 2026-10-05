export function formatCaseDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value))
}

export function caseNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}

/** JSON-LD must not allow a stored title to terminate the script element. */
export function serializeCaseJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
