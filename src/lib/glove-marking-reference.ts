import type { GloveStandard } from './glove-marking-decoder'

export const GLOVE_REFERENCE_CHECKED = '2026-10-30'
export const GLOVE_EDITIONS: Record<GloveStandard, { value: string; label: string }[]> = {
  EN388: [{ value: '2003', label: 'EN 388:2003' }, { value: '2016', label: 'EN 388:2016' }, { value: '2016+A1:2018', label: 'EN 388:2016+A1:2018' }],
  EN407: [{ value: '2004', label: 'EN 407:2004' }, { value: '2020', label: 'EN 407:2020' }],
}
export const GLOVE_EXAMPLES: { label: string; input: string }[] = [
  { label: 'Mechanical + thermal', input: 'EN388:2016+A1:2018 4X43CP; EN407:2020 X1XXXX' },
  { label: 'Legacy mechanical', input: 'EN388:2003 254X' },
  { label: 'TDM F without impact suffix', input: 'EN388:2016 4X43F' },
]
export const GLOVE_REFERENCE_SOURCES: { title: string; href: string; description: string }[] = [
  { title: 'ATG: EN 388:2016+A1:2018', href: 'https://www.atg-glovesolutions.com/en/support/standards/en-3882016-a12018', description: 'Mechanical test positions, classification boundaries and the optional impact P marking.' },
  { title: 'SATRA: EN 407:2020', href: 'https://www.satra.com/spotlight/article.php?id=533', description: 'Thermal test categories, edition changes and conditions requiring document checks.' },
  { title: 'uvex: safety glove standards', href: 'https://www.uvex-safety.co.uk/en/knowledge/safety-standards/safety-gloves/', description: 'Mechanical and thermal classification explanations, including contact-heat test levels.' },
  { title: 'DuPont: legacy and revised cut standards', href: 'https://www.dupont.cn/content/dam/dupont/amer/us/en/personal-protection/public/documents/en/Kevlar_Cut_Standards_Handout_EN2.pdf', description: 'Examples comparing the legacy four-position mechanical marking with revised cut-test markings.' },
  { title: 'ATG: manufacturer instructions', href: 'https://www.atg-glovesolutions.com/en-us/legal/ifu/maxichem/maxichem/76-730', description: 'An example of manufacturer instructions explaining performance symbols and their limits.' },
  { title: 'Ansell: impact glove marking', href: 'https://www.ansell.com/au/en/faq/what-are-impact-gloves', description: 'Impact notation should be read with the specific manufacturer’s instructions.' },
]
export const GLOVE_BUYER_CHECKS: string[] = [
  'Match the marking, exact glove model and stated edition to the supplier’s instructions for use, test report and Declaration of Conformity.',
  'Ask the supplier to explain X, missing results and any manufacturer-specific impact notation; verify the actual pictogram and conditional marking requirements in the documents.',
  'Check task hazards, materials, grip, fit, size, wear, cleaning and replacement needs with a competent safety assessment.',
  'Laboratory contact-heat classifications are not a safe-use temperature or a guarantee of handling time.',
  'This text interpretation does not validate certification, chemical, electrical or needle protection, or ANSI equivalence.',
]
