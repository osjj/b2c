# AI 智能报价单工具 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个免登录的 AI 智能报价单工具，用户用自然语言描述采购需求，系统通过 RAG 匹配真实商品生成可编辑报价单，支持导出 PDF 和 Excel。

**Architecture:** 用户描述文本经 Embedding API 转为向量，pgvector 余弦相似度检索 Top 20 候选商品，再由 Claude API 从候选商品中精选并分配数量，前端渲染可编辑表格后支持导出。项目已有 OpenAI 兼容代理（`OPENAI_API_ENDPOINT`），Embedding 和选品 AI 均复用该代理。

**Tech Stack:** Next.js App Router, Prisma + pgvector (raw SQL), OpenAI Embedding API, Claude API (via generateText), jspdf + jspdf-autotable (PDF), xlsx (Excel)

---

## Task 1: 安装依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装 PDF 和 Excel 导出库**

```bash
npm install jspdf jspdf-autotable xlsx
npm install --save-dev @types/jspdf
```

**Step 2: 验证安装**

```bash
cat package.json | grep -E "jspdf|xlsx"
```
Expected: 看到 `jspdf`、`jspdf-autotable`、`xlsx` 三个包

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add jspdf and xlsx dependencies for ai-quote export"
```

---

## Task 2: 开启 pgvector 并添加 embedding 列

**Files:**
- Create: `prisma/migrations/add_product_embedding/migration.sql`
- Modify: `prisma/schema.prisma`

**Step 1: 创建迁移 SQL 文件**

```sql
-- prisma/migrations/add_product_embedding/migration.sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS products_embedding_idx
ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Step 2: 执行迁移**

```bash
npx prisma db execute --file prisma/migrations/add_product_embedding/migration.sql
```

Expected: 无错误输出

**Step 3: 在 schema.prisma 的 Product model 末尾添加 embedding 字段**

在 `prisma/schema.prisma` 的 Product model 中，`quoteItems QuoteItem[]` 之后加：

```prisma
  embedding     Unsupported("vector(1536)")?
```

**Step 4: 重新生成 Prisma Client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/add_product_embedding/migration.sql
git commit -m "feat: add pgvector extension and product embedding column"
```

---

## Task 3: 创建 Embedding 工具函数

**Files:**
- Create: `src/lib/embeddings.ts`

**Step 1: 创建 embeddings.ts**

```typescript
// src/lib/embeddings.ts
// 使用与 openai.ts 相同的代理端点生成文本向量

const OPENAI_API_ENDPOINT = process.env.OPENAI_API_ENDPOINT || 'http://127.0.0.1:8317'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const EMBEDDING_MODEL = 'text-embedding-3-small'

/**
 * 将文本转为 1536 维向量
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(`${OPENAI_API_ENDPOINT}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Embedding API error:', error)
      return null
    }

    const data = await response.json()
    return data.data?.[0]?.embedding ?? null
  } catch (error) {
    console.error('Embedding generation failed:', error)
    return null
  }
}

/**
 * 拼接商品文本用于 embedding（影响搜索质量）
 */
export function buildProductEmbeddingText(product: {
  name: string
  description?: string | null
  categoryName?: string | null
  usageScenes?: string[]
  specifications?: unknown
}): string {
  const parts = [
    `商品名称：${product.name}`,
    product.categoryName ? `分类：${product.categoryName}` : '',
    product.description ? `描述：${product.description}` : '',
    product.usageScenes?.length ? `使用场景：${product.usageScenes.join('、')}` : '',
    product.specifications
      ? `规格：${JSON.stringify(product.specifications)}`
      : '',
  ]
  return parts.filter(Boolean).join('\n')
}
```

**Step 2: Commit**

```bash
git add src/lib/embeddings.ts
git commit -m "feat: add embedding generation utility"
```

---

## Task 4: 创建 pgvector 语义搜索函数

**Files:**
- Create: `src/lib/vector-search.ts`

**Step 1: 创建 vector-search.ts**

```typescript
// src/lib/vector-search.ts
import { prisma } from '@/lib/prisma'

export interface ProductSearchResult {
  id: string
  name: string
  price: number
  sku: string | null
  description: string | null
  usageScenes: string[]
  categoryName: string | null
  image: string | null
  similarity: number
}

/**
 * pgvector 余弦相似度语义搜索，返回 Top N 最相关商品
 */
export async function searchProductsByEmbedding(
  embedding: number[],
  limit = 20
): Promise<ProductSearchResult[]> {
  const vectorStr = `[${embedding.join(',')}]`

  const results = await prisma.$queryRawUnsafe<Array<{
    id: string
    name: string
    price: string
    sku: string | null
    description: string | null
    usage_scenes: string[]
    category_name: string | null
    image: string | null
    similarity: number
  }>>(
    `
    SELECT
      p.id,
      p.name,
      p.price::text,
      p.sku,
      p.description,
      p.usage_scenes,
      c.name as category_name,
      (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as image,
      1 - (p.embedding <=> $1::vector) as similarity
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = true
      AND p.embedding IS NOT NULL
    ORDER BY p.embedding <=> $1::vector
    LIMIT $2
    `,
    vectorStr,
    limit
  )

  return results.map(r => ({
    id: r.id,
    name: r.name,
    price: parseFloat(r.price),
    sku: r.sku,
    description: r.description,
    usageScenes: r.usage_scenes ?? [],
    categoryName: r.category_name,
    image: r.image,
    similarity: r.similarity,
  }))
}
```

**Step 2: Commit**

```bash
git add src/lib/vector-search.ts
git commit -m "feat: add pgvector semantic search for products"
```

---

## Task 5: 创建商品 Embedding 索引脚本

**Files:**
- Create: `scripts/index-product-embeddings.ts`

**Step 1: 创建索引脚本**

```typescript
// scripts/index-product-embeddings.ts
import { PrismaClient } from '@prisma/client'
import { generateEmbedding, buildProductEmbeddingText } from '../src/lib/embeddings'

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`共 ${products.length} 个商品需要生成 embedding`)

  let success = 0
  let failed = 0

  for (const product of products) {
    const text = buildProductEmbeddingText({
      name: product.name,
      description: product.description,
      categoryName: product.category?.name,
      usageScenes: product.usageScenes,
      specifications: product.specifications,
    })

    const embedding = await generateEmbedding(text)

    if (!embedding) {
      console.error(`❌ ${product.name} - 生成失败`)
      failed++
      continue
    }

    const vectorStr = `[${embedding.join(',')}]`
    await prisma.$executeRawUnsafe(
      `UPDATE products SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      product.id
    )

    console.log(`✓ ${product.name}`)
    success++

    // 避免 API 限速
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\n完成：${success} 成功，${failed} 失败`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Step 2: 在 package.json scripts 中添加命令**

在 `package.json` 的 `scripts` 中添加：

```json
"db:index:embeddings": "npx tsx scripts/index-product-embeddings.ts"
```

**Step 3: Commit**

```bash
git add scripts/index-product-embeddings.ts package.json
git commit -m "feat: add product embedding indexing script"
```

---

## Task 6: 创建 AI 报价单 API 端点

**Files:**
- Create: `src/app/api/tools/ai-quote/route.ts`

**Step 1: 创建 API route**

```typescript
// src/app/api/tools/ai-quote/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { generateEmbedding } from '@/lib/embeddings'
import { searchProductsByEmbedding } from '@/lib/vector-search'
import { generateText, parseJSONResponse } from '@/lib/openai'

export interface QuoteItem {
  productId: string
  name: string
  sku: string | null
  price: number
  quantity: number
  reason: string
  image: string | null
}

export interface AiQuoteResponse {
  success: boolean
  items?: QuoteItem[]
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json()

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: '请描述您的采购需求（至少5个字）' },
        { status: 400 }
      )
    }

    // Step 1: 生成查询向量
    const embedding = await generateEmbedding(description.trim())
    if (!embedding) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: '向量生成失败，请稍后重试' },
        { status: 500 }
      )
    }

    // Step 2: pgvector 语义检索 Top 20
    const candidates = await searchProductsByEmbedding(embedding, 20)
    if (candidates.length === 0) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: '暂无匹配商品，请联系客服' },
        { status: 404 }
      )
    }

    // Step 3: Claude 选品
    const candidateList = candidates
      .map((p, i) => `${i + 1}. ID:${p.id} | ${p.name} | ¥${p.price} | SKU:${p.sku ?? '-'} | ${p.description ?? ''}`)
      .join('\n')

    const prompt = `你是一名专业的劳保用品采购顾问。根据用户的采购需求，从候选商品列表中选出合适的商品并给出建议数量。

用户需求：${description}

候选商品列表（共${candidates.length}条）：
${candidateList}

请从以上候选商品中选出最合适的商品（不要选不相关的商品），返回 JSON 数组：
[
  {
    "productId": "商品ID",
    "quantity": 建议数量（整数）,
    "reason": "推荐理由（一句话）"
  }
]

规则：
1. 只返回 JSON 数组，不要其他内容
2. 只选真正需要的商品，宁缺勿滥
3. 数量根据用户描述的人数或规模合理估算
4. 如果用户没有提及人数，默认按10人估算`

    const result = await generateText(prompt, undefined, {
      temperature: 0.3,
      maxTokens: 2048,
    })

    if (!result.success || !result.text) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: 'AI 选品失败，请稍后重试' },
        { status: 500 }
      )
    }

    const selections = parseJSONResponse<Array<{
      productId: string
      quantity: number
      reason: string
    }>>(result.text)

    if (!selections || !Array.isArray(selections)) {
      return NextResponse.json<AiQuoteResponse>(
        { success: false, error: 'AI 返回格式异常，请稍后重试' },
        { status: 500 }
      )
    }

    // Step 4: 组合最终报价单数据
    const productMap = new Map(candidates.map(p => [p.id, p]))
    const items: QuoteItem[] = selections
      .filter(s => productMap.has(s.productId) && s.quantity > 0)
      .map(s => {
        const product = productMap.get(s.productId)!
        return {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: Math.max(1, Math.round(s.quantity)),
          reason: s.reason,
          image: product.image,
        }
      })

    return NextResponse.json<AiQuoteResponse>({ success: true, items })
  } catch (error) {
    console.error('AI quote error:', error)
    return NextResponse.json<AiQuoteResponse>(
      { success: false, error: '服务异常，请稍后重试' },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/tools/ai-quote/route.ts
git commit -m "feat: add AI quote generation API with RAG"
```

---

## Task 7: 创建报价单表格组件

**Files:**
- Create: `src/components/tools/ai-quote/QuoteTable.tsx`

**Step 1: 创建可编辑报价表格**

```typescript
// src/components/tools/ai-quote/QuoteTable.tsx
'use client'

import { Trash2 } from 'lucide-react'
import type { QuoteItem } from '@/app/api/tools/ai-quote/route'

interface Props {
  items: QuoteItem[]
  onChange: (items: QuoteItem[]) => void
}

export function QuoteTable({ items, onChange }: Props) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const updateQuantity = (index: number, value: string) => {
    const qty = parseInt(value)
    if (isNaN(qty) || qty < 1) return
    const updated = [...items]
    updated[index] = { ...updated[index], quantity: qty }
    onChange(updated)
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">商品</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">SKU</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">单价</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">数量</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">小计</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item, index) => (
            <tr key={item.productId} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-10 object-cover rounded border flex-shrink-0"
                    />
                  )}
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.reason}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                {item.sku ?? '-'}
              </td>
              <td className="px-4 py-3 text-right">¥{item.price.toFixed(2)}</td>
              <td className="px-4 py-3 text-center">
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={e => updateQuantity(index, e.target.value)}
                  className="w-20 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </td>
              <td className="px-4 py-3 text-right font-medium">
                ¥{(item.price * item.quantity).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => removeItem(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-muted/30">
          <tr>
            <td colSpan={4} className="px-4 py-3 text-right font-semibold">合计</td>
            <td className="px-4 py-3 text-right font-bold text-lg text-primary">
              ¥{total.toFixed(2)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/tools/ai-quote/QuoteTable.tsx
git commit -m "feat: add editable quote table component"
```

---

## Task 8: 创建导出按钮组件

**Files:**
- Create: `src/components/tools/ai-quote/ExportButtons.tsx`

**Step 1: 创建导出组件**

```typescript
// src/components/tools/ai-quote/ExportButtons.tsx
'use client'

import { FileDown, Table } from 'lucide-react'
import type { QuoteItem } from '@/app/api/tools/ai-quote/route'

interface Props {
  items: QuoteItem[]
}

export function ExportButtons({ items }: Props) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const date = new Date().toLocaleDateString('zh-CN')

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()

    // 标题
    doc.setFontSize(18)
    doc.text('AI 智能报价单', 14, 22)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`生成日期：${date}`, 14, 30)
    doc.setTextColor(0)

    // 表格
    autoTable(doc, {
      startY: 38,
      head: [['商品名称', 'SKU', '单价(¥)', '数量', '小计(¥)']],
      body: [
        ...items.map(item => [
          item.name,
          item.sku ?? '-',
          item.price.toFixed(2),
          item.quantity.toString(),
          (item.price * item.quantity).toFixed(2),
        ]),
        ['', '', '', '合计', total.toFixed(2)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
      foot: [],
    })

    // 备注
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('本报价单由 AI 生成，价格仅供参考，最终以实际报价为准。', 14, finalY)

    doc.save(`报价单-${date}.pdf`)
  }

  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx')

    const rows = [
      ['AI 智能报价单'],
      [`生成日期：${date}`],
      [],
      ['商品名称', 'SKU', '单价(¥)', '数量', '小计(¥)', '推荐理由'],
      ...items.map(item => [
        item.name,
        item.sku ?? '-',
        item.price,
        item.quantity,
        item.price * item.quantity,
        item.reason,
      ]),
      [],
      ['', '', '', '合计', total],
    ]

    const ws = utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 30 }]
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, '报价单')
    writeFile(wb, `报价单-${date}.xlsx`)
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={exportPDF}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <FileDown className="w-4 h-4" />
        导出 PDF
      </button>
      <button
        onClick={exportExcel}
        className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
      >
        <Table className="w-4 h-4" />
        导出 Excel
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/tools/ai-quote/ExportButtons.tsx
git commit -m "feat: add PDF and Excel export buttons"
```

---

## Task 9: 创建 AI 报价单页面

**Files:**
- Create: `src/app/(store)/tools/ai-quote/page.tsx`

**Step 1: 创建页面**

```typescript
// src/app/(store)/tools/ai-quote/page.tsx
'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { QuoteTable } from '@/components/tools/ai-quote/QuoteTable'
import { ExportButtons } from '@/components/tools/ai-quote/ExportButtons'
import type { QuoteItem } from '@/app/api/tools/ai-quote/route'

type Step = 'idle' | 'analyzing' | 'searching' | 'generating' | 'done' | 'error'

const STEP_LABELS: Record<Step, string> = {
  idle: '',
  analyzing: '正在分析需求...',
  searching: '正在匹配商品...',
  generating: '正在生成报价单...',
  done: '',
  error: '',
}

const EXAMPLES = [
  '我们工厂有50名电焊工，需要配置防护用品',
  '化工车间20人，防毒防腐蚀全套防护',
  '建筑工地100名工人，高空作业安全配置',
]

export default function AiQuotePage() {
  const [description, setDescription] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [items, setItems] = useState<QuoteItem[]>([])
  const [error, setError] = useState('')

  const generate = async () => {
    if (!description.trim() || description.trim().length < 5) return
    setError('')
    setItems([])

    setStep('analyzing')
    await delay(600)
    setStep('searching')
    await delay(800)
    setStep('generating')

    try {
      const res = await fetch('/api/tools/ai-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || '生成失败，请重试')
        setStep('error')
        return
      }

      setItems(data.items)
      setStep('done')
    } catch {
      setError('网络错误，请稍后重试')
      setStep('error')
    }
  }

  const reset = () => {
    setStep('idle')
    setItems([])
    setError('')
  }

  const isLoading = ['analyzing', 'searching', 'generating'].includes(step)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90 py-16">
        <div className="container mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI 智能工具
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">AI 智能报价单</h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">
            描述您的采购需求，AI 自动匹配合适商品并生成专业报价单
          </p>
        </div>
      </section>

      <div className="container mx-auto px-6 lg:px-8 py-12 max-w-4xl">
        {/* 输入区 */}
        {step !== 'done' && (
          <div className="bg-card rounded-xl border p-6 mb-8">
            <label className="block text-sm font-medium mb-2">描述您的采购需求</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="例：我们工厂有50名电焊工，需要配置头部、眼部、手部全套防护用品"
              rows={4}
              disabled={isLoading}
              className="w-full border rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />

            {/* 示例 */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-muted-foreground">快速填入：</span>
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => setDescription(ex)}
                  disabled={isLoading}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* 加载进度 */}
            {isLoading && (
              <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                {STEP_LABELS[step]}
              </div>
            )}

            {/* 错误提示 */}
            {step === 'error' && (
              <div className="mt-4 text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={generate}
                disabled={isLoading || description.trim().length < 5}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                生成报价单
              </button>
            </div>
          </div>
        )}

        {/* 结果区 */}
        {step === 'done' && items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">报价单（共 {items.length} 项商品）</h2>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重新生成
              </button>
            </div>

            <QuoteTable items={items} onChange={setItems} />

            <div className="flex justify-end pt-2">
              <ExportButtons items={items} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

**Step 2: Commit**

```bash
git add src/app/(store)/tools/ai-quote/page.tsx
git commit -m "feat: add AI quote tool page with RAG flow"
```

---

## Task 10: 在商品更新时自动同步 Embedding

**Files:**
- Modify: `src/app/api/admin/products/[id]/route.ts` 或 products action 文件

**Step 1: 找到商品创建/更新的入口**

查看 `src/actions/products.ts` 中的 `createProduct` 和 `updateProduct` 函数。

**Step 2: 在创建/更新商品后异步触发 embedding 更新**

在 `src/actions/products.ts` 顶部引入：

```typescript
import { generateEmbedding, buildProductEmbeddingText } from '@/lib/embeddings'
import { prisma as db } from '@/lib/prisma'
```

在 `createProduct` 和 `updateProduct` 成功后添加（异步，不阻塞响应）：

```typescript
// 异步更新 embedding（不阻塞主流程）
updateProductEmbedding(product.id).catch(console.error)
```

新增工具函数（放在文件末尾）：

```typescript
async function updateProductEmbedding(productId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { category: true },
  })
  if (!product) return

  const text = buildProductEmbeddingText({
    name: product.name,
    description: product.description,
    categoryName: product.category?.name,
    usageScenes: product.usageScenes,
    specifications: product.specifications,
  })

  const embedding = await generateEmbedding(text)
  if (!embedding) return

  const vectorStr = `[${embedding.join(',')}]`
  await db.$executeRawUnsafe(
    `UPDATE products SET embedding = $1::vector WHERE id = $2`,
    vectorStr,
    productId
  )
}
```

**Step 3: Commit**

```bash
git add src/actions/products.ts
git commit -m "feat: auto-update product embedding on create/update"
```

---

## Task 11: 运行初始化索引

**Step 1: 确认 .env 中有 OPENAI_API_KEY 和 OPENAI_API_ENDPOINT**

```bash
grep -E "OPENAI_API" .env
```

**Step 2: 运行索引脚本**

```bash
npm run db:index:embeddings
```

Expected: 看到每个商品的 `✓ 商品名称`，最后显示成功数量

**Step 3: 验证数据写入**

```bash
npx prisma studio
```

在 Product 表中查看 embedding 列是否已有数据（非 null）

---

## Task 12: 本地测试验证

**Step 1: 启动开发服务器**

```bash
npm run dev
```

**Step 2: 访问工具页面**

浏览器打开 `http://localhost:3000/tools/ai-quote`

**Step 3: 测试用例**

1. 输入 "我们工厂有50名电焊工" → 点击生成 → 应看到焊接类防护用品
2. 调整某商品数量 → 确认小计和合计自动更新
3. 删除一项 → 确认列表更新
4. 点击"导出 PDF" → 确认弹出下载
5. 点击"导出 Excel" → 确认弹出下载
6. 点击"重新生成" → 回到输入状态

---

## 完成标志

- [ ] pgvector 扩展已安装，embedding 列已存在
- [ ] 所有商品已成功生成 embedding
- [ ] `/tools/ai-quote` 页面可访问
- [ ] AI 生成报价单功能正常
- [ ] 数量可手动修改，合计实时更新
- [ ] PDF 导出正常
- [ ] Excel 导出正常
