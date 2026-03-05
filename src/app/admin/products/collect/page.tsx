import { ProductCollectForm } from '@/components/admin/product-collect-form'

export default function CollectProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">采集 1688 商品</h1>
        <p className="text-muted-foreground mt-1">
          粘贴 1688 商品链接，自动采集商品数据
        </p>
      </div>
      <ProductCollectForm />
    </div>
  )
}
