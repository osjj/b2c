'use client'

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
