import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, Users, DollarSign, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react"
import Link from "next/link"

const stats = [
  {
    title: "Total Revenue",
    value: "$12,450",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
    href: "/admin/orders",
  },
  {
    title: "Orders",
    value: "156",
    change: "+8.2%",
    trend: "up",
    icon: ShoppingCart,
    href: "/admin/orders",
  },
  {
    title: "Products",
    value: "89",
    change: "+3",
    trend: "up",
    icon: Package,
    href: "/admin/products",
  },
  {
    title: "Customers",
    value: "2,420",
    change: "+18.7%",
    trend: "up",
    icon: Users,
    href: "/admin/customers",
  },
]

const recentOrders = [
  { id: "ORD-001", customer: "Sarah Johnson", amount: 245.00, status: "Completed", date: "2 hours ago" },
  { id: "ORD-002", customer: "Michael Chen", amount: 189.50, status: "Processing", date: "4 hours ago" },
  { id: "ORD-003", customer: "Emily Davis", amount: 320.00, status: "Pending", date: "6 hours ago" },
  { id: "ORD-004", customer: "James Wilson", amount: 156.75, status: "Completed", date: "8 hours ago" },
  { id: "ORD-005", customer: "Lisa Anderson", amount: 412.00, status: "Shipped", date: "1 day ago" },
]

const topProducts = [
  { name: "Artisan Ceramic Vase", sales: 124, revenue: "$11,036" },
  { name: "Linen Blend Throw", sales: 98, revenue: "$14,210" },
  { name: "Handwoven Basket Set", sales: 87, revenue: "$5,916" },
  { name: "Botanical Print", sales: 76, revenue: "$9,120" },
]

const statusColors: Record<string, string> = {
  Completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening with your store.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-xs ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts & Tables */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Orders */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl">Recent Orders</CardTitle>
            <Link
              href="/admin/orders"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View All
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-sm">{order.customer}</p>
                      <p className="text-xs text-muted-foreground">{order.id}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status]}`}
                    >
                      {order.status}
                    </span>
                    <div>
                      <p className="font-medium text-sm">${order.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{order.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-xl">Top Products</CardTitle>
            <Link
              href="/admin/products"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View All
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-5">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sales} sales</p>
                    </div>
                  </div>
                  <p className="font-medium text-sm">{product.revenue}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/products/new"
              className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-center group"
            >
              <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary" />
              <p className="text-sm font-medium">Add Product</p>
            </Link>
            <Link
              href="/admin/categories/new"
              className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-center group"
            >
              <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary" />
              <p className="text-sm font-medium">Add Category</p>
            </Link>
            <Link
              href="/admin/orders"
              className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-center group"
            >
              <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary" />
              <p className="text-sm font-medium">View Orders</p>
            </Link>
            <Link
              href="/admin/settings"
              className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-center group"
            >
              <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary" />
              <p className="text-sm font-medium">Store Settings</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
