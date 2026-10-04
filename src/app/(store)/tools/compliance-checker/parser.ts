import { EN_CLASSES, EN_ADDONS, SLIP_CODES, ASTM_CODES, type ComplianceCode } from './data'

export interface DecodedMatch { code: ComplianceCode; context: string }
export interface DecodedLabel { matches: DecodedMatch[]; warnings: string[]; unknown: string[] }

const EN_2011_DESCRIPTIONS: Record<string, string> = {
  S1: 'SB plus closed heel, antistatic properties (A), heel energy absorption (E) and fuel oil resistance (FO) under the 2011 edition.',
  S1P: 'S1 plus a penetration-resistant insert under the 2011 edition. P does not distinguish metal and non-metal inserts.',
  S2: 'S1 plus upper water penetration and absorption resistance (WRU) under the 2011 edition. FO is included; whole-footwear water resistance is separate.',
  S3: 'S2 plus a penetration-resistant insert and cleated outsole under the 2011 edition. FO is included; 2011 does not distinguish metal and non-metal inserts by this code.',
  S4: 'All-rubber or all-polymeric footwear with basic requirements, closed heel, antistatic properties, heel energy absorption and fuel oil resistance (FO) under the 2011 edition.',
  S5: 'S4 plus a penetration-resistant insert and cleated outsole under the 2011 edition. FO is included; P does not distinguish metal and non-metal inserts.',
  P: 'Penetration resistance under the 2011 edition; P does not distinguish metal and non-metal insert materials.',
}

/** Headers delimit scopes, so identical letters never leak across standard systems. */
export function decodeLabel(text: string): DecodedLabel {
  const result: DecodedLabel = { matches: [], warnings: [], unknown: [] }
  if (!text.trim()) return result
  const upper = text.toUpperCase()
  const headers = [...upper.matchAll(/(?:EN\s*(?:ISO\s*)?20345(?:\s*:\s*(\d{4}))?|(?:ASTM\s*)?F2413(?:\s*-\s*(\d{2,4}))?)/g)]
  const scopes: { body: string; family?: 'EN' | 'ASTM'; year?: string }[] = []
  if (!headers.length) scopes.push({ body: upper })
  else {
    const prefix = upper.slice(0, headers[0].index)
    if (prefix.trim() && !/^\s*(?:CE(?:\s+\d{4})?|UKCA)\s*$/.test(prefix)) scopes.push({ body: prefix })
    headers.forEach((h, i) => scopes.push({
      body: upper.slice(h.index! + h[0].length, headers[i + 1]?.index ?? upper.length),
      family: h[0].includes('20345') ? 'EN' : 'ASTM',
      year: h[1] ?? (h[2] ? (h[2].length === 2 ? `20${h[2]}` : h[2]) : undefined),
    }))
  }
  for (const scope of scopes) {
    const tokens = scope.body.match(/[A-Z0-9Ø]+(?:\/[A-Z0-9]+)*/g) ?? []
    const enHint = tokens.some(t => EN_CLASSES.some(c => c.code === t) || ['SRC', 'SRA', 'SRB', 'SR', 'HRO'].includes(t))
    const astmHint = tokens.some(t => /^(I|C|MT)\/\d+$/.test(t) || ['EH', 'PR', 'SD', 'CD'].includes(t))
    const family = scope.family ?? (enHint !== astmHint ? (enHint ? 'EN' : 'ASTM') : undefined)
    const context = family === 'EN' ? `EN ISO 20345${scope.year ? `:${scope.year}` : ' (year unspecified)'}` : family === 'ASTM' ? `ASTM F2413${scope.year ? `-${scope.year.slice(2)}` : ' (year unspecified)'}` : 'Standard unspecified'
    if (!scope.family && tokens.length) result.warnings.push(family ? `${context}: inferred from codes; confirm the printed standard and edition.` : 'Standard is missing or ambiguous. Add a separate standard header before each set of codes.')
    if (scope.family && !scope.year) result.warnings.push(`${context}: include the edition year to check year-specific markings.`)
    const supported = !scope.year || (family === 'EN' ? ['2011', '2022'].includes(scope.year) : ['2018', '2024'].includes(scope.year))
    if (!supported) result.warnings.push(`${context}: this edition is outside the decoder reference coverage. Confirm codes with the manufacturer; no edition-specific interpretation is provided.`)
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      // Explicit size and conformity-mark metadata are not protection codes.
      if (token === 'SIZE') { if (/^\d/.test(tokens[i + 1] ?? '')) i++; if (['W', 'D', 'E', 'EE', '2E', '4E'].includes(tokens[i + 1])) i++; continue }
      if (token === 'CE' || token === 'UKCA') { if (/^\d{4}$/.test(tokens[i + 1] ?? '')) i++; continue }
      const dictionary = family === 'EN' ? [...EN_CLASSES, ...EN_ADDONS, ...SLIP_CODES] : family === 'ASTM' ? ASTM_CODES : []
      const meta = dictionary.find(c => c.code.toUpperCase() === token)
      if (!meta || !supported) { result.unknown.push(`${context}: ${token}`); continue }
      const modernOnly = /^(S1PL|S1PS|S3L|S3S|S5L|S5S|S6|S7|S7L|S7S|PS|PL|WPA|SR|SC|LG|Ø)$/.test(token)
      const legacyOnly = /^(SRA|SRB|SRC|WRU)$/.test(token)
      if (family === 'EN' && ((scope.year === '2022' && legacyOnly) || (scope.year === '2011' && modernOnly))) {
        result.warnings.push(`${context}: ${token} belongs to the ${legacyOnly ? '2011' : '2022'} marking system. Check this mixed-edition label.`)
        result.unknown.push(`${context}: ${token} (edition conflict)`)
        continue
      }
      let description = meta.description
      if (family === 'EN' && scope.year === '2011') description = EN_2011_DESCRIPTIONS[token] ?? description
      if (family === 'EN' && !scope.year && (modernOnly || legacyOnly || ['P', 'S1P', 'S2', 'S3', 'S5'].includes(token))) result.warnings.push(`${token}: meaning or availability depends on the EN edition. Confirm 2011 versus 2022 before purchasing.`)
      if (family === 'ASTM' && /^(I|C|MT)\//.test(token)) result.warnings.push(`${context}: ${token} is a legacy rating format; confirm the label format and model test report for the stated edition.`)
      if (!result.matches.some(m => m.code.code === meta.code && m.context === context)) result.matches.push({ code: { ...meta, description }, context })
    }
  }
  result.warnings = [...new Set(result.warnings)]
  result.unknown = [...new Set(result.unknown)]
  return result
}
