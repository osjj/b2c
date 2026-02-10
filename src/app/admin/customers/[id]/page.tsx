import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mail, Phone, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { prisma } from '@/lib/prisma'
import { formatDate, formatPrice } from '@/lib/utils'

interface AdminCustomerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminCustomerDetailPage({ params }: AdminCustomerDetailPageProps) {
  const { id } = await params

  const customer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      role: true,
      addresses: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { items: true } },
        },
      },
      _count: {
        select: {
          orders: true,
          addresses: true,
        },
      },
    },
  })

  if (!customer) {
    notFound()
  }

  const totalSpent = customer.orders.reduce((sum, order) => sum + Number(order.total), 0)
  const paidSpent = customer.orders
    .filter((order) => order.paymentStatus === 'PAID')
    .reduce((sum, order) => sum + Number(order.total), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{customer.name || 'Unnamed Customer'}</h1>
          <p className="text-muted-foreground">Customer ID: {customer.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold">{customer._count.orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold">{formatPrice(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Paid Revenue</p>
            <p className="text-2xl font-bold">{formatPrice(paidSpent)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Customer Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{customer.name || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone || '-'}</span>
            </div>
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium">{formatDate(customer.createdAt)}</p>
            </div>
            <div className="pt-1">
              <Badge variant="secondary">{customer.role}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Saved Addresses ({customer._count.addresses})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.addresses.length === 0 ? (
              <p className="text-muted-foreground">No saved addresses.</p>
            ) : (
              customer.addresses.map((address) => (
                <div key={address.id} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{address.name}</p>
                    {address.isDefault && <Badge>Default</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{address.phone}</p>
                  <p className="text-sm mt-1">
                    {address.province} {address.city} {address.district}
                  </p>
                  <p className="text-sm">{address.street}</p>
                  {address.zipCode && (
                    <p className="text-sm text-muted-foreground">ZIP: {address.zipCode}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order History ({customer._count.orders})</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.orders.length === 0 ? (
            <p className="text-muted-foreground">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/admin/orders/${order.id}`} className="font-medium hover:text-primary">
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{order._count.items}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(Number(order.total))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
