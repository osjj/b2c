import 'dotenv/config'
import { chromium } from 'playwright'

// Quick test: can Playwright launch at all?
console.log('Testing Playwright launch...')
try {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  console.log('✓ Browser launched')
  const page = await browser.newPage()
  console.log('✓ Page created')

  const cookie = process.env.SCRAPER_1688_COOKIE || ''
  console.log('Cookie length:', cookie.length)

  // Parse cookies
  const cookies = cookie.split(';')
    .map(p => {
      const idx = p.indexOf('=')
      if (idx === -1) return null
      const name = p.slice(0, idx).trim()
      const value = p.slice(idx + 1).trim()
      if (!name) return null
      return { name, value, domain: '.1688.com', path: '/' }
    })
    .filter(Boolean)

  const context = browser.contexts()[0]
  // Use context from browser instead
  await browser.close()

  // Re-launch with context
  const browser2 = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const ctx = await browser2.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'zh-CN',
  })

  if (cookies.length > 0) {
    await ctx.addCookies(cookies)
    console.log('✓ Injected', cookies.length, 'cookies')
  }

  const page2 = await ctx.newPage()
  console.log('Navigating to 1688...')

  await page2.goto('https://detail.1688.com/offer/936904897668.html', {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  })

  const finalUrl = page2.url()
  console.log('Final URL:', finalUrl)

  if (finalUrl.includes('login')) {
    console.log('✗ Redirected to login - Cookie not working')
  } else {
    const title = await page2.title()
    console.log('✓ Page title:', title)
  }

  await browser2.close()
} catch (err) {
  console.error('✗ Error:', err.message)
}
