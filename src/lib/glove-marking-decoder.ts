export type GloveStandard = 'EN388' | 'EN407'
export type GloveDecodeContext = { standard: GloveStandard; edition: string }
export type GloveFieldStatus = 'rated' | 'not-tested' | 'below-level-1' | 'unresolved'
export type GloveDecodedField = { position: number; code: string; name: string; status: GloveFieldStatus; meaning: string }
export type GloveDecodedSection = { id: string; standard: GloveStandard; edition: string | null; context: string; marking: string; fields: GloveDecodedField[]; warnings: string[]; unknown: string[]; complete: boolean }
export type GloveDecodeResult = { sections: GloveDecodedSection[]; warnings: string[]; unknown: string[]; inputError: string | null; hasDecodedFields: boolean }

export const MAX_GLOVE_INPUT_LENGTH = 2000

const MAX_STANDARD_SECTIONS = 8
const SCOPE_PATTERN = /\b(?:(?:BS|DIN|NF|UNE|SIST|PN|SN)\s+)?((?:EN(?:\s*ISO)?|ISO|ANSI(?:\s*\/\s*ISEA)?|ASTM\s*[A-Z]?)\s*\d+(?:-\d+)?)(?![A-Za-z0-9_])/gi
const HEADER_LIKE_PATTERN = /\b[A-Z]{2,}(?:[/-][A-Z]{2,})*(?:[ \t]+[A-Z]{1,3})?[ \t]*\d[A-Z0-9]*(?:[./-]\d[A-Z0-9]*)*(?![A-Z0-9_])/gi
const METADATA_PREFIX = /^(?:CE(?:\d{4})?|sizes?|sz|model|ref\.?|reference|notified(?:-body)?|body)(?=[:=\s]|$)/i
const MECHANICAL_NAMES = ['Abrasion resistance', 'Coup blade cut resistance', 'Tear resistance', 'Puncture resistance']
const MECHANICAL_TESTS = ['material wear in an abrasion test', 'a rotating-blade cut test', 'force to continue a tear', 'penetration by the specified test probe, not a needle test']
const THERMAL_NAMES = ['Limited flame spread', 'Contact heat', 'Convective heat', 'Radiant heat', 'Small molten-metal splashes', 'Large molten-metal quantities']
const THERMAL_TESTS = ['flame behaviour in the prescribed test', 'heat transfer during contact', 'heat transfer from a flame', 'heat transfer from radiant energy', 'exposure to small molten-metal droplets', 'exposure to a larger molten-metal quantity']
const LIMITATIONS = 'Text interpretation does not validate certification, chemical, electrical or needle protection, task suitability, or ANSI equivalence.'
const NO_IMPACT = 'No passed-impact marking is shown. This does not prove failure or establish whether impact testing occurred.'

function emptyResult(): GloveDecodeResult {
  return { sections: [], warnings: [], unknown: [], inputError: null, hasDecodedFields: false }
}

function isSupported(standard: GloveStandard, edition: string): boolean {
  return GLOVE_EDITIONS[standard].some((item) => item.value === edition)
}

function cleanFragment(value: string): string {
  return value.replace(/^[\s;,|]+|[\s;,|]+$/g, '')
}

type ScopeHeader = { index: number; text: string; standard: string }

function findScopeHeaders(input: string): ScopeHeader[] {
  const explicit = [...input.matchAll(SCOPE_PATTERN)].map((match) => ({ index: match.index ?? 0, text: match[0], standard: (match[1] ?? '').replace(/\s/g, '').toUpperCase() }))
  const headerLike = [...input.matchAll(HEADER_LIKE_PATTERN)].flatMap((match): ScopeHeader[] => {
    const index = match.index ?? 0
    const end = index + match[0].length
    if (METADATA_PREFIX.test(match[0])) return []
    // A general header-like annotation cannot swallow an explicit reference inside it.
    if (explicit.some((header) => index < header.index + header.text.length && end > header.index)) return []
    return [{ index, text: match[0], standard: match[0].replace(/\s/g, '').toUpperCase() }]
  })
  return [...explicit, ...headerLike].sort((a, b) => a.index - b.index)
}

function parseEdition(tail: string): { edition: string | null; consumed: number } {
  const hasColon = /^\s*:/.test(tail)
  if (!hasColon && !/^\s+(?:19|20)\d{2}(?=\s|$|\+)/.test(tail)) return { edition: null, consumed: 0 }
  const prefix = (hasColon ? /^\s*:\s*/ : /^\s+/).exec(tail)?.[0] ?? ''
  const editionText = tail.slice(prefix.length)
  const match = /^\d{4}(?:\s*\+\s*[A-Z0-9]+(?:\s*:\s*\d{4})?)*[^\s;,|]*/i.exec(editionText)
    ?? /^[^\s;,|]*/.exec(editionText)
  if (!match) return { edition: '', consumed: 0 }
  return { edition: match[0].replace(/\s/g, '').toUpperCase(), consumed: prefix.length + match[0].length }
}

type MarkingCandidate = { marking: string; start: number; end: number }

function findMarking(body: string): MarkingCandidate | null {
  const tokens = [...body.matchAll(/[^\s;,|]+/g)]
  let metadataEnd = -1
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token) continue
    const text = token[0]
    const start = token.index ?? 0
    if (start < metadataEnd) continue
    // Keep the whole metadata clause unresolved, including wrapped/spaced numeric runs.
    if (METADATA_PREFIX.test(text)) {
      const separator = /[;|]/.exec(body.slice(start + text.length))
      metadataEnd = separator ? start + text.length + separator.index : body.length
      continue
    }
    if (!/^[0-9X][A-Z0-9]*$/i.test(text)) continue
    let end = start + text.length
    let marking = text
    if (text.length === 1) {
      for (let j = i + 1; j < tokens.length; j++) {
        const next = tokens[j]
        if (!next || !/^[A-Z0-9]$/i.test(next[0])) break
        const nextStart = next.index ?? 0
        if (!/^\s+$/.test(body.slice(end, nextStart))) break
        marking += next[0]
        end = nextStart + next[0].length
      }
    }
    if (marking.length >= 4) return { marking: marking.toUpperCase(), start, end }
  }
  return null
}

function numericField(position: number, code: string, name: string, test: string, maximum: number): GloveDecodedField {
  if (code === 'X') return { position, code, name, status: 'not-tested', meaning: 'No established/claimed result in this marking; the test may not have been performed or may not apply. Check the instructions.' }
  if (code === '0') return { position, code, name, status: 'below-level-1', meaning: 'The reported result is below level 1. This differs from X, which establishes no result here.' }
  if (!/^[1-5]$/.test(code) || Number(code) > maximum) return { position, code, name, status: 'unresolved', meaning: `Invalid position code; use 0 to ${maximum} or X for this test.` }
  return { position, code, name, status: 'rated', meaning: `Level ${code}: classification for ${test} under the stated edition’s laboratory method.` }
}

function mechanicalFields(marking: string, modern: boolean): GloveDecodedField[] {
  const fields = MECHANICAL_NAMES.map((name, index) => numericField(index + 1, marking[index] ?? '', name, MECHANICAL_TESTS[index] ?? name, index === 1 ? 5 : 4))
  if (!modern) return fields
  const code = marking[4] ?? ''
  if (code === 'X') {
    fields.push({ position: 5, code, name: 'TDM cut resistance', status: 'not-tested', meaning: 'No established/claimed TDM cut result in this marking; confirm the manufacturer’s instructions.' })
  } else if (/^[A-F]$/.test(code)) {
    const minimum = new Map([['A', 2], ['B', 5], ['C', 10], ['D', 15], ['E', 22], ['F', 30]]).get(code)
    fields.push({ position: 5, code, name: 'TDM cut resistance', status: 'rated', meaning: `Level ${code}: at least ${minimum} N in the ISO 13997 laboratory cut-force classification. F here is a cut level, not an impact result.` })
  } else {
    fields.push({ position: 5, code, name: 'TDM cut resistance', status: 'unresolved', meaning: 'Invalid TDM position; use A to F or X.' })
  }
  const impact = marking[5]
  if (impact === 'P') fields.push({ position: 6, code: impact, name: 'Optional impact marking', status: 'rated', meaning: 'A passed impact-test marking is present. Confirm its scope and the exact glove model in the instructions and report.' })
  else if (impact) fields.push({ position: 6, code: impact, name: 'Optional impact marking', status: 'unresolved', meaning: /^[FX]$/.test(impact) ? 'Manufacturer notation: confirm its meaning in the instructions. This is not a passed-impact P marking.' : 'Unrecognized impact suffix; only P is decoded as a passed-impact marking.' })
  return fields
}

function thermalFields(marking: string, edition: string): GloveDecodedField[] {
  return THERMAL_NAMES.map((name, index) => {
    const field = numericField(index + 1, marking[index] ?? '', index === 0 && edition === '2004' ? 'Burning behaviour' : name, THERMAL_TESTS[index] ?? name, 4)
    if (index === 1 && field.status === 'rated') {
      const temperature = new Map([['1', 100], ['2', 250], ['3', 350], ['4', 500]]).get(field.code)
      field.meaning = `Level ${field.code}: ${temperature}°C contact-heat laboratory classification only; not a safe-use temperature or handling-time guarantee.`
    }
    return field
  })
}

function decodeSection(standard: GloveStandard, edition: string | null, header: string, body: string, fallback: GloveDecodeContext | undefined, index: number): GloveDecodedSection {
  const section: GloveDecodedSection = { id: `glove-section-${index + 1}`, standard, edition, context: header, marking: '', fields: [], warnings: [], unknown: [], complete: false }
  if (edition === null && fallback?.standard === standard && isSupported(standard, fallback.edition)) {
    section.edition = fallback.edition
    section.context = `${header}; explicit missing-edition context: ${standard}:${fallback.edition}`
    section.warnings.push('An explicit user context supplies the missing edition; confirm it against the actual label and documents.')
  }
  if (section.edition === null) {
    section.warnings.push(`Missing ${standard} edition. Supply a matching explicit context or paste the complete reference; no edition is inferred.`)
    const unknown = cleanFragment(body)
    if (unknown) section.unknown.push(unknown)
    return section
  }
  if (!isSupported(standard, section.edition)) {
    section.warnings.push(`Unsupported edition/amendment ${standard}:${section.edition || '(empty)'}. The header governs; an explicit fallback cannot replace it.`)
    const unknown = cleanFragment(body)
    if (unknown) section.unknown.push(unknown)
    return section
  }
  const candidate = findMarking(body)
  if (!candidate) {
    section.warnings.push('No complete performance-code token was identified in this scope. Keep labels and metadata separate from the code.')
    const unknown = cleanFragment(body)
    if (unknown) section.unknown.push(unknown)
    return section
  }
  section.marking = candidate.marking
  for (const fragment of [body.slice(0, candidate.start), body.slice(candidate.end)]) {
    const unknown = cleanFragment(fragment)
    if (unknown) section.unknown.push(unknown)
  }
  const modern = standard === 'EN388' && section.edition !== '2003'
  const expectedLength = standard === 'EN407' ? [6] : modern ? [5, 6] : [4]
  if (!expectedLength.includes(candidate.marking.length)) {
    section.warnings.push(`Expected ${expectedLength.join(' or ')} positions for ${standard}:${section.edition}; the complete token is unresolved and no valid prefix is decoded.`)
    section.unknown.unshift(candidate.marking)
    return section
  }
  section.fields = standard === 'EN388' ? mechanicalFields(candidate.marking, modern) : thermalFields(candidate.marking, section.edition)
  if (section.fields.some((field) => field.status === 'unresolved')) {
    section.unknown.unshift(candidate.marking)
    section.warnings.push('One or more positions are unresolved. Valid positions are text interpretations only; verify the complete marking with the supplier.')
  }
  if (modern && candidate.marking[5] !== 'P') section.warnings.push(NO_IMPACT)
  if (modern && /^[FX]$/.test(candidate.marking[5] ?? '')) section.warnings.push('The terminal F/X is treated as manufacturer notation requiring instructions confirmation; it supplies no passed-impact claim.')
  if (standard === 'EN407') {
    section.warnings.push('Contact-heat levels are laboratory classifications, not a safe-use temperature or a handling-time guarantee.')
    section.warnings.push('Check documentation for edition-specific conditional rating rules and the actual pictogram. Text alone cannot judge pictogram eligibility.')
  }
  if (section.unknown.length) section.warnings.push('Unresolved text remains in this scope. CE, body numbers, size and product metadata are not protection ratings.')
  section.complete = section.fields.every((field) => field.status !== 'unresolved') && section.unknown.length === 0
  return section
}

export function decodeGloveMarking(input: string, fallback?: GloveDecodeContext): GloveDecodeResult {
  const result = emptyResult()
  if (input.length > MAX_GLOVE_INPUT_LENGTH) return { ...result, inputError: `Use no more than ${MAX_GLOVE_INPUT_LENGTH} characters. Split the label text into smaller interpretations.` }
  if (!input.trim()) return result
  const headers = findScopeHeaders(input)
  if (headers.length > MAX_STANDARD_SECTIONS) return { ...result, inputError: `Use no more than ${MAX_STANDARD_SECTIONS} standard sections at a time. No partial interpretation was produced.` }
  result.warnings.push(LIMITATIONS)
  if (!headers.length) {
    if (fallback && isSupported(fallback.standard, fallback.edition)) {
      const section = decodeSection(fallback.standard, fallback.edition, `Explicit code-only context: ${fallback.standard}:${fallback.edition}`, input, undefined, 0)
      section.warnings.unshift('An explicit user context supplies the code-only reference; confirm the actual standard and edition before procurement.')
      result.sections.push(section)
    } else {
      result.unknown.push(input.trim())
      result.warnings.push('No supported full reference was identified. Bare codes require an explicit supported standard and edition context.')
    }
  } else {
    const firstHeader = headers[0]
    const leading = cleanFragment(input.slice(0, firstHeader?.index ?? 0))
    if (leading) result.unknown.push(leading)
    for (const [index, header] of headers.entries()) {
      const start = header.index
      const next = headers[index + 1]
      const end = next?.index ?? input.length
      const standardText = header.standard
      if (standardText !== 'EN388' && standardText !== 'EN407') {
        result.unknown.push(cleanFragment(input.slice(start, end)))
        result.warnings.push(`Unsupported standard or header-like scope ${header.text.trim()} is preserved without decoding.`)
        continue
      }
      const tail = input.slice(start + header.text.length, end)
      const parsed = parseEdition(tail)
      const context = `${header.text}${tail.slice(0, parsed.consumed)}`.trim()
      result.sections.push(decodeSection(standardText, parsed.edition, context, tail.slice(parsed.consumed), fallback, index))
    }
  }
  result.hasDecodedFields = result.sections.some((section) => section.fields.some((field) => field.status !== 'unresolved'))
  return result
}

export function buildGloveMarkingReport(input: string, fallback?: GloveDecodeContext): string | null {
  const result = decodeGloveMarking(input, fallback)
  if (result.inputError || !result.hasDecodedFields) return null
  const lines = [
    'Glove marking interpretation',
    `Reference coverage checked: ${GLOVE_REFERENCE_CHECKED}`,
    'Input (verbatim):',
    input,
    `Explicit fallback: ${fallback ? `${fallback.standard}:${fallback.edition}` : 'none'}. Headers govern; only a matching missing edition or headerless code can use fallback.`,
  ]
  for (const section of result.sections) {
    lines.push('', `${section.standard}:${section.edition ?? 'edition unresolved'} — ${section.marking || 'marking unresolved'}`, `Context: ${section.context}`, `Parsing coverage: ${section.complete ? 'complete' : 'incomplete'} (not a compliance determination).`)
    for (const field of section.fields) lines.push(`${field.position}. ${field.name} [${field.code}; ${field.status}]: ${field.meaning}`)
    for (const warning of section.warnings) lines.push(`Warning: ${warning}`)
    for (const unknown of section.unknown) lines.push(`Unresolved scope text: ${unknown}`)
  }
  for (const warning of result.warnings) lines.push(`Warning: ${warning}`)
  for (const unknown of result.unknown) lines.push(`Unresolved input: ${unknown}`)
  lines.push('', 'Buyer checks:')
  GLOVE_BUYER_CHECKS.forEach((check, index) => lines.push(`${index + 1}. ${check}`))
  lines.push('', 'Supported reference coverage:')
  for (const editions of Object.values(GLOVE_EDITIONS)) lines.push(editions.map((edition) => edition.label).join('; '))
  lines.push(`Sources checked ${GLOVE_REFERENCE_CHECKED}:`)
  for (const source of GLOVE_REFERENCE_SOURCES) lines.push(`${source.title}: ${source.href}`)
  return lines.join('\n')
}
import { GLOVE_BUYER_CHECKS, GLOVE_EDITIONS, GLOVE_REFERENCE_CHECKED, GLOVE_REFERENCE_SOURCES } from './glove-marking-reference'

