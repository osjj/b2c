# B2B 批量阶梯价格功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 B2B 模式添加批量阶梯价格功能，管理员可为每个产品配置不同数量区间的单价，前端自动计算并显示。

**Architecture:** 新增 `PriceTier` 模型存储阶梯价格，在产品编辑页内嵌配置组件，前端根据 `NEXT_PUBLIC_PROJECT_TYPE` 环境变量判断是否显示阶梯价格功能。

**Tech Stack:** Prisma, Next.js Server Actions, React (Zustand for state), TypeScript

---

## Task 1: 数据库模型

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: 添加 PriceTier 模型**

在 `prisma/schema.prisma` 的 Product 模型后添加：

```prisma
model PriceTier {
  id          String   @id @default(cuid())
  productId   String
  minQuantity Int
  maxQuantity Int?
  price       Decimal  @db.Decimal(10, 2)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@map("price_tiers")
}
```

**Step 2: 在 Product 模型中添加关系**

在 Product 模型中添加：

```prisma
priceTiers PriceTier[]
```

**Step 3: 在 Quote 模型中添加 expectedPrice 字段**

```prisma
expectedPrice Decimal? @db.Decimal(10, 2)
```

**Step 4: 运行数据库迁移**

Run: `npx prisma migrate dev --name add_price_tiers`

Expected: Migration successful

**Step 5: 生成 Prisma Client**

Run: `npx prisma generate`

Expected: Prisma client generated

**Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add PriceTier model for B2B tiered pricing"
```

---

## Task 2: 阶梯价格工具函数

**Files:**
- Create: `src/lib/pricing.ts`

**Step 1: 创建阶梯价格计算函数**

```typescript
// src/lib/pricing.ts

export interface PriceTier {
  id: string
  minQuantity: number
  maxQuantity: number | null
  price: number
  sortOrder: number
}

/**
 * 根据数量计算阶梯单价
 */
export function calculateTierPrice(
  priceTiers: PriceTier[],
  quantity: number,
  defaultPrice: number
): number {
  if (!priceTiers || priceTiers.length === 0) {
    return defaultPrice
  }

  // 按 minQuantity 升序排列
  const sortedTiers = [...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity)

  for (let i = sortedTiers.length - 1; i >= 0; i--) {
    const tier = sortedTiers[i]
    if (quantity >= tier.minQuantity) {
      if (tier.maxQuantity === null || quantity <= tier.maxQuantity) {
        return tier.price
      }
    }
  }

  return defaultPrice
}

/**
 * 获取下一阶梯提示信息
 */
export function getNextTierHint(
  priceTiers: PriceTier[],
  quantity: number,
  defaultPrice: number
): {
  hasNextTier: boolean
  quantityNeeded: number
  nextPrice: number
  savingsPercent: number
} | null {
  if (!priceTiers || priceTiers.length === 0) {
    return null
  }

  const sortedTiers = [...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity)
  const currentPrice = calculateTierPrice(priceTiers, quantity, defaultPrice)

  // 找到下一个更优惠的阶梯
  for (const tier of sortedTiers) {
    if (tier.minQuantity > quantity && tier.price < currentPrice) {
      const quantityNeeded = tier.minQuantity - quantity
      const savingsPercent = Math.round((1 - tier.price / currentPrice) * 100)
      return {
        hasNextTier: true,
        quantityNeeded,
        nextPrice: tier.price,
        savingsPercent,
      }
    }
  }

  return null
}

/**
 * 获取最低阶梯价格（用于产品卡片显示"¥XX起"）
 */
export function getLowestTierPrice(
  priceTiers: PriceTier[],
  defaultPrice: number
): number {
  if (!priceTiers || priceTiers.length === 0) {
    return defaultPrice
  }

  const prices = priceTiers.map((tier) => tier.price)
  return Math.min(...prices, defaultPrice)
}

/**
 * 验证阶梯价格配置是否有效
 */
export function validatePriceTiers(
  tiers: Array<{ minQuantity: number; maxQuantity: number | null; price: number }>
): { valid: boolean; error?: string } {
  if (tiers.length === 0) {
    return { valid: true }
  }

  if (tiers.length > 5) {
    return { valid: false, error: '最多只能设置5个阶梯' }
  }

  // 按 minQuantity 排序
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity)

  // 检查第一个阶梯是否从1开始
  if (sorted[0].minQuantity !== 1) {
    return { valid: false, error: '第一个阶梯的起始数量必须为1' }
  }

  // 检查数量连续性和价格递减
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i]

    if (tier.minQuantity <= 0) {
      return { valid: false, error: '数量必须大于0' }
    }

    if (tier.price <= 0) {
      return { valid: false, error: '价格必须大于0' }
    }

    // 检查与下一个阶梯的连续性
    if (i < sorted.length - 1) {
      const nextTier = sorted[i + 1]

      if (tier.maxQuantity === null) {
        return { valid: false, error: '只有最后一个阶梯可以没有上限' }
      }

      if (nextTier.minQuantity !== tier.maxQuantity + 1) {
        return { valid: false, error: '阶梯数量范围必须连续' }
      }

      // 检查价格递减
      if (nextTier.price > tier.price) {
        return { valid: false, error: '数量越多，价格应该越低或持平' }
      }
    }
  }

  return { valid: true }
}
```

**Step 2: Commit**

```bash
git add src/lib/pricing.ts
git commit -m "feat: add tiered pricing utility functions"
```

---

## Task 3: 后端 Server Actions

**Files:**
- Modify: `src/actions/products.ts`

**Step 1: 更新 productSchema 添加 priceTiers**

在 `productSchema` 中添加：

```typescript
priceTiers: z.array(z.object({
  minQuantity: z.coerce.number().int().min(1),
  maxQuantity: z.coerce.number().int().min(1).nullable(),
  price: z.coerce.number().min(0),
})).optional().nullable(),
```

**Step 2: 更新 getProduct 函数包含 priceTiers**

修改 `getProduct` 函数的 include：

```typescript
include: {
  category: true,
  images: { orderBy: { sortOrder: 'asc' } },
  variants: true,
  priceTiers: { orderBy: { sortOrder: 'asc' } },
  attributeValues: {
    include: {
      attribute: true,
      option: true,
    },
  },
},
```

并在返回时转换 Decimal：

```typescript
priceTiers: product.priceTiers.map((t) => ({
  ...t,
  price: Number(t.price),
})),
```

**Step 3: 更新 getProductBySlug 函数包含 priceTiers**

同样添加 priceTiers 到 include 和返回值转换。

**Step 4: 更新 getProducts 函数包含 priceTiers**

在 include 中添加：

```typescript
priceTiers: { orderBy: { sortOrder: 'asc' } },
```

并在 map 中转换：

```typescript
priceTiers: p.priceTiers.map((t) => ({
  ...t,
  price: Number(t.price),
})),
```

**Step 5: 更新 createProduct 函数处理 priceTiers**

在 rawData 中添加解析 priceTiers：

```typescript
const priceTiersJson = formData.get('priceTiers')
let priceTiers: any[] | null = null
if (priceTiersJson && typeof priceTiersJson === 'string') {
  try {
    const parsed = JSON.parse(priceTiersJson)
    priceTiers = parsed.length > 0 ? parsed : null
  } catch {
    // ignore parse errors
  }
}
```

在事务中创建 priceTiers：

```typescript
// Create price tiers
if (priceTiers && priceTiers.length > 0) {
  await tx.priceTier.createMany({
    data: priceTiers.map((tier, index) => ({
      productId: product.id,
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity,
      price: tier.price,
      sortOrder: index,
    })),
  })
}
```

**Step 6: 更新 updateProduct 函数处理 priceTiers**

删除现有 priceTiers 并创建新的：

```typescript
// Delete existing price tiers
await tx.priceTier.deleteMany({ where: { productId: id } })

// Create new price tiers
if (priceTiers && priceTiers.length > 0) {
  await tx.priceTier.createMany({
    data: priceTiers.map((tier, index) => ({
      productId: id,
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity,
      price: tier.price,
      sortOrder: index,
    })),
  })
}
```

**Step 7: Commit**

```bash
git add src/actions/products.ts
git commit -m "feat(api): handle price tiers in product CRUD operations"
```

---

## Task 4: 阶梯价格编辑组件

**Files:**
- Create: `src/components/admin/price-tiers-editor.tsx`

**Step 1: 创建 PriceTiersEditor 组件**

```typescript
'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { validatePriceTiers } from '@/lib/pricing'

export interface PriceTierInput {
  minQuantity: number
  maxQuantity: number | null
  price: number
}

interface PriceTiersEditorProps {
  tiers: PriceTierInput[]
  onChange: (tiers: PriceTierInput[]) => void
  defaultPrice?: number
}

export function PriceTiersEditor({ tiers, onChange, defaultPrice = 0 }: PriceTiersEditorProps) {
  const [error, setError] = useState<string>('')

  const addTier = () => {
    if (tiers.length >= 5) {
      setError('最多只能设置5个阶梯')
      return
    }

    const lastTier = tiers[tiers.length - 1]
    const newMinQuantity = lastTier ? (lastTier.maxQuantity || lastTier.minQuantity) + 1 : 1
    const newPrice = lastTier ? Math.max(lastTier.price * 0.9, 0.01) : defaultPrice

    const newTiers = [...tiers]
    // 如果有最后一个阶梯，给它设置 maxQuantity
    if (lastTier && lastTier.maxQuantity === null) {
      newTiers[newTiers.length - 1] = {
        ...lastTier,
        maxQuantity: newMinQuantity - 1,
      }
    }

    newTiers.push({
      minQuantity: newMinQuantity,
      maxQuantity: null,
      price: Math.round(newPrice * 100) / 100,
    })

    onChange(newTiers)
    setError('')
  }

  const removeTier = (index: number) => {
    const newTiers = tiers.filter((_, i) => i !== index)

    // 如果删除后还有阶梯，确保最后一个没有上限
    if (newTiers.length > 0) {
      newTiers[newTiers.length - 1] = {
        ...newTiers[newTiers.length - 1],
        maxQuantity: null,
      }
    }

    onChange(newTiers)
    setError('')
  }

  const updateTier = (index: number, field: keyof PriceTierInput, value: number | null) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }

    // 自动调整相邻阶梯的范围
    if (field === 'maxQuantity' && value !== null && index < tiers.length - 1) {
      newTiers[index + 1] = {
        ...newTiers[index + 1],
        minQuantity: value + 1,
      }
    }

    const validation = validatePriceTiers(newTiers)
    setError(validation.error || '')

    onChange(newTiers)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">阶梯价格（B2B批量定价）</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTier}
          disabled={tiers.length >= 5}
        >
          <Plus className="h-4 w-4 mr-1" />
          添加阶梯
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          未设置阶梯价格，将使用标准单价。
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-3">起始数量</div>
            <div className="col-span-1 text-center">~</div>
            <div className="col-span-3">结束数量</div>
            <div className="col-span-4">单价</div>
            <div className="col-span-1"></div>
          </div>

          {tiers.map((tier, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <Input
                  type="number"
                  min="1"
                  value={tier.minQuantity}
                  onChange={(e) => updateTier(index, 'minQuantity', parseInt(e.target.value) || 1)}
                  className="h-9"
                />
              </div>
              <div className="col-span-1 text-center text-muted-foreground">~</div>
              <div className="col-span-3">
                {index === tiers.length - 1 ? (
                  <div className="h-9 flex items-center text-sm text-muted-foreground">
                    及以上
                  </div>
                ) : (
                  <Input
                    type="number"
                    min={tier.minQuantity}
                    value={tier.maxQuantity || ''}
                    onChange={(e) => updateTier(index, 'maxQuantity', parseInt(e.target.value) || null)}
                    className="h-9"
                  />
                )}
              </div>
              <div className="col-span-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={tier.price}
                    onChange={(e) => updateTier(index, 'price', parseFloat(e.target.value) || 0)}
                    className="h-9 pl-7"
                  />
                </div>
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeTier(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tiers.length > 0 && defaultPrice > 0 && (
        <p className="text-xs text-muted-foreground">
          对比标准单价 ¥{defaultPrice.toFixed(2)}，最高可节省{' '}
          {Math.round((1 - Math.min(...tiers.map(t => t.price)) / defaultPrice) * 100)}%
        </p>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/admin/price-tiers-editor.tsx
git commit -m "feat(admin): add PriceTiersEditor component"
```

---

## Task 5: 集成阶梯价格到产品表单

**Files:**
- Modify: `src/components/admin/product-form.tsx`

**Step 1: 导入 PriceTiersEditor 和类型**

添加导入：

```typescript
import { PriceTiersEditor, type PriceTierInput } from './price-tiers-editor'
```

**Step 2: 添加 priceTiers 状态**

```typescript
const [priceTiers, setPriceTiers] = useState<PriceTierInput[]>(
  product?.priceTiers?.map((t) => ({
    minQuantity: t.minQuantity,
    maxQuantity: t.maxQuantity,
    price: Number(t.price),
  })) || []
)
```

**Step 3: 添加隐藏 input**

```typescript
<input type="hidden" name="priceTiers" value={JSON.stringify(priceTiers)} />
```

**Step 4: 在 Pricing Card 后添加阶梯价格编辑器**

在 Pricing Card 的 `</Card>` 后添加：

```typescript
<Card>
  <CardHeader>
    <CardTitle>批量定价</CardTitle>
  </CardHeader>
  <CardContent>
    <PriceTiersEditor
      tiers={priceTiers}
      onChange={setPriceTiers}
      defaultPrice={product?.price || 0}
    />
  </CardContent>
</Card>
```

**Step 5: 更新 ProductWithImages 类型**

添加 priceTiers 到类型定义：

```typescript
priceTiers?: Array<{
  id: string
  minQuantity: number
  maxQuantity: number | null
  price: number
  sortOrder: number
}>
```

**Step 6: Commit**

```bash
git add src/components/admin/product-form.tsx
git commit -m "feat(admin): integrate price tiers editor into product form"
```

---

## Task 6: 前端产品详情页展示阶梯价格

**Files:**
- Create: `src/components/store/price-tiers-table.tsx`
- Create: `src/components/store/quantity-selector.tsx`
- Modify: `src/app/(store)/products/[slug]/page.tsx`

**Step 1: 创建阶梯价格表组件**

```typescript
// src/components/store/price-tiers-table.tsx
'use client'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'
import type { PriceTier } from '@/lib/pricing'

interface PriceTiersTableProps {
  tiers: PriceTier[]
  currentQuantity: number
  defaultPrice: number
}

export function PriceTiersTable({ tiers, currentQuantity, defaultPrice }: PriceTiersTableProps) {
  if (!tiers || tiers.length === 0) {
    return null
  }

  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity)

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-3 text-sm font-medium bg-muted/50 px-4 py-2">
        <div>数量</div>
        <div>单价</div>
        <div className="text-right">节省</div>
      </div>
      <div className="divide-y">
        {sortedTiers.map((tier, index) => {
          const isActive =
            currentQuantity >= tier.minQuantity &&
            (tier.maxQuantity === null || currentQuantity <= tier.maxQuantity)
          const savings = Math.round((1 - tier.price / defaultPrice) * 100)
          const isLowest = index === sortedTiers.length - 1

          return (
            <div
              key={tier.id}
              className={cn(
                'grid grid-cols-3 px-4 py-3 text-sm transition-colors',
                isActive && 'bg-primary/5 font-medium'
              )}
            >
              <div>
                {tier.minQuantity}
                {tier.maxQuantity ? `-${tier.maxQuantity}` : '+'}件
              </div>
              <div className={cn(isActive && 'text-primary')}>
                {formatPrice(tier.price)}/件
              </div>
              <div className="text-right flex items-center justify-end gap-2">
                {savings > 0 ? (
                  <span className="text-green-600">{savings}%</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
                {isLowest && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    推荐
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: 创建数量选择器组件**

```typescript
// src/components/store/quantity-selector.tsx
'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 9999,
}: QuantitySelectorProps) {
  const decrease = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const increase = () => {
    if (value < max) {
      onChange(value + 1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || min
    onChange(Math.max(min, Math.min(max, newValue)))
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10"
        onClick={decrease}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        className="w-20 text-center h-10"
        min={min}
        max={max}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10"
        onClick={increase}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

**Step 3: 创建 B2B 产品购买区域组件**

```typescript
// src/components/store/b2b-product-actions.tsx
'use client'

import { useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { calculateTierPrice, getNextTierHint, type PriceTier } from '@/lib/pricing'
import { PriceTiersTable } from './price-tiers-table'
import { QuantitySelector } from './quantity-selector'
import { AddToQuoteButton } from './add-to-quote-button'

interface B2BProductActionsProps {
  productId: string
  productName: string
  productImage?: string
  sku?: string
  defaultPrice: number
  priceTiers: PriceTier[]
  stock: number
}

export function B2BProductActions({
  productId,
  productName,
  productImage,
  sku,
  defaultPrice,
  priceTiers,
  stock,
}: B2BProductActionsProps) {
  const [quantity, setQuantity] = useState(1)

  const currentPrice = calculateTierPrice(priceTiers, quantity, defaultPrice)
  const subtotal = currentPrice * quantity
  const nextTierHint = getNextTierHint(priceTiers, quantity, defaultPrice)

  return (
    <div className="space-y-6">
      {/* 阶梯价格表 */}
      {priceTiers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">批量价格</p>
          <PriceTiersTable
            tiers={priceTiers}
            currentQuantity={quantity}
            defaultPrice={defaultPrice}
          />
        </div>
      )}

      {/* 数量选择 */}
      <div className="space-y-2">
        <p className="text-sm font-medium">数量</p>
        <QuantitySelector
          value={quantity}
          onChange={setQuantity}
          min={1}
          max={stock}
        />
      </div>

      {/* 当前价格和小计 */}
      <div className="flex items-baseline justify-between py-3 border-t border-b">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">当前单价</p>
          <p className="text-xl font-bold text-primary">{formatPrice(currentPrice)}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm text-muted-foreground">小计</p>
          <p className="text-xl font-bold">{formatPrice(subtotal)}</p>
        </div>
      </div>

      {/* 下一阶梯提示 */}
      {nextTierHint && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
          <Lightbulb className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            再加 <strong>{nextTierHint.quantityNeeded}</strong> 件即可享受{' '}
            <strong>{formatPrice(nextTierHint.nextPrice)}/件</strong> 的优惠价，
            节省 {nextTierHint.savingsPercent}%
          </p>
        </div>
      )}

      {/* 加入询价单按钮 */}
      <AddToQuoteButton
        productId={productId}
        productName={productName}
        productPrice={currentPrice}
        productImage={productImage}
        sku={sku}
        quantity={quantity}
        size="lg"
        className="w-full"
      >
        加入询价单
      </AddToQuoteButton>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/components/store/price-tiers-table.tsx src/components/store/quantity-selector.tsx src/components/store/b2b-product-actions.tsx
git commit -m "feat(store): add B2B product actions with tiered pricing display"
```

---

## Task 7: 更新产品详情页

**Files:**
- Modify: `src/app/(store)/products/[slug]/page.tsx`

**Step 1: 导入 B2BProductActions 组件**

```typescript
import { B2BProductActions } from '@/components/store/b2b-product-actions'
```

**Step 2: 替换购买区域**

将原来的 `{/* Add to Cart or Quote based on project type */}` 部分替换为：

```typescript
{/* Add to Cart or Quote based on project type */}
{product.stock > 0 ? (
  <div className="pt-4">
    {process.env.NEXT_PUBLIC_PROJECT_TYPE === 'B2B' ? (
      <B2BProductActions
        productId={product.id}
        productName={product.name}
        productImage={product.images[0]?.url}
        sku={product.sku || undefined}
        defaultPrice={Number(product.price)}
        priceTiers={product.priceTiers?.map(t => ({
          id: t.id,
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          price: Number(t.price),
          sortOrder: t.sortOrder,
        })) || []}
        stock={product.stock}
      />
    ) : (
      <AddToCartButton
        productId={product.id}
        productName={product.name}
        productPrice={Number(product.price)}
        productImage={product.images[0]?.url}
        stock={product.stock}
        size="lg"
        className="w-full"
      >
        Add to Cart
      </AddToCartButton>
    )}
  </div>
) : (
  <div className="pt-4">
    <p className="text-muted-foreground">
      This product is currently out of stock.
    </p>
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/app/(store)/products/[slug]/page.tsx
git commit -m "feat(store): integrate B2B tiered pricing into product detail page"
```

---

## Task 8: 更新产品卡片显示最低价

**Files:**
- Modify: `src/components/store/product-card.tsx`

**Step 1: 导入工具函数**

```typescript
import { getLowestTierPrice } from '@/lib/pricing'
```

**Step 2: 计算显示价格**

在组件内部添加：

```typescript
const isB2B = process.env.NEXT_PUBLIC_PROJECT_TYPE === 'B2B'
const displayPrice = isB2B && product.priceTiers?.length
  ? getLowestTierPrice(
      product.priceTiers.map(t => ({
        id: t.id,
        minQuantity: t.minQuantity,
        maxQuantity: t.maxQuantity,
        price: Number(t.price),
        sortOrder: t.sortOrder,
      })),
      Number(product.price)
    )
  : Number(product.price)
const showFromPrice = isB2B && product.priceTiers?.length > 0
```

**Step 3: 更新价格显示**

```typescript
{/* Price */}
<div className="flex items-baseline gap-2 mb-3">
  <span className="text-lg font-bold text-accent">
    {showFromPrice && <span className="text-sm font-normal">¥</span>}
    {formatPrice(displayPrice).replace('¥', '')}
    {showFromPrice && <span className="text-sm font-normal ml-0.5">起</span>}
  </span>
  {!showFromPrice && hasDiscount && (
    <span className="text-xs text-muted-foreground line-through">
      {formatPrice(Number(product.comparePrice))}
    </span>
  )}
</div>
```

**Step 4: 更新 product 类型以包含 priceTiers**

在 `ProductWithRelations` 类型中添加：

```typescript
priceTiers?: Array<{
  id: string
  minQuantity: number
  maxQuantity: number | null
  price: number
  sortOrder: number
}>
```

**Step 5: Commit**

```bash
git add src/components/store/product-card.tsx
git commit -m "feat(store): display lowest tier price on product cards for B2B"
```

---

## Task 9: 更新询价单展示阶梯价格

**Files:**
- Modify: `src/components/store/mini-quote.tsx`
- Modify: `src/stores/quote.ts`

**Step 1: 更新 QuoteItem 接口添加 tierLabel**

在 `src/stores/quote.ts` 中的 `QuoteItem` 接口添加：

```typescript
tierLabel?: string  // 例如 "11-50件阶梯价"
```

**Step 2: 更新 mini-quote.tsx 显示阶梯信息**

在商品列表项中添加阶梯标签显示：

```typescript
{item.tierLabel && (
  <p className="text-xs text-muted-foreground">
    ({item.tierLabel})
  </p>
)}
```

**Step 3: 更新 AddToQuoteButton 传递阶梯信息**

修改 `AddToQuoteButtonProps` 添加 `tierLabel?` 参数，并在 `addItem` 时传递。

**Step 4: 更新 B2BProductActions 计算并传递 tierLabel**

```typescript
// 计算当前阶梯标签
const getCurrentTierLabel = () => {
  if (!priceTiers || priceTiers.length === 0) return undefined
  const sortedTiers = [...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity)
  for (const tier of sortedTiers) {
    if (quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity)) {
      return tier.maxQuantity === null
        ? `${tier.minQuantity}件及以上阶梯价`
        : `${tier.minQuantity}-${tier.maxQuantity}件阶梯价`
    }
  }
  return undefined
}
```

**Step 5: Commit**

```bash
git add src/components/store/mini-quote.tsx src/stores/quote.ts src/components/store/add-to-quote-button.tsx src/components/store/b2b-product-actions.tsx
git commit -m "feat(store): show tier label in quote items"
```

---

## Task 10: 更新 Quote 模型添加期望价格

**Files:**
- Modify: `src/components/store/mini-quote.tsx`
- Modify: `src/actions/quotes.ts`

**Step 1: 在询价表单中添加期望价格输入框**

在 remark 输入框后添加：

```typescript
<div>
  <Label htmlFor="expectedPrice">期望总价（选填）</Label>
  <Input
    id="expectedPrice"
    name="expectedPrice"
    type="number"
    step="0.01"
    min="0"
    value={formData.expectedPrice}
    onChange={handleInputChange}
    placeholder="您期望的总价格"
  />
  <p className="text-xs text-muted-foreground mt-1">
    填写期望价格有助于我们为您提供更优惠的报价
  </p>
</div>
```

**Step 2: 更新 formData 状态**

添加 `expectedPrice: ''` 到初始状态。

**Step 3: 更新 createQuote action**

修改 `src/actions/quotes.ts` 接受并保存 `expectedPrice`。

**Step 4: Commit**

```bash
git add src/components/store/mini-quote.tsx src/actions/quotes.ts
git commit -m "feat(store): add expected price field to quote form"
```

---

## Task 11: 最终测试和验证

**Step 1: 运行开发服务器**

Run: `npm run dev`

**Step 2: 测试管理后台**

1. 访问 `/admin/products/new` 创建新产品
2. 在"批量定价"卡片中添加阶梯价格
3. 保存并验证数据正确保存

**Step 3: 测试前端展示**

1. 确保 `.env` 中 `NEXT_PUBLIC_PROJECT_TYPE="B2B"`
2. 访问产品详情页，验证阶梯价格表显示
3. 改变数量，验证价格自动计算
4. 验证下一阶梯提示

**Step 4: 测试询价流程**

1. 添加产品到询价单
2. 验证阶梯价格和标签显示
3. 填写期望价格并提交

**Step 5: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete B2B tiered pricing feature"
```

---

## 验收标准

- [ ] 管理员可以在产品编辑页配置1-5个阶梯价格
- [ ] B2B模式下产品详情页正确展示阶梯价格表
- [ ] 数量变化时自动计算并显示对应阶梯价格
- [ ] 接近下一阶梯时显示智能提示
- [ ] 产品卡片显示"¥XX起"格式的最低价
- [ ] 询价单正确应用阶梯价格并显示阶梯标签
- [ ] 客户可以填写期望价格进行议价
- [ ] B2C模式下不显示阶梯价格功能
