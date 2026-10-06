import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'

import { SOUTH_AFRICA_READING_ID, SOUTH_AFRICA_READING_SLUG, SOUTH_AFRICA_READING_VERSION, southAfricaReadingCandidate } from './south-africa-reading-candidate'
import { adminCaseViewSchema, caseInputSchema, caseViewSchema, publicCaseView } from './types'
import type { AdminCaseView, CaseView } from './types'

export const CASE_READING_RELEASE_FIELDS = ['title', 'summary', 'buyerProfile', 'procurement', 'sections', 'gallery', 'relatedLinks'] as const
export type CaseReadingReleaseData = Pick<CaseView, typeof CASE_READING_RELEASE_FIELDS[number]>
export type CaseReadingReleasePlan = { action: 'unchanged' } | {
  action: 'apply'
  expectedVersion: number
  expectedUpdatedAt: string
  data: CaseReadingReleaseData
}

/** Scope is the reviewed published record; persistence and backup belong to the CLI. */
export function prepareSouthAfricaReadingRelease(
  currentInput: AdminCaseView,
  sourceInput: CaseView,
  candidateInput: CaseView,
  now = new Date(),
): CaseReadingReleasePlan {
  const current = adminCaseViewSchema.parse(currentInput)
  const source = caseViewSchema.parse(sourceInput)
  const candidate = caseViewSchema.parse(candidateInput)
  assert.equal(source.id, SOUTH_AFRICA_READING_ID)
  assert.equal(source.slug, SOUTH_AFRICA_READING_SLUG)
  assert.equal(source.version, SOUTH_AFRICA_READING_VERSION)
  assert.deepEqual(candidate, southAfricaReadingCandidate(source), 'Candidate differs from the reviewed transform')
  caseInputSchema.parse(current)
  assert.equal(current.status, 'PUBLISHED', 'Source must remain published')
  assert.equal(current.publicationApproved, true)
  assert.ok(current.publishedAt && new Date(current.publishedAt) <= now, 'Source must be publicly eligible')
  const publicCurrent = publicCaseView(current)
  if (current.version > source.version && isDeepStrictEqual({ ...publicCurrent, version: source.version, updatedAt: source.updatedAt }, candidate)) return { action: 'unchanged' }
  assert.deepEqual(publicCurrent, source, 'Current source changed; refusing to overwrite')
  return {
    action: 'apply', expectedVersion: source.version, expectedUpdatedAt: source.updatedAt,
    data: {
      title: candidate.title, summary: candidate.summary, buyerProfile: candidate.buyerProfile,
      procurement: candidate.procurement, sections: candidate.sections, gallery: candidate.gallery,
      relatedLinks: candidate.relatedLinks,
    },
  }
}
