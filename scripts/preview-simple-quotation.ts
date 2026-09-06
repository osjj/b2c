// Pure artifact fixture: no .env, Prisma, real customers, or private storage.
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { generateCustomerPdf } from '../src/lib/quotation/artifacts/pdf'
import type { QuotationSnapshot } from '../src/lib/quotation/artifacts/snapshot'
import { JORDAN_TEMPLATE_VERSION } from '../src/lib/quotation/jordan-layout'
import { quotationLayoutHash } from '../src/lib/quotation/services/ai-layout'
import { generateCustomerExcel } from '../src/lib/quotation/artifacts/excel'

async function main() {
  const logoBytes = await sharp(await readFile('public/logo.png')).png().toBuffer()
  const logo = { dataUrl: `data:image/png;base64,${logoBytes.toString('base64')}`, sha256: createHash('sha256').update(logoBytes).digest('hex') }
  const imageBytes = await sharp(Buffer.from('<svg width="500" height="650"><rect width="500" height="650" fill="#f5f8f9"/><path d="M160 120 L220 95 L250 140 L280 95 L340 120 L450 280 L370 330 L335 270 L335 550 L165 550 L165 270 L130 330 L50 280 Z" fill="#243e52"/><path d="M245 145 L245 545" stroke="#78929e" stroke-width="4"/><rect x="180" y="205" width="48" height="40" fill="#456275"/><rect x="270" y="205" width="48" height="40" fill="#456275"/><text x="250" y="605" text-anchor="middle" font-size="18" fill="#526878">ILLUSTRATION / SAMPLE ONLY</text></svg>')).png().toBuffer()
  const image = { contentType: 'image/png' as const, dataUrl: `data:image/png;base64,${imageBytes.toString('base64')}`, sha256: createHash('sha256').update(imageBytes).digest('hex') }
  const snapshot: QuotationSnapshot = { schemaVersion: '1.0', templateVersion: 'presentation-v2', language: 'ENGLISH', brand: { companyName: 'LAIFAPPE', contactLine: 'SAMPLE DOCUMENT / NOT A CUSTOMER OFFER', tagline: 'PERSONAL PROTECTIVE EQUIPMENT', logo }, quotation: { number: 'QT-SAMPLE-0001', revision: 1, date: '2026-09-05', validUntil: null }, customer: { companyName: 'Sample Buyer Ltd. / 示例客户', countryCode: null, email: null, phone: null, address: null, contact: null }, money: { currency: 'USD', minorUnit: 2, roundingMode: 'HALF_UP', subtotal: '1250.00', discount: '0.00', shipping: '0.00', otherFee: '0.00', taxRate: '0', tax: '0.00', roundingAdjustment: '0.00', total: '1250.00' }, terms: { Terms: 'Sample only. All commercial terms must be confirmed before issuing a quotation.\nPayment terms: To be confirmed\nDelivery: To be confirmed\nValidity: To be confirmed' }, items: [{ position: 1, nameEn: 'Cotton Workwear - Sample Product', nameZh: null, model: null, sku: null, specifications: ['Material: Cotton', 'Color: Navy', 'Size range: To be confirmed', 'Packaging: To be confirmed', 'Product images shown here are illustrative only.', 'No performance or certification claims are made by this sample.'], unit: 'pcs', quantity: '100', unitPrice: '12.50', lineTotal: '1250.00', images: [image] }] }
  const directory = resolve('output/pdf')
  const jordan = process.argv.includes('--jordan')
  const studio = process.argv.includes('--studio-review')
  if (jordan || studio) {
    snapshot.templateVersion = JORDAN_TEMPLATE_VERSION
    snapshot.brand = { ...snapshot.brand, companyName: 'YUELAIFA LABOR PROTECTION PRODUCTS CO., LTD.', contactLine: 'SAMPLE TEMPLATE REVIEW / NOT A CUSTOMER OFFER\nwww.laifappe.com', tagline: 'YUELAIFA PPE | Professional B2B Safety Equipment Supplier', logo }
    snapshot.items.push({ ...snapshot.items[0], position: 2, nameEn: 'Workwear - Second Sample', specifications: ['Material: Cotton', 'Color: Navy', 'Size range: To be confirmed'], images: [image, image] })
    snapshot.money.subtotal = '2500.00'; snapshot.money.total = '2500.00'
    snapshot.layout = { version: '1', inputHash: quotationLayoutHash(snapshot), model: 'offline-fixture-no-api-call', items: snapshot.items.map((item) => ({ position: item.position, imageColumns: item.images.length > 1 ? 2 : 1, labelLengths: item.specifications.map((line) => line.includes(':') ? line.indexOf(':') + 1 : 0), noteIndices: [2] })) }
  }
  if (studio) {
    const stampBytes = await sharp(Buffer.from('<svg width="220" height="220"><circle cx="110" cy="110" r="96" fill="none" stroke="#b5252b" stroke-width="5"/><circle cx="110" cy="110" r="86" fill="none" stroke="#b5252b" stroke-width="2"/><text x="110" y="85" text-anchor="middle" fill="#b5252b" font-size="23">SAMPLE</text><text x="110" y="150" text-anchor="middle" fill="#b5252b" font-size="16">NOT VALID</text></svg>')).png().toBuffer()
    snapshot.brand = { companyName: 'YUELAIFA LABOR PROTECTION PRODUCTS CO., LTD.', contactLine: 'Contact: Sample representative\nTel / WhatsApp: +00 123 456 789', address: 'Sample business address, Foshan, China', website: 'www.example.com', email: 'sales@example.com', tagline: 'PPE SUPPLY QUOTATION - SAMPLE ONLY', logo, seal: { dataUrl: `data:image/png;base64,${stampBytes.toString('base64')}`, sha256: createHash('sha256').update(stampBytes).digest('hex') } }
    await mkdir(directory, { recursive: true })
    await writeFile(resolve(directory, 'quotation-studio-review.pdf'), await generateCustomerPdf(snapshot, { configuredPath: '' }, false))
    await writeFile(resolve(directory, 'quotation-studio-review.xlsx'), await generateCustomerExcel(snapshot))
    process.stdout.write('Generated synthetic PDF/XLSX studio review; mock AI layout, SAMPLE seal, no external I/O.\n')
    return
  }
  await mkdir(directory, { recursive: true })
  const filename = jordan ? 'quotation-jordan-template-preview.pdf' : 'quotation-v2-preview.pdf'
  await writeFile(resolve(directory, filename), await generateCustomerPdf(snapshot, { configuredPath: '' }, true))
  process.stdout.write(`Generated output/pdf/${filename} (synthetic preview only; no API call)\n`)
}
main().catch((error) => { process.stderr.write(String(error)); process.exitCode = 1 })
