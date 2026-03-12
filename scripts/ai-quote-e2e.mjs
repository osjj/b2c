import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseUrl = process.env.AI_QUOTE_E2E_BASE_URL || 'http://127.0.0.1:3000'

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ acceptDownloads: true })
  const page = await context.newPage()

  await verifyFailureFlow(page)
  await verifyMockedSuccessFlow(page)

  await browser.close()
}

async function verifyFailureFlow(page) {
  await page.goto(`${baseUrl}/tools/ai-quote`, { waitUntil: 'networkidle' })

  await page.getByRole('button', { name: EXAMPLE_TEXT }).click()
  await page.getByRole('button', { name: '生成报价单' }).click()
  await page.waitForSelector('text=需求解析失败，请稍后重试。')

  assert.equal(await page.getByText('需求解析失败，请稍后重试。').count(), 1)
}

async function verifyMockedSuccessFlow(page) {
  await page.route('**/api/tools/ai-quote', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        items: [
          {
            productId: 'p1',
            name: '焊工安全帽',
            sku: 'HM-001',
            price: 32,
            quantity: 2,
            reason: '头部防护',
            image: null,
          },
          {
            productId: 'p2',
            name: '防护眼镜',
            sku: 'GL-002',
            price: 18.5,
            quantity: 3,
            reason: '眼部防护',
            image: null,
          },
        ],
      }),
    })
  })

  await page.goto(`${baseUrl}/tools/ai-quote`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: EXAMPLE_TEXT }).click()
  await page.getByRole('button', { name: '生成报价单' }).click()

  await page.waitForSelector('text=报价结果')
  await page.waitForSelector('text=焊工安全帽')

  const quantityInputs = page.locator('input[type="number"]')
  await quantityInputs.first().fill('5')
  await page.waitForSelector('text=¥160.00')

  await page.getByLabel('删除 防护眼镜').click()
  await page.waitForSelector('text=已生成 1 项商品')

  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 PDF' }).click()
  await (await pdfDownload).cancel()

  const excelDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 Excel' }).click()
  await (await excelDownload).cancel()

  await page.unroute('**/api/tools/ai-quote')
}

const EXAMPLE_TEXT = '我们工厂有 50 名电焊工，需要配置头部、眼部、手部全套防护用品。'

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
