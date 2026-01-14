"use client"

import { useEffect, useState } from "react"
import { User, Package, ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CustomerContext {
  type: 'user' | 'guest'
  user?: {
    id: string
    name: string | null
    email: string
    phone: string | null
    createdAt: string
  }
  visitorId?: string
  orders: Array<{
    id: string
    orderNumber: string
    total: string
    status: string
    createdAt: string
  }>
  cart: Array<{
    name: string
    quantity: number
    price: string
  }>
}

interface CustomerContextProps {
  sessionId: string
}

export function CustomerContext({ sessionId }: CustomerContextProps) {
  const [context, setContext] = useState<CustomerContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContext = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/chat/context/${sessionId}`)
        const data = await res.json()
        setContext(data)
      } catch (err) {
        console.error('Failed to load context:', err)
      } finally {
        setLoading(false)
      }
    }

    loadContext()
  }, [sessionId])

  if (loading) {
    return (
      <div className="w-72 border-l p-4 bg-card">
        <p className="text-muted-foreground text-sm">加载中...</p>
      </div>
    )
  }

  if (!context) {
    return (
      <div className="w-72 border-l p-4 bg-card">
        <p className="text-muted-foreground text-sm">无法获取客户信息</p>
      </div>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN')
  }

  const formatPrice = (price: string | number) => {
    return `¥${Number(price).toFixed(2)}`
  }

  return (
    <div className="w-72 border-l bg-card overflow-y-auto">
      {/* User Info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">客户信息</span>
        </div>

        {context.type === 'user' && context.user ? (
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">姓名:</span> {context.user.name || '-'}</p>
            <p><span className="text-muted-foreground">邮箱:</span> {context.user.email}</p>
            <p><span className="text-muted-foreground">电话:</span> {context.user.phone || '-'}</p>
            <p><span className="text-muted-foreground">注册时间:</span> {formatDate(context.user.createdAt)}</p>
          </div>
        ) : (
          <div className="text-sm">
            <Badge variant="secondary">访客</Badge>
            <p className="text-muted-foreground mt-2 text-xs">ID: {context.visitorId?.slice(0, 12)}...</p>
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">最近订单</span>
        </div>

        {context.orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无订单</p>
        ) : (
          <div className="space-y-2">
            {context.orders.map((order) => (
              <div key={order.id} className="text-sm p-2 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="font-mono text-xs">{order.orderNumber}</span>
                  <Badge variant="outline" className="text-xs">{order.status}</Badge>
                </div>
                <div className="flex justify-between mt-1 text-muted-foreground">
                  <span>{formatDate(order.createdAt)}</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">购物车</span>
        </div>

        {context.cart.length === 0 ? (
          <p className="text-sm text-muted-foreground">购物车为空</p>
        ) : (
          <div className="space-y-2">
            {context.cart.map((item, i) => (
              <div key={i} className="text-sm p-2 bg-muted rounded-lg">
                <p className="truncate">{item.name}</p>
                <div className="flex justify-between mt-1 text-muted-foreground">
                  <span>x{item.quantity}</span>
                  <span>{formatPrice(item.price)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
