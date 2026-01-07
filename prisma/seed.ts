import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  })
  console.log('Created admin user:', admin.email)

  // Create test customer
  const customerPassword = await hash('customer123', 12)
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      name: 'Test Customer',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  })
  console.log('Created customer:', customer.email)

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'home-decor' },
      update: {},
      create: {
        name: 'Home Decor',
        slug: 'home-decor',
        description: 'Beautiful home decoration items',
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'textiles' },
      update: {},
      create: {
        name: 'Textiles',
        slug: 'textiles',
        description: 'Quality fabrics and textiles',
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'art' },
      update: {},
      create: {
        name: 'Art',
        slug: 'art',
        description: 'Artwork and prints',
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'storage' },
      update: {},
      create: {
        name: 'Storage',
        slug: 'storage',
        description: 'Storage and organization',
        sortOrder: 4,
      },
    }),
  ])
  console.log('Created categories:', categories.length)

  // Create sample products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: 'artisan-ceramic-vase' },
      update: {},
      create: {
        name: 'Artisan Ceramic Vase',
        slug: 'artisan-ceramic-vase',
        description: 'Handcrafted ceramic vase with unique glaze finish. Perfect for fresh or dried flower arrangements.',
        price: 89,
        comparePrice: 120,
        stock: 24,
        sku: 'ACV-001',
        categoryId: categories[0].id,
        isFeatured: true,
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600&h=800&fit=crop', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'linen-blend-throw' },
      update: {},
      create: {
        name: 'Linen Blend Throw',
        slug: 'linen-blend-throw',
        description: 'Luxuriously soft linen blend throw blanket. Perfect for adding warmth and texture to any room.',
        price: 145,
        stock: 12,
        sku: 'LBT-002',
        categoryId: categories[1].id,
        isFeatured: true,
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&h=800&fit=crop', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'handwoven-basket-set' },
      update: {},
      create: {
        name: 'Handwoven Basket Set',
        slug: 'handwoven-basket-set',
        description: 'Set of 3 handwoven seagrass baskets. Versatile storage solution with natural beauty.',
        price: 68,
        stock: 18,
        sku: 'HBS-003',
        categoryId: categories[3].id,
        isFeatured: false,
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=600&h=800&fit=crop', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'botanical-print' },
      update: {},
      create: {
        name: 'Botanical Print',
        slug: 'botanical-print',
        description: 'Museum-quality botanical print on archival paper. Framed in solid oak.',
        price: 120,
        comparePrice: 150,
        stock: 8,
        sku: 'BP-004',
        categoryId: categories[2].id,
        isFeatured: true,
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=600&h=800&fit=crop', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'marble-candle-holder' },
      update: {},
      create: {
        name: 'Marble Candle Holder',
        slug: 'marble-candle-holder',
        description: 'Elegant marble candle holder with subtle veining. Each piece is unique.',
        price: 55,
        stock: 32,
        sku: 'MCH-005',
        categoryId: categories[0].id,
        isFeatured: false,
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=600&h=800&fit=crop', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'wool-area-rug' },
      update: {},
      create: {
        name: 'Wool Area Rug',
        slug: 'wool-area-rug',
        description: 'Hand-tufted wool rug with modern geometric pattern. 5x7 feet.',
        price: 320,
        comparePrice: 400,
        stock: 6,
        sku: 'WAR-006',
        categoryId: categories[1].id,
        isFeatured: true,
        images: {
          create: [
            { url: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=600&h=800&fit=crop', sortOrder: 0 },
          ],
        },
      },
    }),
  ])
  console.log('Created products:', products.length)

  // Create default settings
  await prisma.setting.upsert({
    where: { key: 'store' },
    update: {},
    create: {
      key: 'store',
      value: {
        name: 'Maison',
        description: 'Curated goods for modern living',
        email: 'hello@maison.com',
        phone: '+1 234 567 890',
        currency: 'USD',
        currencySymbol: '$',
      },
    },
  })

  await prisma.setting.upsert({
    where: { key: 'shipping' },
    update: {},
    create: {
      key: 'shipping',
      value: {
        freeShippingThreshold: 150,
        defaultShippingFee: 15,
      },
    },
  })
  console.log('Created settings')

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
