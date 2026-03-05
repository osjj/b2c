import 'dotenv/config'
import { chromium } from 'playwright'

const URL = 'https://detail.1688.com/offer/936904897668.html'

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  locale: 'zh-CN',
})
const cookie = process.env.SCRAPER_1688_COOKIE || ''
if (cookie) {
  const cookies = cookie.split(';').map(p => {
    const idx = p.indexOf('='); if (idx === -1) return null
    const name = p.slice(0, idx).trim(); const value = p.slice(idx + 1).trim()
    return name ? { name, value, domain: '.1688.com', path: '/' } : null
  }).filter(Boolean)
  await context.addCookies(cookies)
}

const page = await context.newPage()

// Listen to all network requests to find detail content URL
const detailUrls = []
page.on('request', req => {
  const url = req.url()
  if (url.includes('detail') || url.includes('description') || url.includes('template')) {
    detailUrls.push(url.slice(0, 120))
  }
})

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForSelector('.module-od-title', { timeout: 15000 }).catch(() => {})
await page.waitForTimeout(1000)

// Scroll to detail area
await page.evaluate(() => {
  const el = document.querySelector('.module-od-product-description')
  if (el) el.scrollIntoView({ behavior: 'instant' })
})

// Poll every second to see when images appear
for (let i = 1; i <= 15; i++) {
  await page.waitForTimeout(1000)
  const count = await page.evaluate(() => {
    const c = document.querySelector('#detail-shadow-vender-top')
    return c ? c.querySelectorAll('img').length : -1
  })
  console.log(`t=${i}s: #detail-shadow-vender-top img count = ${count}`)
  if (count > 0) {
    const srcs = await page.evaluate(() => {
      return [...document.querySelector('#detail-shadow-vender-top').querySelectorAll('img')]
        .map(img => img.src || img.dataset.src || '').filter(Boolean)
    })
    console.log('FOUND! First 3:', srcs.slice(0,3).map(s => s.slice(0,80)))
    break
  }

  // Also check other possible containers
  const altCount = await page.evaluate(() => {
    const containers = ['#J_DetailDescription', '.html-description', '[class*="detail"] img', '.video-wapper']
    const results = {}
    for (const sel of containers) {
      const el = document.querySelector(sel)
      if (el) results[sel] = el.querySelectorAll ? el.querySelectorAll('img').length : 'found'
    }
    return results
  })
  if (Object.keys(altCount).length) console.log('  alt containers:', altCount)
}

console.log('\n--- NETWORK REQUESTS for detail content ---')
detailUrls.slice(0,10).forEach(u => console.log(' ', u))

await browser.close()
