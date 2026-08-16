export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
export const INDEXNOW_KEY = '64ed91cec851465284885c31057269f1'
export const INDEXNOW_MAX_URLS = 10_000
export const LAIFAPPE_CANONICAL_ORIGIN = 'https://www.laifappe.com'
export const INDEXNOW_KEY_LOCATION = `${LAIFAPPE_CANONICAL_ORIGIN}/${INDEXNOW_KEY}.txt`

const INDEXNOW_MAX_ERROR_BODY_BYTES = 4_096
const INDEXNOW_MAX_ERROR_DETAIL_LENGTH = 1_000
const INDEXNOW_SUCCESS_STATUSES = new Set([200, 202])

export type IndexNowPayload = {
  host: string
  key: string
  keyLocation: string
  urlList: string[]
}

export type IndexNowSubmissionResult = {
  status: number
  submittedUrlCount: number
}

function normalizeIndexNowUrl(candidate: string): string {
  const value = candidate.trim()

  if (!value) {
    throw new Error('IndexNow URLs must not be empty')
  }

  if (/[\u0000-\u001F\u007F\\]/.test(value)) {
    throw new Error(`Invalid IndexNow URL: ${candidate}`)
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(value)
    decodeURI(parsedUrl.href)
  } catch {
    throw new Error(`Invalid IndexNow URL: ${candidate}`)
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error(`IndexNow URL must use HTTPS: ${candidate}`)
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error(`IndexNow URL must not include credentials: ${candidate}`)
  }

  if (parsedUrl.origin !== LAIFAPPE_CANONICAL_ORIGIN) {
    throw new Error(
      `IndexNow URL must use the canonical origin ${LAIFAPPE_CANONICAL_ORIGIN}: ${candidate}`
    )
  }

  if (parsedUrl.hash) {
    throw new Error(`IndexNow URL must not include a fragment: ${candidate}`)
  }

  return parsedUrl.href
}

export function buildIndexNowPayload(
  candidates: ReadonlyArray<string>
): IndexNowPayload {
  if (candidates.length === 0) {
    throw new Error('At least one IndexNow URL is required')
  }

  const urlList = Array.from(
    new Set(candidates.map((candidate) => normalizeIndexNowUrl(candidate)))
  )

  if (urlList.length > INDEXNOW_MAX_URLS) {
    throw new Error(
      `IndexNow accepts at most ${INDEXNOW_MAX_URLS} unique URLs per submission; received ${urlList.length}`
    )
  }

  return {
    host: new URL(LAIFAPPE_CANONICAL_ORIGIN).host,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList,
  }
}

function formatErrorDetail(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (normalized.length <= INDEXNOW_MAX_ERROR_DETAIL_LENGTH) {
    return normalized
  }

  return `${normalized.slice(0, INDEXNOW_MAX_ERROR_DETAIL_LENGTH)}...`
}

function formatUnknownError(error: unknown): string {
  return formatErrorDetail(error instanceof Error ? error.message : String(error))
}

async function readBoundedResponseBody(response: Response): Promise<string> {
  if (!response.body) {
    return ''
  }

  const reader = response.body.getReader()
  const bytes = new Uint8Array(INDEXNOW_MAX_ERROR_BODY_BYTES)
  let byteCount = 0
  let isTruncated = false

  try {
    while (byteCount < INDEXNOW_MAX_ERROR_BODY_BYTES) {
      const result = await reader.read()
      if (result.done) {
        break
      }

      const remainingBytes = INDEXNOW_MAX_ERROR_BODY_BYTES - byteCount
      const chunk = result.value.subarray(0, remainingBytes)
      bytes.set(chunk, byteCount)
      byteCount += chunk.byteLength

      if (chunk.byteLength < result.value.byteLength) {
        isTruncated = true
        break
      }
    }

    if (byteCount === INDEXNOW_MAX_ERROR_BODY_BYTES) {
      isTruncated = true
    }
  } catch {
    return ''
  } finally {
    try {
      await reader.cancel()
    } catch {
      // The HTTP status remains useful when best-effort response cleanup fails.
    }
    reader.releaseLock()
  }

  const decoded = new TextDecoder().decode(bytes.subarray(0, byteCount))
  const detail = formatErrorDetail(decoded)
  return detail && isTruncated ? `${detail}...` : detail
}

export async function submitIndexNow(
  candidates: ReadonlyArray<string>,
  fetchImplementation: typeof fetch = fetch
): Promise<IndexNowSubmissionResult> {
  const payload = buildIndexNowPayload(candidates)

  let response: Response
  try {
    response = await fetchImplementation(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    throw new Error(`IndexNow network request failed: ${formatUnknownError(error)}`)
  }

  if (!INDEXNOW_SUCCESS_STATUSES.has(response.status)) {
    const responseBody = await readBoundedResponseBody(response)
    const details = responseBody ? `: ${responseBody}` : ''
    const normalizedStatusText = formatErrorDetail(response.statusText)
    const statusText = normalizedStatusText ? ` ${normalizedStatusText}` : ''
    throw new Error(
      `IndexNow request failed with HTTP ${response.status}${statusText}${details}`
    )
  }

  return {
    status: response.status,
    submittedUrlCount: payload.urlList.length,
  }
}
