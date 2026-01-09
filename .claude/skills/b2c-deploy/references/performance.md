# Performance Optimization

## Next.js Optimizations

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-cdn.com',
      },
    ],
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}

module.exports = nextConfig
```

## Database Optimizations

### Prisma Query Optimization

```typescript
// Use select to fetch only needed fields
const products = await prisma.product.findMany({
  select: {
    id: true,
    name: true,
    slug: true,
    price: true,
    images: {
      select: { url: true },
      take: 1,
    },
  },
  where: { isActive: true },
  take: 20,
})

// Use include wisely
const order = await prisma.order.findUnique({
  where: { id },
  include: {
    items: {
      include: {
        product: {
          select: { name: true, slug: true },
        },
      },
    },
  },
})
```

### Database Indexes

Add to prisma/schema.prisma:

```prisma
model Product {
  // ... fields

  @@index([categoryId])
  @@index([isActive, isFeatured])
  @@index([slug])
  @@index([createdAt])
}

model Order {
  // ... fields

  @@index([userId])
  @@index([status])
  @@index([orderNumber])
  @@index([createdAt])
}
```

### Connection Pooling

For serverless (Vercel), use Prisma Accelerate or PgBouncer:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Caching Strategies

### React Cache

```typescript
import { cache } from 'react'
import { prisma } from '@/lib/prisma'

export const getCategories = cache(async () => {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
})

export const getProduct = cache(async (slug: string) => {
  return prisma.product.findUnique({
    where: { slug, isActive: true },
    include: { images: true, category: true },
  })
})
```

### Unstable Cache (Next.js)

```typescript
import { unstable_cache } from 'next/cache'

export const getCachedProducts = unstable_cache(
  async (categoryId?: string) => {
    return prisma.product.findMany({
      where: { isActive: true, categoryId },
      include: { images: { take: 1 } },
      take: 20,
    })
  },
  ['products'],
  {
    revalidate: 60, // 60 seconds
    tags: ['products'],
  }
)
```

### Revalidation

```typescript
import { revalidateTag, revalidatePath } from 'next/cache'

// After product update
revalidateTag('products')
revalidatePath('/products')
revalidatePath(`/products/${slug}`)
```

## Image Optimization

### Sharp Configuration

```bash
npm install sharp
```

### Responsive Images

```tsx
import Image from 'next/image'

export function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      className="object-cover"
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    />
  )
}
```

### Image Upload Optimization

```typescript
import sharp from 'sharp'

export async function optimizeImage(buffer: Buffer) {
  return sharp(buffer)
    .resize(1200, 1200, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer()
}
```

## Bundle Optimization

### Analyze Bundle

```bash
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)

# Run
ANALYZE=true npm run build
```

### Dynamic Imports

```typescript
import dynamic from 'next/dynamic'

const ProductReviews = dynamic(() => import('./product-reviews'), {
  loading: () => <Skeleton className="h-48" />,
})

const RichTextEditor = dynamic(() => import('./rich-text-editor'), {
  ssr: false,
})
```

## Monitoring

### Sentry Integration

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Vercel Analytics

```bash
npm install @vercel/analytics @vercel/speed-insights
```

```tsx
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

## Performance Checklist

- [ ] Enable gzip/brotli compression
- [ ] Optimize images (WebP/AVIF)
- [ ] Implement caching headers
- [ ] Use CDN for static assets
- [ ] Database connection pooling
- [ ] Add database indexes
- [ ] Lazy load below-fold content
- [ ] Minimize JavaScript bundle
- [ ] Enable HTTP/2
- [ ] Monitor Core Web Vitals
