// Pure artifact fixture: no .env, Prisma, real customers, or private storage.
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { generateCustomerPdf } from '../src/lib/quotation/artifacts/pdf'
import type { QuotationSnapshot } from '../src/lib/quotation/artifacts/snapshot'

async function main() {
  const logoBytes = await sharp(await readFile('public/logo.png')).png().toBuffer()
  const logo = { dataUrl: `data:image/png;base64,${logoBytes.toString('base64')}`, sha256: createHash('sha256').update(logoBytes).digest('hex') }
  const imageBytes = await sharp(Buffer.from('<svg width="500" height="650"><rect width="500" height="650" fill="#f5f8f9"/><path d="M160 120 L220 95 L250 140 L280 95 L340 120 L450 280 L370 330 L335 270 L335 550 L165 550 L165 270 L130 330 L50 280 Z" fill="#243e52"/><path d="M245 145 L245 545" stroke="#78929e" stroke-width="4"/><rect x="180" y="205" width="48" height="40" fill="#456275"/><rect x="270" y="205" width="48" height="40" fill="#456275"/><text x="250" y="605" text-anchor="middle" font-size="18" fill="#526878">ILLUSTRATION / SAMPLE ONLY</text></svg>')).png().toBuffer()
  const image = { contentType: 'image/png' as const, dataUrl: `data:image/png;base64,${imageBytes.toString('base64')}`, sha256: createHash('sha256').update(imageBytes).digest('hex') }
  const snapshot: QuotationSnapshot = { schemaVersion: '1.0', templateVersion: 'presentation-v2', language: 'ENGLISH', brand: { companyName: 'LAIFAPPE', contactLine: 'SAMPLE DOCUMENT / NOT A CUSTOMER OFFER', tagline: 'PERSONAL PROTECTIVE EQUIPMENT', logo }, quotation: { number: 'QT-SAMPLE-0001', revision: 1, date: '2026-09-05', validUntil: null }, customer: { companyName: 'Sample Buyer Ltd. / 示例客户', countryCode: null, email: null, phone: null, address: null, contact: null }, money: { currency: 'USD', minorUnit: 2, roundingMode: 'HALF_UP', subtotal: '1250.00', discount: '0.00', shipping: '0.00', otherFee: '0.00', taxRate: '0', tax: '0.00', roundingAdjustment: '0.00', total: '1250.00' }, terms: { Terms: 'Sample only. All commercial terms must be confirmed before issuing a quotation.\nPayment terms: To be confirmed\nDelivery: To be confirmed\nValidity: To be confirmed' }, items: [{ position: 1, nameEn: 'Cotton Workwear - Sample Product', nameZh: null, model: null, sku: null, specifications: ['Material: Cotton', 'Color: Navy', 'Size range: To be confirmed', 'Packaging: To be confirmed', 'Product images shown here are illustrative only.', 'No performance or certification claims are made by this sample.'], unit: 'pcs', quantity: '100', unitPrice: '12.50', lineTotal: '1250.00', images: [image] }] }
  const directory = resolve('output/pdf')
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'quotation-v2-preview.pdf'), await generateCustomerPdf(snapshot, { configuredPath: '' }, true))
  process.stdout.write('Generated output/pdf/quotation-v2-preview.pdf (synthetic preview only)\n')
}
main().catch((error) => { process.stderr.write(String(error)); process.exitCode = 1 })
