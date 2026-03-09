import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

const KEY_1688_COOKIE = 'scraper_1688_cookie'
const KEY_BROWSER_API_KEY = 'scraper_browser_api_key'

/**
 * 获取 1688 Cookie：优先从数据库读取，fallback 到 env
 */
export async function get1688Cookie(): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY_1688_COOKIE } })
    if (row && typeof row.value === 'string' && row.value.trim()) {
      return row.value.trim()
    }
  } catch {
    // DB 不可用时降级
  }
  return process.env.SCRAPER_1688_COOKIE || ''
}

/**
 * 保存 1688 Cookie 到数据库
 */
export async function set1688Cookie(cookie: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key: KEY_1688_COOKIE },
    update: { value: cookie.trim() },
    create: { key: KEY_1688_COOKIE, value: cookie.trim() },
  })
}

/**
 * 获取采集器配置状态（用于 UI 展示）
 */
export async function getScraperStatus(): Promise<{
  hasCookie: boolean
  cookiePreview: string
  cookieSource: 'database' | 'env' | 'none'
}> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: KEY_1688_COOKIE } })
    if (row && typeof row.value === 'string' && row.value.trim()) {
      const val = row.value.trim()
      return {
        hasCookie: true,
        cookiePreview: maskCookie(val),
        cookieSource: 'database',
      }
    }
  } catch {
    // ignore
  }

  const envCookie = process.env.SCRAPER_1688_COOKIE || ''
  if (envCookie) {
    return {
      hasCookie: true,
      cookiePreview: maskCookie(envCookie),
      cookieSource: 'env',
    }
  }

  return { hasCookie: false, cookiePreview: '', cookieSource: 'none' }
}

function maskCookie(cookie: string): string {
  if (cookie.length <= 20) return '***'
  return cookie.slice(0, 10) + '...' + cookie.slice(-10)
}

// ─── 油猴插件 API Key ───────────────────────────────────────────────────────

/**
 * 获取浏览器插件 API Key（不存在则自动生成）
 */
export async function getOrCreateBrowserApiKey(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: KEY_BROWSER_API_KEY } })
  if (row && typeof row.value === 'string' && row.value.trim()) {
    return row.value.trim()
  }
  return generateNewBrowserApiKey()
}

/**
 * 生成新的 API Key（会覆盖旧的）
 */
export async function generateNewBrowserApiKey(): Promise<string> {
  const key = randomBytes(24).toString('hex')
  await prisma.setting.upsert({
    where: { key: KEY_BROWSER_API_KEY },
    update: { value: key },
    create: { key: KEY_BROWSER_API_KEY, value: key },
  })
  return key
}

/**
 * 验证 API Key 是否有效
 */
export async function validateBrowserApiKey(key: string): Promise<boolean> {
  if (!key) return false
  const row = await prisma.setting.findUnique({ where: { key: KEY_BROWSER_API_KEY } })
  return row !== null && typeof row.value === 'string' && row.value === key
}
