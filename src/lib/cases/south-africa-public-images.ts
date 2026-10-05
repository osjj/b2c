import { casePrivateImageUrl } from './private-image-path'
import { SOUTH_AFRICA_CASE_ID, SOUTH_AFRICA_CASE_SLUG, SOUTH_AFRICA_SOURCE_HASHES } from './south-africa-editorial-refresh'
import { caseInputSchema } from './types'
import type { AdminCaseView, CaseInput } from './types'

export const SOUTH_AFRICA_PUBLIC_IMAGE_PERMISSION = 'OWNER PUBLIC IMAGE PERMISSION 2026-10-05: The owner explicitly authorized all 16 original case images to be publicly accessible on the existing public R2 without another review or redaction round. Retain the private originals. This image permission does not authorize publishing the case or attest certificate authenticity, ordered-model correspondence or final delivery.'

export type SouthAfricaPublicImagePlan = {
  candidate: CaseInput
  objects: {
    sourceUrl: string
    key: string
    url: string
    sha256: string
    extension: 'png' | 'jpg'
  }[]
  alreadyPublic: boolean
}

function publicOrigin(publicBase: string): string {
  let base: URL
  let configured: URL
  try {
    base = new URL(publicBase)
    configured = new URL(process.env.R2_PUBLIC_URL || 'https://shop.laifappe.com')
  } catch {
    throw new Error('Invalid configured public image origin')
  }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash
    || base.pathname !== '/' || ![base.origin, `${base.origin}/`].includes(publicBase)
    || base.origin !== configured.origin) {
    throw new Error('Use the configured HTTPS public image origin without a path or credentials')
  }
  return base.origin
}

/** Approved image-only plan for the fixed source draft; no storage or database writes. */
export function makeSouthAfricaPublicImagePlan(current: AdminCaseView, publicBase: string): SouthAfricaPublicImagePlan {
  if (current.id !== SOUTH_AFRICA_CASE_ID || current.slug !== SOUTH_AFRICA_CASE_SLUG) {
    throw new Error('Public image copy is restricted to the approved source case')
  }
  if (current.status !== 'DRAFT' || current.publicationApproved !== false || current.publishedAt !== null) {
    throw new Error('Public image copy requires the unpublished unapproved source draft')
  }
  const origin = publicOrigin(publicBase)
  const objects = SOUTH_AFRICA_SOURCE_HASHES.map((sha256, index) => {
    const extension: 'png' | 'jpg' = [3, 4, 5, 6, 8].includes(index) ? 'jpg' : 'png'
    const key = `cases/${SOUTH_AFRICA_CASE_SLUG}/${sha256}.${extension}`
    return {
      sourceUrl: casePrivateImageUrl(SOUTH_AFRICA_CASE_ID, sha256, extension),
      key,
      url: `${origin}/${key}`,
      sha256,
      extension,
    }
  })
  if (current.gallery.length !== objects.length || current.coverImage !== current.gallery[0]?.url) {
    throw new Error('The approved sixteen-image source order and first-image cover are required')
  }
  const allPrivate = current.gallery.every((image, index) => image.url === objects[index]?.sourceUrl)
  const allPublic = current.gallery.every((image, index) => image.url === objects[index]?.url)
  if (!allPrivate && !allPublic) {
    throw new Error('Source images are changed, reordered, foreign or only partially public')
  }
  const hasPermissionRecord = current.privateNotes.split('\n').includes(SOUTH_AFRICA_PUBLIC_IMAGE_PERMISSION)
  if (allPublic && !hasPermissionRecord) {
    throw new Error('The existing public image plan is missing its recorded owner permission')
  }
  const privateNotes = hasPermissionRecord
    ? current.privateNotes
    : `${current.privateNotes}${current.privateNotes ? '\n\n' : ''}${SOUTH_AFRICA_PUBLIC_IMAGE_PERMISSION}`
  const candidate = caseInputSchema.parse({
    ...current,
    coverImage: objects[0]?.url,
    gallery: current.gallery.map((image, index) => ({ ...image, url: objects[index]?.url })),
    privateNotes,
  })
  return { candidate, objects, alreadyPublic: allPublic }
}
