# Database Seed Script

## prisma/seed.ts

```typescript
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
      where: { slug: 'electronics' },
      update: {},
      create: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and accessories',
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'clothing' },
      update: {},
      create: {
        name: 'Clothing',
        slug: 'clothing',
        description: 'Fashion and apparel',
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'home-garden' },
      update: {},
      create: {
        name: 'Home & Garden',
        slug: 'home-garden',
        description: 'Home decoration and garden supplies',
        sortOrder: 3,
      },
    }),
  ])
  console.log('Created categories:', categories.length)

  // Create sample products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: 'wireless-headphones' },
      update: {},
      create: {
        name: 'Wireless Headphones',
        slug: 'wireless-headphones',
        description: 'High-quality wireless headphones with noise cancellation.',
        price: 199.99,
        comparePrice: 249.99,
        stock: 50,
        sku: 'WH-001',
        categoryId: categories[0].id,
        isFeatured: true,
        images: {
          create: [
            { url: '/uploads/products/headphones-1.jpg', sortOrder: 0 },
            { url: '/uploads/products/headphones-2.jpg', sortOrder: 1 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'smart-watch' },
      update: {},
      create: {
        name: 'Smart Watch',
        slug: 'smart-watch',
        description: 'Feature-rich smartwatch with health tracking.',
        price: 299.99,
        stock: 30,
        sku: 'SW-001',
        categoryId: categories[0].id,
        isFeatured: true,
        images: {
          create: [
            { url: '/uploads/products/watch-1.jpg', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'cotton-t-shirt' },
      update: {},
      create: {
        name: 'Cotton T-Shirt',
        slug: 'cotton-t-shirt',
        description: 'Comfortable 100% cotton t-shirt.',
        price: 29.99,
        stock: 100,
        sku: 'TS-001',
        categoryId: categories[1].id,
        variants: {
          create: [
            { name: 'Small / White', sku: 'TS-001-S-W', price: 29.99, stock: 20 },
            { name: 'Medium / White', sku: 'TS-001-M-W', price: 29.99, stock: 25 },
            { name: 'Large / White', sku: 'TS-001-L-W', price: 29.99, stock: 20 },
            { name: 'Small / Black', sku: 'TS-001-S-B', price: 29.99, stock: 15 },
            { name: 'Medium / Black', sku: 'TS-001-M-B', price: 29.99, stock: 20 },
          ],
        },
        images: {
          create: [
            { url: '/uploads/products/tshirt-1.jpg', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'desk-lamp' },
      update: {},
      create: {
        name: 'LED Desk Lamp',
        slug: 'desk-lamp',
        description: 'Modern LED desk lamp with adjustable brightness.',
        price: 49.99,
        comparePrice: 59.99,
        stock: 45,
        sku: 'DL-001',
        categoryId: categories[2].id,
        images: {
          create: [
            { url: '/uploads/products/lamp-1.jpg', sortOrder: 0 },
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
        name: 'My B2C Shop',
        description: 'Your one-stop online shop',
        email: 'support@myshop.com',
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
        freeShippingThreshold: 100,
        defaultShippingFee: 10,
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
```

## Dependencies

Make sure to install bcryptjs:

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```
