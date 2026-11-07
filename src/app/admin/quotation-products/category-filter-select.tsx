'use client'

interface CategoryFilterSelectProps {
  category: string
  categories: string[]
}

export function CategoryFilterSelect({ category, categories }: CategoryFilterSelectProps) {
  return (
    <select
      name="category"
      aria-label="筛选产品分类"
      defaultValue={category}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="h-11 w-full rounded-md border bg-white px-3 text-sm"
    >
      <option value="">全部分类</option>
      <option value="__uncategorized__">未分类</option>
      {categories.map((name) => <option key={name} value={name}>{name}</option>)}
    </select>
  )
}
