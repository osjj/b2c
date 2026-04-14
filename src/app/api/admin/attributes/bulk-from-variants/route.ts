import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { validateBrowserApiKey } from '@/lib/scraper/settings'

type VariantOptionInput = { value?: unknown }
type VariantInput = { name?: unknown; options?: unknown }

function slugifyCode(name: string): string {
  const code = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return code
}

function normalizeVariants(input: unknown): Array<{ name: string; values: string[] }> {
  if (!Array.isArray(input)) return []
  const out: Array<{ name: string; values: string[] }> = []
  for (const raw of input as VariantInput[]) {
    const name = typeof raw?.name === 'string' ? raw.name.trim() : ''
    if (!name) continue
    const rawOptions = Array.isArray(raw?.options) ? (raw.options as VariantOptionInput[]) : []
    const seen = new Set<string>()
    const values: string[] = []
    for (const opt of rawOptions) {
      const val = typeof opt?.value === 'string' ? opt.value.trim() : ''
      if (!val) continue
      const key = val.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      values.push(val)
    }
    if (values.length === 0) continue
    out.push({ name, values })
  }
  return out
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-scraper-key') || ''
  const isValid = await validateBrowserApiKey(apiKey)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '无效的请求体' }, { status: 400 })
  }

  const variants = normalizeVariants((body as { variants?: unknown })?.variants)
  if (variants.length === 0) {
    return NextResponse.json({ error: '没有可导入的 Variations' }, { status: 400 })
  }

  const results: Array<{
    name: string
    code: string
    attributeId: string
    created: boolean
    optionsAdded: number
    optionsExisting: number
  }> = []

  for (const v of variants) {
    const existingByName = await prisma.attribute.findFirst({
      where: { name: { equals: v.name, mode: 'insensitive' } },
    })

    let attribute = existingByName
    let created = false

    if (!attribute) {
      let baseCode = slugifyCode(v.name)
      if (!baseCode) baseCode = `attr_${Date.now().toString(36)}`
      let code = baseCode
      let suffix = 1
      while (await prisma.attribute.findUnique({ where: { code } })) {
        suffix += 1
        code = `${baseCode}_${suffix}`
      }

      const maxOrder = await prisma.attribute.aggregate({ _max: { sortOrder: true } })
      const nextSort = (maxOrder._max.sortOrder ?? 0) + 1

      attribute = await prisma.attribute.create({
        data: {
          name: v.name,
          code,
          type: 'MULTISELECT',
          isRequired: false,
          isFilterable: true,
          isActive: true,
          sortOrder: nextSort,
        },
      })
      created = true
    }

    const existingOptions = await prisma.attributeOption.findMany({
      where: { attributeId: attribute.id },
      orderBy: { sortOrder: 'asc' },
    })
    const existingValuesLower = new Set(existingOptions.map((o) => o.value.toLowerCase()))
    let nextSort = existingOptions.length
    let added = 0
    let already = 0
    const toCreate: { attributeId: string; value: string; sortOrder: number }[] = []
    for (const val of v.values) {
      if (existingValuesLower.has(val.toLowerCase())) {
        already += 1
        continue
      }
      existingValuesLower.add(val.toLowerCase())
      toCreate.push({ attributeId: attribute.id, value: val, sortOrder: nextSort++ })
      added += 1
    }
    if (toCreate.length > 0) {
      await prisma.attributeOption.createMany({ data: toCreate })
    }

    results.push({
      name: attribute.name,
      code: attribute.code,
      attributeId: attribute.id,
      created,
      optionsAdded: added,
      optionsExisting: already,
    })
  }

  revalidatePath('/admin/attributes')

  return NextResponse.json({
    success: true,
    count: results.length,
    createdCount: results.filter((r) => r.created).length,
    updatedCount: results.filter((r) => !r.created).length,
    totalOptionsAdded: results.reduce((s, r) => s + r.optionsAdded, 0),
    results,
  })
}
