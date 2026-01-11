import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const orderNumber = searchParams.get('orderNumber')

  if (!orderNumber) {
    return NextResponse.json({ error: 'Order number is required' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: orderNumber.trim() },
      select: { id: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ orderId: order.id })
  } catch (error) {
    console.error('Order lookup error:', error)
    return NextResponse.json({ error: 'Failed to lookup order' }, { status: 500 })
  }
}
