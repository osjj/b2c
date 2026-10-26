import assert from 'node:assert/strict'

import { adminCaseViewSchema, caseInputSchema } from './types'
import type { AdminCaseView } from './types'

export const SOUTH_AFRICA_LINK_CASE_ID = 'cmuu1gcon0000um188vsx2o88'
export const SOUTH_AFRICA_LINK_CASE_SLUG = 'south-africa-mining-ppe-procurement-2026'
export const SOUTH_AFRICA_MINING_RESOURCE = {
  label: 'PPE for mining and quarrying',
  href: '/solutions/ppe-safety-equipment-for-mining-quarrying',
} as const

export const SOUTH_AFRICA_PROCUREMENT_LINKS = [
  { name: 'Safety helmets', quantity: 500, unit: 'pieces', href: '/categories/head-protection/safety-helmets' },
  { name: 'Cut-resistant gloves', quantity: 1200, unit: 'pairs', href: '/categories/hand-protection/cut-resistant-gloves' },
  { name: 'Cotton yarn gloves', quantity: 4800, unit: 'pairs', href: '/categories/hand-protection/knit-gloves' },
  { name: 'Safety shoes', quantity: 200, unit: 'pairs', href: '/categories/foot-protection/safety-shoes' },
  { name: 'Safety rain boots', quantity: 200, unit: 'pairs', href: '/categories/foot-protection/safety-rain-boots' },
  { name: 'Workwear', quantity: 200, unit: 'sets', href: '/categories/body-protection' },
] as const

/** Adds links to the existing order table and in-article resource list; no prose is rewritten. */
export function prepareSouthAfricaContextualLinks(input: AdminCaseView, now = new Date()) {
  const current = adminCaseViewSchema.parse(input)
  assert.equal(current.id, SOUTH_AFRICA_LINK_CASE_ID)
  assert.equal(current.slug, SOUTH_AFRICA_LINK_CASE_SLUG)
  assert.equal(current.status, 'PUBLISHED')
  assert.equal(current.publicationApproved, true)
  assert.ok(current.publishedAt && new Date(current.publishedAt) <= now)
  assert.equal(current.procurement.length, SOUTH_AFRICA_PROCUREMENT_LINKS.length)

  const procurement = current.procurement.map((item, index) => {
    const reviewed = SOUTH_AFRICA_PROCUREMENT_LINKS[index]
    assert.ok(reviewed)
    assert.deepEqual([item.name, item.quantity, item.unit], [reviewed.name, reviewed.quantity, reviewed.unit])
    assert.ok(!item.href || item.href === reviewed.href, 'An existing procurement destination needs review')
    return { ...item, href: reviewed.href }
  })
  const existingResources = current.relatedLinks.filter(({ href }) => href === SOUTH_AFRICA_MINING_RESOURCE.href)
  assert.ok(existingResources.length <= 1, 'Duplicate Mining resources need review')
  if (existingResources.length) assert.deepEqual(existingResources[0], SOUTH_AFRICA_MINING_RESOURCE)
  const relatedLinks = existingResources.length ? current.relatedLinks : [...current.relatedLinks, SOUTH_AFRICA_MINING_RESOURCE]
  caseInputSchema.parse({ ...current, procurement, relatedLinks })
  const procurementEqual = JSON.stringify(current.procurement) === JSON.stringify(procurement)
  const resourcesEqual = JSON.stringify(current.relatedLinks) === JSON.stringify(relatedLinks)
  // Mixed partial prior updates require an explicit new review rather than being silently completed.
  const linkedRows = current.procurement.filter((item) => Boolean(item.href)).length
  assert.ok(linkedRows === 0 || linkedRows === procurement.length)
  assert.equal(linkedRows === procurement.length, Boolean(existingResources.length), 'Partial existing link release needs review')
  return {
    action: procurementEqual && resourcesEqual ? 'unchanged' as const : 'apply' as const,
    procurement,
    relatedLinks,
    destinations: [...SOUTH_AFRICA_PROCUREMENT_LINKS.map(({ href }) => href), SOUTH_AFRICA_MINING_RESOURCE.href],
  }
}
