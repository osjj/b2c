import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import {
  extractOfferId,
  normalizeUrl,
  normalizeImageUrl,
  deduplicateImages,
} from './utils'
import { get1688Cookie } from './settings'
import type {
  ScrapedProduct,
  ScrapedPriceTier,
  ScrapedVariant,
  ScraperResult,
} from './types'

const PAGE_TIMEOUT = 20_000
const TOTAL_TIMEOUT = 90_000
const MAX_RETRIES = 2

// 注入反自动化检测脚本（规避 webdriver / headless 指纹）
const STEALTH_SCRIPT = `
// 隐藏 webdriver 标记
Object.defineProperty(navigator, 'webdriver', { get: () => undefined })

// 模拟真实 Chrome 插件列表（headless 默认为空）
Object.defineProperty(navigator, 'plugins', {
  get: () => {
    const arr = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ]
    Object.setPrototypeOf(arr, PluginArray.prototype)
    return arr
  },
})

// 模拟语言列表
Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en-US', 'en'] })

// 修复 Notification.permission（headless 下可能异常）
try {
  Object.defineProperty(Notification, 'permission', { get: () => 'default' })
} catch {}

// 修复 chrome 对象（headless 下可能缺失）
if (!window.chrome) {
  window.chrome = { runtime: {} }
}

// 隐藏 HeadlessChrome UA 特征（通过 navigator.userAgent 已在 context 层设置）
// 修复 permissions.query 返回值
const originalQuery = window.navigator.permissions?.query?.bind(window.navigator.permissions)
if (originalQuery) {
  window.navigator.permissions.query = (parameters) =>
    parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission, onchange: null } as PermissionStatus)
      : originalQuery(parameters)
}
`

export async function scrape1688Product(url: string): Promise<ScraperResult> {
  const startTime = Date.now()
  const offerId = extractOfferId(url)

  if (!offerId) {
    return {
      success: false,
      error: { code: 'INVALID_URL', message: '无效的 1688 商品链接' },
      duration: Date.now() - startTime,
    }
  }

  // 从 DB 读取 Cookie（fallback 到 env）
  const cookie = await get1688Cookie()
  if (!cookie) {
    return {
      success: false,
      error: { code: 'ACCESS_BLOCKED', message: '未配置 Cookie，请在设置页面更新 1688 Cookie' },
      duration: Date.now() - startTime,
    }
  }

  const normalizedUrl = normalizeUrl(url)!

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // 第 2、3 次尝试前等待，避免连续触发风控
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 2000 * attempt))
      console.log(`[scraper] retry attempt ${attempt}/${MAX_RETRIES}`)
    }

    let browser: Browser | null = null

    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--disable-infobars',
          '--window-size=1920,1080',
        ],
      })

      const context: BrowserContext = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
        extraHTTPHeaders: {
          'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      })

      // 注入反检测脚本（在每个页面导航前执行）
      await context.addInitScript(STEALTH_SCRIPT)

      // 注入 Cookie
      const cookies = parseCookieString(cookie, '.1688.com')
      if (cookies.length > 0) {
        await context.addCookies(cookies)
      }

      const page = await context.newPage()

      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TOTAL_TIMEOUT')), TOTAL_TIMEOUT)
      )

      const scrapePromise = scrapePageContent(page, normalizedUrl, offerId)

      const result = await Promise.race([scrapePromise, timeoutPromise])

      return {
        success: true,
        data: result,
        warnings: collectWarnings(result),
        duration: Date.now() - startTime,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)

      // Cookie 失效 / 登录拦截：不重试，立即返回
      if (message.includes('ACCESS_BLOCKED') || message.includes('login')) {
        return {
          success: false,
          error: { code: 'ACCESS_BLOCKED', message: '访问被拦截，请更新 Cookie' },
          duration: Date.now() - startTime,
        }
      }

      // 最后一次尝试仍失败，返回具体错误
      if (attempt === MAX_RETRIES) {
        if (message === 'TOTAL_TIMEOUT' || message.includes('Timeout')) {
          return {
            success: false,
            error: { code: 'PAGE_TIMEOUT', message: '页面加载超时，请重试' },
            duration: Date.now() - startTime,
          }
        }
        return {
          success: false,
          error: { code: 'PARSE_ERROR', message: `采集失败: ${message}` },
          duration: Date.now() - startTime,
        }
      }

      console.log(`[scraper] attempt ${attempt + 1} failed: ${message}`)
    } finally {
      if (browser) await browser.close()
    }
  }

  return {
    success: false,
    error: { code: 'PARSE_ERROR', message: '采集失败' },
    duration: Date.now() - startTime,
  }
}

async function scrapePageContent(
  page: Page,
  url: string,
  offerId: string
): Promise<ScrapedProduct> {
  // 在 goto 之前注册卖家详情模板脚本拦截器
  // 1688 详情图嵌在 itemcdn.tmall.com/1688offer/* 脚本里，无需登录
  let icossTimerRef: ReturnType<typeof setTimeout> | null = null
  const icossPromise = new Promise<string[]>(resolve => {
    const handler = async (resp: import('playwright').Response) => {
      const respUrl = resp.url()
      if (
        (respUrl.includes('itemcdn.tmall.com') || respUrl.includes('itemcdn.tbcdn.cn')) &&
        respUrl.includes('1688offer')
      ) {
        if (icossTimerRef) clearTimeout(icossTimerRef)
        page.off('response', handler)
        try {
          const text = await resp.text()
          const imgs = parseIcossImages(text)
          console.log(`[scraper] detail template: ${imgs.length} imgs, url=${respUrl.slice(0, 80)}`)
          resolve(imgs)
        } catch {
          resolve([])
        }
      }
    }
    page.on('response', handler)
  })

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: PAGE_TIMEOUT,
  })

  // 检测登录重定向
  if (page.url().includes('login.') || page.url().includes('login/')) {
    throw new Error('ACCESS_BLOCKED')
  }

  // 检测滑块验证码（Cookie 失效或 IP 被限速时出现）
  const hasCaptcha = await page.evaluate(() =>
    document.querySelectorAll('#nc_1, .nc-container, [class*="captcha"]').length > 0 ||
    document.body.innerText.includes('请拖动') ||
    document.body.innerText.includes('滑块')
  ).catch(() => false)
  if (hasCaptcha) {
    throw new Error('ACCESS_BLOCKED')
  }

  // goto 完成后再启动计时（ICOSS 通常随 domcontentloaded 一起加载，但给 15s 余量）
  const icossWithTimeout = Promise.race([
    icossPromise,
    new Promise<string[]>(resolve => {
      icossTimerRef = setTimeout(() => {
        console.log('[scraper] detail template not found within 15s')
        resolve([])
      }, 15000)
    }),
  ])

  // 页面已加载后，DOM 查询快速失败（不需要 Playwright 等待元素出现）
  page.setDefaultTimeout(3000)

  // 等待客户端渲染完成（1688 是 CSR，domcontentloaded 后还需要 JS 运行）
  await page.waitForSelector('.module-od-title', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(500)

  // 滚动触发主图等懒加载
  await autoScroll(page)

  // 并行采集不依赖滚动的字段
  const [name, description, priceData, variants, specifications, mainImages] =
    await Promise.all([
      extractName(page),
      extractDescription(page),
      extractPriceData(page),
      extractVariants(page),
      extractSpecifications(page),
      extractMainImages(page),
    ])

  // 等待 ICOSS 详情图
  const detailImages = await icossWithTimeout
  if (icossTimerRef) clearTimeout(icossTimerRef)

  const skuImages = variants
    .flatMap((v) => v.options.map((o) => o.imageUrl).filter(Boolean) as string[])

  return {
    name,
    description,
    price: priceData.price,
    comparePrice: priceData.comparePrice,
    priceTiers: priceData.priceTiers,
    variants,
    specifications,
    mainImages: deduplicateImages(mainImages),
    skuImages: deduplicateImages(skuImages),
    detailImages: deduplicateImages(detailImages),
    sourceUrl: url,
    offerId,
  }
}

// --- Field extractors ---

async function extractName(page: Page): Promise<string> {
  // 1688 新版页面商品标题在 .module-od-title
  const text = await page.locator('.module-od-title').first().innerText().catch(() => null)
  if (text?.trim()) return text.trim()
  // 降级：取 meta og:title
  const meta = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null)
  return meta?.trim() || ''
}

async function extractDescription(page: Page): Promise<string> {
  const meta = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null)
  return meta?.trim() || ''
}

async function extractPriceData(page: Page): Promise<{
  price: number
  comparePrice?: number
  priceTiers: ScrapedPriceTier[]
}> {
  const priceTiers: ScrapedPriceTier[] = []

  // 从 .module-od-main-price 提取价格文本，如 "¥ 79 .00 起" 或阶梯价
  const priceText = await page.locator('.module-od-main-price').first().innerText().catch(() => '')

  // 解析价格区间：可能有多行，如 "1-9件 ¥120\n10-99件 ¥100\n100件+ ¥79"
  const lines = priceText.split('\n').map(l => l.trim()).filter(Boolean)
  for (const line of lines) {
    const qtyMatch = line.match(/(\d+)\s*[件个条\-+~～]/)
    const priceMatch = line.match(/[¥￥]\s*([\d.]+)/)
    if (qtyMatch && priceMatch) {
      priceTiers.push({
        minQuantity: parseInt(qtyMatch[1]),
        price: parseFloat(priceMatch[1]),
      })
    }
  }

  priceTiers.sort((a, b) => a.minQuantity - b.minQuantity)
  for (let i = 0; i < priceTiers.length - 1; i++) {
    priceTiers[i].maxQuantity = priceTiers[i + 1].minQuantity - 1
  }

  // 基础价格：从价格文本里取最小数字
  let price = 0
  const allPrices = [...priceText.matchAll(/[¥￥]\s*([\d.]+)/g)].map(m => parseFloat(m[1]))
  if (allPrices.length > 0) price = Math.min(...allPrices)

  if (priceTiers.length > 0 && price === 0) {
    price = Math.min(...priceTiers.map((t) => t.price))
  }

  return { price, priceTiers }
}

async function extractVariants(page: Page): Promise<ScrapedVariant[]> {
  const variants: ScrapedVariant[] = []

  // 1688 新版：.module-od-sku-selection .feature-item
  const groups = page.locator('.module-od-sku-selection .feature-item')
  const groupCount = await groups.count().catch(() => 0)

  for (let i = 0; i < groupCount; i++) {
    const group = groups.nth(i)

    // 属性名在 .feature-item-label h3
    const name = (await group.locator('.feature-item-label h3').first().innerText().catch(() => ''))?.trim()
    if (!name) continue

    // 选项在 .expand-view-item
    const optionEls = group.locator('.expand-view-item')
    const optCount = await optionEls.count().catch(() => 0)
    const options: ScrapedVariant['options'] = []

    for (let j = 0; j < optCount; j++) {
      const optEl = optionEls.nth(j)
      const value = (await optEl.innerText().catch(() => ''))?.trim().split('\n')[0] || ''
      if (!value) continue

      const imageUrl = await optEl
        .locator('img.ant-image-img').first()
        .getAttribute('src')
        .then(src => src ? normalizeImageUrl(src) : undefined)
        .catch(() => undefined)

      options.push({ value, imageUrl })
    }

    if (options.length > 0) {
      variants.push({ name, options })
    }
  }

  return variants
}

async function extractSpecifications(page: Page): Promise<Record<string, string>> {
  const specs: Record<string, string> = {}

  // 1688 新版规格参数在 .module-od-product-attributes
  const attrRows = page.locator('.module-od-product-attributes tr')
  const rowCount = await attrRows.count().catch(() => 0)

  if (rowCount > 0) {
    for (let i = 0; i < rowCount; i++) {
      const cells = attrRows.nth(i).locator('td, th')
      const cellCount = await cells.count().catch(() => 0)
      if (cellCount >= 2) {
        const key = (await cells.nth(0).innerText().catch(() => ''))?.trim()
        const value = (await cells.nth(1).innerText().catch(() => ''))?.trim()
        if (key && value) specs[key] = value
      }
    }
  }

  // 如果表格方式没拿到，尝试 key:value 列表
  if (Object.keys(specs).length === 0) {
    const items = page.locator('.module-od-product-attributes [class*="item"], .module-od-product-attributes li')
    const count = await items.count().catch(() => 0)
    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).innerText().catch(() => ''))?.trim()
      if (!text) continue
      const colonSplit = text.split(/[:：]/)
      if (colonSplit.length >= 2) {
        const key = colonSplit[0].trim()
        const value = colonSplit.slice(1).join(':').trim()
        if (key && value) specs[key] = value
      }
    }
  }

  return specs
}

async function extractMainImages(page: Page): Promise<string[]> {
  // 1688 主图缩略图：img.od-gallery-img，src 为 _b.jpg 缩略版（小图）
  // 去掉 _b.jpg 后缀得到高清原图 URL
  const srcs = await page.evaluate(() => {
    return [...document.querySelectorAll('img.od-gallery-img')]
      .map(img => (img as HTMLImageElement).src)
      .filter(src => src && src.includes('alicdn.com') && src.includes('cib.jpg'))
  }).catch(() => [] as string[])

  // 去掉 _b.jpg 缩略图后缀，还原为高清原图
  const fullSize = srcs.map(src => src.replace(/_b\.jpg$/, ''))
  return [...new Set(fullSize)].map(normalizeImageUrl)
}

/**
 * 从 ICOSS 脚本内容中提取详情图 URL
 * ICOSS 脚本格式：var offer_details={"content":"<HTML with img tags>"}
 * 不需要登录，随页面加载一起加载
 */
function parseIcossImages(scriptText: string): string[] {
  // 提取 offer_details.content 字段（HTML 字符串）
  const match = scriptText.match(/var\s+offer_details\s*=\s*(\{[\s\S]*\})/)
  if (!match) return []
  try {
    const data = JSON.parse(match[1]) as { content?: string }
    const content = data.content || ''
    // 从 HTML 里提取 src="..." 的图片
    const imgPattern = /src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp|gif)[^"]*)"/gi
    const matches = [...content.matchAll(imgPattern)]
    const srcs = [...new Set(matches.map(m => m[1].split('?')[0]))] // 去掉 ?__r__= 缓存参数
    return srcs.map(normalizeImageUrl)
  } catch {
    return []
  }
}

// --- Helpers ---

async function autoScroll(page: Page): Promise<void> {
  try {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        // 内置 2.5s 超时，确保在 setDefaultTimeout 触发前自行完成
        const done = () => { window.scrollTo(0, 0); resolve() }
        const cap = setTimeout(done, 2500)
        let totalHeight = 0
        const timer = setInterval(() => {
          window.scrollBy(0, 500)
          totalHeight += 500
          if (totalHeight >= document.body.scrollHeight || totalHeight > 10000) {
            clearInterval(timer)
            clearTimeout(cap)
            done()
          }
        }, 200)
      })
    })
  } catch {
    // 滚动失败不影响采集
  }
  await page.waitForTimeout(300)
}

function parseCookieString(
  cookieStr: string,
  domain: string
): Array<{ name: string; value: string; domain: string; path: string }> {
  return cookieStr
    .split(';')
    .map((pair) => {
      const idx = pair.indexOf('=')
      if (idx === -1) return null
      const name = pair.slice(0, idx).trim()
      const value = pair.slice(idx + 1).trim()
      if (!name) return null
      return { name, value, domain, path: '/' }
    })
    .filter(Boolean) as Array<{ name: string; value: string; domain: string; path: string }>
}

function collectWarnings(data: ScrapedProduct): string[] {
  const warnings: string[] = []
  if (!data.name) warnings.push('未能提取到商品标题')
  if (data.price === 0) warnings.push('未能提取到价格')
  if (data.mainImages.length === 0) warnings.push('未能提取到主图')
  if (data.detailImages.length === 0) warnings.push('未能提取到详情图')
  if (Object.keys(data.specifications).length === 0) warnings.push('未能提取到规格参数')
  if (data.variants.length === 0) warnings.push('未能提取到 SKU 变体')
  return warnings
}
