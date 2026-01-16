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
