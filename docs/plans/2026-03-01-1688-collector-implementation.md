# 1688 商品采集器 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 admin 后台实现 1688 商品采集功能，用户粘贴链接 → Playwright 采集 → 预览编辑 → 确认保存到数据库。

**Architecture:** Playwright headless 浏览器加载 1688 商品页，DOM 提取结构化数据，通过 API 路由返回给前端预览，确认后下载图片到 R2 并创建 Product 记录。采集引擎独立封装在 `src/lib/scraper/` 下。

**Tech Stack:** Playwright, Next.js API Routes, Prisma, Cloudflare R2 (via S3 SDK), Sharp, Zod

---

### Task 1: 安装 Playwright 依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装 playwright**

Run:
```bash
npm install playwright
npx playwright install chromium
```

**Step 2: 验证安装**

Run:
```bash
npx playwright --version
```
Expected: 版本号输出，无报错

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add playwright dependency for 1688 scraper"
```

---

### Task 2: 创建采集数据类型定义

**Files:**
- Create: `src/lib/scraper/types.ts`

**Step 1: 创建类型文件**

```typescript
// src/lib/scraper/types.ts

export interface ScrapedProduct {
  /** 商品标题 */
  name: string
  /** 商品描述/卖点 */
  description: string
  /** 最低价格 */
  price: number
  /** 划线价/原价 */
  comparePrice?: number
  /** 阶梯价列表 */
  priceTiers: ScrapedPriceTier[]
  /** SKU 变体列表 */
  variants: ScrapedVariant[]
  /** 规格参数 */
  specifications: Record<string, string>
  /** 主图 URL 列表（1688 CDN） */
  mainImages: string[]
  /** SKU 关联图片 */
  skuImages: string[]
  /** 详情图 URL 列表（1688 CDN） */
  detailImages: string[]
  /** 1688 原始链接 */
  sourceUrl: string
  /** 1688 offerId */
  offerId: string
}

export interface ScrapedPriceTier {
  minQuantity: number
  maxQuantity?: number
  price: number
}

export interface ScrapedVariant {
  name: string
  options: ScrapedVariantOption[]
}

export interface ScrapedVariantOption {
  /** 属性值名称，如 "红色"、"XL" */
  value: string
  /** 关联图片 URL */
  imageUrl?: string
  /** 该选项的价格（如果 SKU 有独立定价） */
  price?: number
}

export type ScraperErrorCode =
  | 'INVALID_URL'
  | 'ACCESS_BLOCKED'
  | 'PAGE_TIMEOUT'
  | 'PARSE_ERROR'
  | 'INCOMPLETE_DATA'

export interface ScraperResult {
  success: boolean
  data?: ScrapedProduct
  error?: {
    code: ScraperErrorCode
    message: string
  }
  /** 部分数据不完整时的警告 */
  warnings?: string[]
  /** 采集耗时 (ms) */
  duration: number
}
```

**Step 2: Commit**

```bash
git add src/lib/scraper/types.ts
git commit -m "feat: add 1688 scraper type definitions"
```

---

### Task 3: 创建 URL 解析工具

**Files:**
- Create: `src/lib/scraper/utils.ts`

**Step 1: 创建工具函数**

```typescript
// src/lib/scraper/utils.ts

/**
 * 从 1688 商品链接中提取 offerId
 * 支持格式：
 * - https://detail.1688.com/offer/123456.html
 * - https://m.1688.com/offer/123456.html
 * - https://detail.1688.com/offer/123456.html?spm=xxx
 */
export function extractOfferId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('1688.com')) return null
    const match = parsed.pathname.match(/offer\/(\d+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

/**
 * 标准化 1688 商品链接
 */
export function normalizeUrl(url: string): string | null {
  const offerId = extractOfferId(url)
  if (!offerId) return null
  return `https://detail.1688.com/offer/${offerId}.html`
}

/**
 * 规范化图片 URL：去除参数，确保 https
 */
export function normalizeImageUrl(url: string): string {
  if (!url) return url
  // 去掉缩略图参数
  let cleaned = url.split('?')[0]
  // 确保 https
  if (cleaned.startsWith('//')) {
    cleaned = 'https:' + cleaned
  }
  return cleaned
}

/**
 * 图片 URL 去重
 */
export function deduplicateImages(urls: string[]): string[] {
  const seen = new Set<string>()
  return urls.filter((url) => {
    const normalized = normalizeImageUrl(url)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

/**
 * 解析价格字符串为数字
 * "¥12.50" -> 12.50
 * "12.50-25.00" -> 12.50 (取最低)
 */
export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[¥￥,\s]/g, '')
  // 处理区间价 "12.50-25.00"
  const rangeMatch = cleaned.match(/([\d.]+)/)
  if (rangeMatch) {
    const num = parseFloat(rangeMatch[1])
    return isNaN(num) ? null : num
  }
  return null
}
```

**Step 2: Commit**

```bash
git add src/lib/scraper/utils.ts
git commit -m "feat: add 1688 URL parsing and image utilities"
```

---

### Task 4: 创建 Playwright 采集引擎核心

**Files:**
- Create: `src/lib/scraper/1688-collector.ts`

**Step 1: 创建采集引擎**

```typescript
// src/lib/scraper/1688-collector.ts

import { chromium, type Browser, type Page } from 'playwright'
import {
  extractOfferId,
  normalizeUrl,
  normalizeImageUrl,
  deduplicateImages,
  parsePrice,
} from './utils'
import type {
  ScrapedProduct,
  ScrapedPriceTier,
  ScrapedVariant,
  ScraperResult,
} from './types'

const PAGE_TIMEOUT = 15_000
const TOTAL_TIMEOUT = 30_000

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

  const normalizedUrl = normalizeUrl(url)!
  const cookie = process.env.SCRAPER_1688_COOKIE || ''

  let browser: Browser | null = null

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
    })

    // 注入 Cookie
    if (cookie) {
      const cookies = parseCookieString(cookie, '.1688.com')
      if (cookies.length > 0) {
        await context.addCookies(cookies)
      }
    }

    const page = await context.newPage()

    // 设置超时
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('TOTAL_TIMEOUT')),
        TOTAL_TIMEOUT
      )
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

    if (message === 'TOTAL_TIMEOUT' || message.includes('Timeout')) {
      return {
        success: false,
        error: { code: 'PAGE_TIMEOUT', message: '页面加载超时，请重试' },
        duration: Date.now() - startTime,
      }
    }

    if (
      message.includes('login') ||
      message.includes('ACCESS_BLOCKED')
    ) {
      return {
        success: false,
        error: {
          code: 'ACCESS_BLOCKED',
          message: '访问被拦截，请更新 Cookie',
        },
        duration: Date.now() - startTime,
      }
    }

    return {
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: `采集失败: ${message}`,
      },
      duration: Date.now() - startTime,
    }
  } finally {
    if (browser) await browser.close()
  }
}

async function scrapePageContent(
  page: Page,
  url: string,
  offerId: string
): Promise<ScrapedProduct> {
  // 加载页面
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: PAGE_TIMEOUT,
  })

  // 检测登录重定向
  if (page.url().includes('login.') || page.url().includes('login/')) {
    throw new Error('ACCESS_BLOCKED')
  }

  // 等待主要内容加载（随机延迟 1-3s 模拟人类行为）
  await page.waitForTimeout(1000 + Math.random() * 2000)

  // 滚动页面触发懒加载
  await autoScroll(page)

  // 并行提取各字段
  const [name, description, priceData, variants, specifications, mainImages, detailImages] =
    await Promise.all([
      extractName(page),
      extractDescription(page),
      extractPriceData(page),
      extractVariants(page),
      extractSpecifications(page),
      extractMainImages(page),
      extractDetailImages(page),
    ])

  // 从变体中提取 SKU 图片
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

// --- 字段提取函数 ---

async function extractName(page: Page): Promise<string> {
  const selectors = [
    '.title-text',
    'h1.title',
    '[class*="title"] h1',
    '.offer-title',
    'h1',
  ]
  for (const sel of selectors) {
    const text = await page.locator(sel).first().textContent().catch(() => null)
    if (text?.trim()) return text.trim()
  }
  return ''
}

async function extractDescription(page: Page): Promise<string> {
  const selectors = [
    '.offer-description',
    '[class*="description"]',
    '.detail-description',
  ]
  for (const sel of selectors) {
    const text = await page.locator(sel).first().textContent().catch(() => null)
    if (text?.trim()) return text.trim()
  }
  return ''
}

async function extractPriceData(page: Page): Promise<{
  price: number
  comparePrice?: number
  priceTiers: ScrapedPriceTier[]
}> {
  const priceTiers: ScrapedPriceTier[] = []

  // 尝试提取阶梯价表格
  const tierRows = page.locator(
    '[class*="price"] table tr, [class*="ladder"] tr, [class*="tier"] tr, .price-item, [class*="rangePrice"] li, [class*="range-price"] li'
  )
  const rowCount = await tierRows.count().catch(() => 0)

  if (rowCount > 0) {
    for (let i = 0; i < rowCount; i++) {
      const row = tierRows.nth(i)
      const text = await row.textContent().catch(() => '')
      if (!text) continue

      // 尝试提取 "≥100件 ¥12.50" 或 "100-499 ¥12.50"
      const qtyMatch = text.match(/[≥>=]?\s*(\d+)\s*[件个条]?/)
      const priceMatch = text.match(/[¥￥]?\s*([\d.]+)/)

      if (qtyMatch && priceMatch) {
        priceTiers.push({
          minQuantity: parseInt(qtyMatch[1]),
          price: parseFloat(priceMatch[1]),
        })
      }
    }
  }

  // 按 minQuantity 排序并设置 maxQuantity
  priceTiers.sort((a, b) => a.minQuantity - b.minQuantity)
  for (let i = 0; i < priceTiers.length - 1; i++) {
    priceTiers[i].maxQuantity = priceTiers[i + 1].minQuantity - 1
  }

  // 提取基础价格
  let price = 0
  const priceSelectors = [
    '[class*="price"] .value',
    '.price-text',
    '[class*="currentPrice"]',
    '.offer-price',
    '[class*="price"]',
  ]
  for (const sel of priceSelectors) {
    const text = await page.locator(sel).first().textContent().catch(() => null)
    if (text) {
      const parsed = parsePrice(text)
      if (parsed !== null && parsed > 0) {
        price = parsed
        break
      }
    }
  }

  // 如果有阶梯价，取最低价
  if (priceTiers.length > 0 && price === 0) {
    price = Math.min(...priceTiers.map((t) => t.price))
  }

  return { price, priceTiers }
}

async function extractVariants(page: Page): Promise<ScrapedVariant[]> {
  const variants: ScrapedVariant[] = []

  // 1688 的 SKU 选择区域
  const skuGroups = page.locator(
    '[class*="sku"] [class*="prop"], [class*="sku-item-wrapper"], .offer-sku .prop-group'
  )
  const groupCount = await skuGroups.count().catch(() => 0)

  for (let i = 0; i < groupCount; i++) {
    const group = skuGroups.nth(i)

    // 属性名称，如 "颜色"、"尺码"
    const nameEl = group.locator('[class*="name"], [class*="label"], dt').first()
    const name = (await nameEl.textContent().catch(() => ''))?.replace(/[:：]/, '').trim() || `属性${i + 1}`

    // 属性选项
    const optionEls = group.locator(
      '[class*="value"] li, [class*="option"], dd li, button[class*="sku"]'
    )
    const optCount = await optionEls.count().catch(() => 0)
    const options: ScrapedVariant['options'] = []

    for (let j = 0; j < optCount; j++) {
      const optEl = optionEls.nth(j)
      const value = (await optEl.textContent().catch(() => ''))?.trim() || ''
      if (!value) continue

      // 尝试获取 SKU 图片
      const img = optEl.locator('img').first()
      const imageUrl = await img
        .getAttribute('src')
        .then((src) => (src ? normalizeImageUrl(src) : undefined))
        .catch(() => undefined)

      options.push({ value, imageUrl })
    }

    if (options.length > 0) {
      variants.push({ name, options })
    }
  }

  return variants
}

async function extractSpecifications(
  page: Page
): Promise<Record<string, string>> {
  const specs: Record<string, string> = {}

  // 商品参数表格
  const specSelectors = [
    '[class*="attributes"] table tr',
    '[class*="param"] tr',
    '.offer-attr-list li',
    '[class*="detail-attributes"] li',
    '[class*="attr-item"]',
  ]

  for (const sel of specSelectors) {
    const rows = page.locator(sel)
    const count = await rows.count().catch(() => 0)

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i)
        const text = (await row.textContent().catch(() => '')) || ''

        // 尝试拆分 "key: value" 或 "key value"
        const colonSplit = text.split(/[:：]/)
        if (colonSplit.length >= 2) {
          const key = colonSplit[0].trim()
          const value = colonSplit.slice(1).join(':').trim()
          if (key && value) specs[key] = value
          continue
        }

        // 尝试用 td/th 提取
        const cells = row.locator('td, th')
        const cellCount = await cells.count()
        if (cellCount >= 2) {
          const key = (await cells.nth(0).textContent())?.trim() || ''
          const value = (await cells.nth(1).textContent())?.trim() || ''
          if (key && value) specs[key] = value
        }
      }
      if (Object.keys(specs).length > 0) break
    }
  }

  return specs
}

async function extractMainImages(page: Page): Promise<string[]> {
  const images: string[] = []

  const imgSelectors = [
    '[class*="main-image"] img',
    '[class*="gallery"] img',
    '[class*="thumb"] img',
    '.offer-image img',
    '[class*="carousel"] img',
    '.vertical-img-list img',
    '.detail-gallery-turn img',
  ]

  for (const sel of imgSelectors) {
    const imgs = page.locator(sel)
    const count = await imgs.count().catch(() => 0)

    for (let i = 0; i < count; i++) {
      const src =
        (await imgs.nth(i).getAttribute('src').catch(() => null)) ||
        (await imgs.nth(i).getAttribute('data-src').catch(() => null))
      if (src) images.push(normalizeImageUrl(src))
    }

    if (images.length > 0) break
  }

  return images
}

async function extractDetailImages(page: Page): Promise<string[]> {
  const images: string[] = []

  const detailSelectors = [
    '[class*="detail-content"] img',
    '[class*="offer-detail"] img',
    '#desc-lazyload-container img',
    '.detail-desc img',
    '[class*="richTextContent"] img',
  ]

  for (const sel of detailSelectors) {
    const imgs = page.locator(sel)
    const count = await imgs.count().catch(() => 0)

    for (let i = 0; i < count; i++) {
      const src =
        (await imgs.nth(i).getAttribute('src').catch(() => null)) ||
        (await imgs.nth(i).getAttribute('data-src').catch(() => null)) ||
        (await imgs.nth(i).getAttribute('data-lazyload-src').catch(() => null))
      if (src && !src.includes('data:image')) {
        images.push(normalizeImageUrl(src))
      }
    }

    if (images.length > 0) break
  }

  return images
}

// --- 辅助函数 ---

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0
      const distance = 500
      const timer = setInterval(() => {
        window.scrollBy(0, distance)
        totalHeight += distance
        if (totalHeight >= document.body.scrollHeight || totalHeight > 10000) {
          clearInterval(timer)
          window.scrollTo(0, 0)
          resolve()
        }
      }, 200)
    })
  })
  // 等待懒加载图片
  await page.waitForTimeout(1500)
}

function parseCookieString(
  cookieStr: string,
  domain: string
): Array<{
  name: string
  value: string
  domain: string
  path: string
}> {
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
    .filter(Boolean) as Array<{
    name: string
    value: string
    domain: string
    path: string
  }>
}

function collectWarnings(data: ScrapedProduct): string[] {
  const warnings: string[] = []
  if (!data.name) warnings.push('未能提取到商品标题')
  if (data.price === 0) warnings.push('未能提取到价格')
  if (data.mainImages.length === 0) warnings.push('未能提取到主图')
  if (data.detailImages.length === 0) warnings.push('未能提取到详情图')
  if (Object.keys(data.specifications).length === 0)
    warnings.push('未能提取到规格参数')
  if (data.variants.length === 0) warnings.push('未能提取到 SKU 变体')
  return warnings
}
```

**Step 2: Commit**

```bash
git add src/lib/scraper/1688-collector.ts
git commit -m "feat: implement 1688 Playwright DOM collector engine"
```

---

### Task 5: 创建 API 路由

**Files:**
- Create: `src/app/api/admin/products/scrape-1688/route.ts`

**Step 1: 创建 API 路由**

```typescript
// src/app/api/admin/products/scrape-1688/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { scrape1688Product } from '@/lib/scraper/1688-collector'
import { extractOfferId } from '@/lib/scraper/utils'

export async function POST(request: NextRequest) {
  // 鉴权
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: '请提供 1688 商品链接' },
        { status: 400 }
      )
    }

    const offerId = extractOfferId(url)
    if (!offerId) {
      return NextResponse.json(
        { error: '无效的 1688 商品链接，请检查 URL 格式' },
        { status: 400 }
      )
    }

    const result = await scrape1688Product(url)

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error?.message || '采集失败',
          code: result.error?.code,
          duration: result.duration,
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      data: result.data,
      warnings: result.warnings,
      duration: result.duration,
    })
  } catch (error) {
    console.error('[scrape-1688] Unexpected error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/admin/products/scrape-1688/route.ts
git commit -m "feat: add POST /api/admin/products/scrape-1688 API route"
```

---

### Task 6: 创建图片下载与上传服务

**Files:**
- Create: `src/lib/scraper/image-transfer.ts`

**Step 1: 创建图片转存服务**

```typescript
// src/lib/scraper/image-transfer.ts

import sharp from 'sharp'
import { uploadToR2 } from '@/lib/r2'

interface TransferResult {
  originalUrl: string
  newUrl: string
  success: boolean
  error?: string
}

/**
 * 下载 1688 图片，处理后上传到 R2
 */
export async function transferImage(
  imageUrl: string,
  index: number
): Promise<TransferResult> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        Referer: 'https://detail.1688.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      return {
        originalUrl: imageUrl,
        newUrl: imageUrl,
        success: false,
        error: `HTTP ${response.status}`,
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    // 用 sharp 处理：转 webp，限制尺寸
    const processed = await sharp(buffer)
      .resize(2560, 2560, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer()

    const filename = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}.webp`
    const newUrl = await uploadToR2(processed, filename, 'image/webp')

    return { originalUrl: imageUrl, newUrl, success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      originalUrl: imageUrl,
      newUrl: imageUrl,
      success: false,
      error: message,
    }
  }
}

/**
 * 批量转存图片，返回 URL 映射表
 * 控制并发数避免过载
 */
export async function transferImages(
  imageUrls: string[],
  concurrency = 5
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>()
  const unique = [...new Set(imageUrls)]

  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency)
    const results = await Promise.all(
      batch.map((url, idx) => transferImage(url, i + idx))
    )
    for (const r of results) {
      urlMap.set(r.originalUrl, r.success ? r.newUrl : r.originalUrl)
    }
  }

  return urlMap
}
```

**Step 2: Commit**

```bash
git add src/lib/scraper/image-transfer.ts
git commit -m "feat: add image download and R2 transfer service"
```

---

### Task 7: 创建保存采集商品的 Server Action

**Files:**
- Create: `src/actions/collect.ts`

**Step 1: 创建 server action**

```typescript
// src/actions/collect.ts
'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { transferImages } from '@/lib/scraper/image-transfer'
import type { ScrapedProduct } from '@/lib/scraper/types'
import { revalidatePath } from 'next/cache'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `product-${Date.now()}`
}

export async function saveCollectedProduct(scrapedData: ScrapedProduct) {
  await requireAdmin()

  // 检查是否已存在同一 1688 链接的商品
  const existing = await prisma.product.findFirst({
    where: {
      specifications: {
        path: ['sourceUrl1688'],
        equals: scrapedData.sourceUrl,
      },
    },
  })

  if (existing) {
    return { success: false, error: '该商品已采集过', existingId: existing.id }
  }

  // 收集所有需要转存的图片
  const allImages = [
    ...scrapedData.mainImages,
    ...scrapedData.skuImages,
    ...scrapedData.detailImages,
  ]

  // 批量下载并上传到 R2
  const urlMap = await transferImages(allImages)

  // 替换图片 URL
  const mainImages = scrapedData.mainImages.map(
    (url) => urlMap.get(url) || url
  )
  const detailImages = scrapedData.detailImages.map(
    (url) => urlMap.get(url) || url
  )

  // 生成唯一 slug
  let slug = generateSlug(scrapedData.name)
  const slugExists = await prisma.product.findUnique({ where: { slug } })
  if (slugExists) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  // 构建规格参数（包含 1688 来源信息）
  const specifications = {
    ...scrapedData.specifications,
    sourceUrl1688: scrapedData.sourceUrl,
    offerId1688: scrapedData.offerId,
  }

  // 构建 EditorJS 详情内容
  const content = {
    time: Date.now(),
    blocks: detailImages.map((url) => ({
      type: 'image',
      data: { file: { url }, caption: '', withBorder: false, stretched: true, withBackground: false },
    })),
  }

  // 创建商品
  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        name: scrapedData.name,
        slug,
        description: scrapedData.description || null,
        price: scrapedData.price || 0,
        comparePrice: scrapedData.comparePrice || null,
        stock: 0,
        isActive: false, // 默认不上架，需手动上架
        specifications,
        content,
        images: {
          create: mainImages.map((url, i) => ({
            url,
            alt: scrapedData.name,
            sortOrder: i,
          })),
        },
        priceTiers: {
          create: scrapedData.priceTiers.map((tier, i) => ({
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity || null,
            price: tier.price,
            sortOrder: i,
          })),
        },
      },
      include: {
        images: true,
        priceTiers: true,
      },
    })

    return p
  })

  revalidatePath('/admin/products')

  return { success: true, productId: product.id, slug: product.slug }
}

export async function updateCollectedProduct(
  productId: string,
  scrapedData: ScrapedProduct
) {
  await requireAdmin()

  // 收集所有需要转存的图片
  const allImages = [
    ...scrapedData.mainImages,
    ...scrapedData.skuImages,
    ...scrapedData.detailImages,
  ]
  const urlMap = await transferImages(allImages)

  const mainImages = scrapedData.mainImages.map(
    (url) => urlMap.get(url) || url
  )
  const detailImages = scrapedData.detailImages.map(
    (url) => urlMap.get(url) || url
  )

  const specifications = {
    ...scrapedData.specifications,
    sourceUrl1688: scrapedData.sourceUrl,
    offerId1688: scrapedData.offerId,
  }

  const content = {
    time: Date.now(),
    blocks: detailImages.map((url) => ({
      type: 'image',
      data: { file: { url }, caption: '', withBorder: false, stretched: true, withBackground: false },
    })),
  }

  await prisma.$transaction(async (tx) => {
    // 删除旧关联数据
    await tx.productImage.deleteMany({ where: { productId } })
    await tx.priceTier.deleteMany({ where: { productId } })

    // 更新商品
    await tx.product.update({
      where: { id: productId },
      data: {
        name: scrapedData.name,
        description: scrapedData.description || null,
        price: scrapedData.price || 0,
        comparePrice: scrapedData.comparePrice || null,
        specifications,
        content,
        images: {
          create: mainImages.map((url, i) => ({
            url,
            alt: scrapedData.name,
            sortOrder: i,
          })),
        },
        priceTiers: {
          create: scrapedData.priceTiers.map((tier, i) => ({
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity || null,
            price: tier.price,
            sortOrder: i,
          })),
        },
      },
    })
  })

  revalidatePath('/admin/products')
  revalidatePath(`/admin/products/${productId}`)

  return { success: true, productId }
}
```

**Step 2: Commit**

```bash
git add src/actions/collect.ts
git commit -m "feat: add server actions for saving/updating collected products"
```

---

### Task 8: 创建 Admin 采集页面

**Files:**
- Create: `src/app/admin/products/collect/page.tsx`
- Create: `src/components/admin/product-collect-form.tsx`

**Step 1: 创建采集页面（服务端组件）**

```tsx
// src/app/admin/products/collect/page.tsx
import { ProductCollectForm } from '@/components/admin/product-collect-form'

export default function CollectProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">采集 1688 商品</h1>
        <p className="text-muted-foreground mt-1">
          粘贴 1688 商品链接，自动采集商品数据
        </p>
      </div>
      <ProductCollectForm />
    </div>
  )
}
```

**Step 2: 创建采集表单组件（客户端组件）**

```tsx
// src/components/admin/product-collect-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  saveCollectedProduct,
  updateCollectedProduct,
} from '@/actions/collect'
import type { ScrapedProduct } from '@/lib/scraper/types'

type CollectStatus = 'idle' | 'scraping' | 'previewing' | 'saving'

export function ProductCollectForm() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<CollectStatus>('idle')
  const [data, setData] = useState<ScrapedProduct | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [duration, setDuration] = useState(0)
  const [existingId, setExistingId] = useState<string | null>(null)

  async function handleScrape() {
    if (!url.trim()) {
      toast.error('请输入 1688 商品链接')
      return
    }

    setStatus('scraping')
    setData(null)
    setWarnings([])
    setExistingId(null)

    try {
      const res = await fetch('/api/admin/products/scrape-1688', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || '采集失败')
        setStatus('idle')
        return
      }

      setData(json.data)
      setWarnings(json.warnings || [])
      setDuration(json.duration)
      setStatus('previewing')
      toast.success(`采集成功，耗时 ${(json.duration / 1000).toFixed(1)}s`)
    } catch (error) {
      toast.error('网络错误，请重试')
      setStatus('idle')
    }
  }

  async function handleSave() {
    if (!data) return
    setStatus('saving')

    try {
      const result = existingId
        ? await updateCollectedProduct(existingId, data)
        : await saveCollectedProduct(data)

      if (!result.success) {
        if ('existingId' in result && result.existingId) {
          setExistingId(result.existingId)
          toast.error('该商品已采集过，点击"更新商品"可覆盖更新')
          setStatus('previewing')
          return
        }
        toast.error('error' in result ? result.error : '保存失败')
        setStatus('previewing')
        return
      }

      toast.success('商品保存成功')
      router.push(`/admin/products/${result.productId}`)
    } catch (error) {
      toast.error('保存失败，请重试')
      setStatus('previewing')
    }
  }

  return (
    <div className="space-y-6">
      {/* 输入区 */}
      <Card className="p-6">
        <div className="flex gap-3">
          <Input
            placeholder="粘贴 1688 商品链接，如 https://detail.1688.com/offer/xxx.html"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={status === 'scraping' || status === 'saving'}
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
          />
          <Button
            onClick={handleScrape}
            disabled={status === 'scraping' || status === 'saving'}
          >
            {status === 'scraping' ? '采集中...' : '采集'}
          </Button>
        </div>
      </Card>

      {/* 采集中提示 */}
      {status === 'scraping' && (
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>正在采集商品数据，请稍候（约 10-20 秒）...</span>
          </div>
        </Card>
      )}

      {/* 预览区 */}
      {status === 'previewing' && data && (
        <>
          {/* 警告信息 */}
          {warnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 p-4">
              <p className="font-medium text-yellow-800 mb-2">采集警告：</p>
              <ul className="list-disc list-inside text-sm text-yellow-700">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* 基本信息 */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">基本信息</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">商品标题</label>
                <Input
                  value={data.name}
                  onChange={(e) =>
                    setData({ ...data, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">商品描述</label>
                <Input
                  value={data.description}
                  onChange={(e) =>
                    setData({ ...data, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">价格</label>
                  <Input
                    type="number"
                    value={data.price}
                    onChange={(e) =>
                      setData({ ...data, price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                {data.comparePrice && (
                  <div>
                    <label className="text-sm text-muted-foreground">原价</label>
                    <Input type="number" value={data.comparePrice} disabled />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 阶梯价 */}
          {data.priceTiers.length > 0 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                阶梯价（{data.priceTiers.length} 档）
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">起订量</th>
                    <th className="text-left py-2">上限</th>
                    <th className="text-left py-2">单价</th>
                  </tr>
                </thead>
                <tbody>
                  {data.priceTiers.map((tier, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{tier.minQuantity}</td>
                      <td className="py-2">{tier.maxQuantity ?? '不限'}</td>
                      <td className="py-2">¥{tier.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* SKU 变体 */}
          {data.variants.length > 0 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                SKU 变体（{data.variants.length} 组）
              </h2>
              {data.variants.map((v, i) => (
                <div key={i}>
                  <p className="font-medium mb-2">{v.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {v.options.map((opt, j) => (
                      <div
                        key={j}
                        className="flex items-center gap-2 border rounded px-3 py-1.5 text-sm"
                      >
                        {opt.imageUrl && (
                          <img
                            src={opt.imageUrl}
                            alt={opt.value}
                            className="w-8 h-8 object-cover rounded"
                          />
                        )}
                        <span>{opt.value}</span>
                        {opt.price && (
                          <span className="text-muted-foreground">
                            ¥{opt.price}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* 规格参数 */}
          {Object.keys(data.specifications).length > 0 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                规格参数（{Object.keys(data.specifications).length} 项）
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(data.specifications).map(([key, value]) => (
                    <tr key={key} className="border-b">
                      <td className="py-2 font-medium w-1/3">{key}</td>
                      <td className="py-2">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* 主图 */}
          {data.mainImages.length > 0 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                主图（{data.mainImages.length} 张）
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {data.mainImages.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`主图 ${i + 1}`}
                    className="w-full aspect-square object-cover rounded border"
                  />
                ))}
              </div>
            </Card>
          )}

          {/* 详情图 */}
          {data.detailImages.length > 0 && (
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                详情图（{data.detailImages.length} 张）
              </h2>
              <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {data.detailImages.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`详情图 ${i + 1}`}
                    className="w-full object-cover rounded border"
                  />
                ))}
              </div>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={status === 'saving'}>
              {status === 'saving'
                ? '保存中...'
                : existingId
                  ? '更新商品'
                  : '保存商品'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStatus('idle')
                setData(null)
              }}
            >
              取消
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/admin/products/collect/page.tsx src/components/admin/product-collect-form.tsx
git commit -m "feat: add admin product collect page with preview and save"
```

---

### Task 9: 在 Admin 导航中添加采集入口

**Files:**
- Modify: admin 侧边栏或产品页面头部（需要确认具体文件位置）

**Step 1: 查找 admin 导航组件**

查看 `src/components/admin/` 或 `src/app/admin/layout.tsx` 中的导航配置，添加"采集商品"入口链接。

如果在产品列表页头部有操作按钮区域（已有"新建商品"按钮），在旁边添加"采集商品"按钮：

```tsx
<Link href="/admin/products/collect">
  <Button variant="outline">采集商品</Button>
</Link>
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add collect product entry in admin navigation"
```

---

### Task 10: 配置 Next.js 图片域名白名单

**Files:**
- Modify: `next.config.ts` 或 `next.config.mjs`

**Step 1: 添加 1688 CDN 域名到 images.remotePatterns**

在 Next.js 配置中添加 1688 图片 CDN 域名，以便 `<img>` 标签可以预览 1688 图片（如果使用 `next/image` 的话）：

```typescript
images: {
  remotePatterns: [
    // 现有配置...
    { protocol: 'https', hostname: '**.1688.com' },
    { protocol: 'https', hostname: '**.alicdn.com' },
    { protocol: 'https', hostname: 'cbu01.alicdn.com' },
  ],
}
```

> 注意：如果预览组件使用原生 `<img>` 而非 `next/image`，此步可跳过。

**Step 2: Commit**

```bash
git add next.config.*
git commit -m "feat: add 1688 CDN domains to image whitelist"
```

---

### Task 11: 端到端手动测试

**Step 1: 启动开发服务器**

Run: `npm run dev`

**Step 2: 测试采集流程**

1. 登录 admin 后台
2. 访问 `/admin/products/collect`
3. 粘贴一个真实的 1688 商品链接
4. 点击"采集"按钮
5. 验证：
   - 加载状态正常显示
   - 采集完成后显示预览
   - 标题、价格、规格、图片正确展示
   - 可编辑标题和描述
6. 点击"保存商品"
7. 验证：
   - 跳转到商品编辑页面
   - 图片已上传到 R2
   - 数据库记录正确

**Step 3: 测试错误场景**

- 输入无效 URL → 应显示错误提示
- Cookie 过期情况 → 应返回 ACCESS_BLOCKED
- 网络超时 → 应返回 PAGE_TIMEOUT

**Step 4: 根据测试结果调整 DOM 选择器**

1688 页面结构可能因版本不同而变化，根据实际页面 DOM 微调 `1688-collector.ts` 中的选择器。

**Step 5: Final Commit**

```bash
git add -A
git commit -m "fix: adjust 1688 DOM selectors based on real page testing"
```

---

## 文件清单

| 操作 | 文件路径 |
|---|---|
| Create | `src/lib/scraper/types.ts` |
| Create | `src/lib/scraper/utils.ts` |
| Create | `src/lib/scraper/1688-collector.ts` |
| Create | `src/lib/scraper/image-transfer.ts` |
| Create | `src/app/api/admin/products/scrape-1688/route.ts` |
| Create | `src/actions/collect.ts` |
| Create | `src/app/admin/products/collect/page.tsx` |
| Create | `src/components/admin/product-collect-form.tsx` |
| Modify | `package.json` (add playwright) |
| Modify | admin 导航组件 (add collect entry) |
| Modify | `next.config.*` (add image domains) |

## 依赖关系

```
Task 1 (install playwright)
    ↓
Task 2 (types) → Task 3 (utils) → Task 4 (collector engine)
                                        ↓
Task 5 (API route) ←────────────────────┘
    ↓
Task 6 (image transfer) → Task 7 (save action)
                                ↓
Task 8 (frontend page) ←───────┘
    ↓
Task 9 (navigation) → Task 10 (image config) → Task 11 (e2e test)
```
