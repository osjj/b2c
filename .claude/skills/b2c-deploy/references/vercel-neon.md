# Vercel + Neon Deployment

## Overview

Easiest deployment option with serverless PostgreSQL.

## Step 1: Create Neon Database

1. Go to [neon.tech](https://neon.tech)
2. Create account and new project
3. Copy connection string:
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

## Step 2: Prepare Project

### Update package.json

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build"
  }
}
```

### Update prisma/schema.prisma

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Step 3: Deploy to Vercel

### Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add AUTH_SECRET
vercel env add AUTH_URL
```

### Via Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import Git repository
3. Add environment variables:

```env
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
DIRECT_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
AUTH_SECRET=your-secret-key
AUTH_URL=https://your-app.vercel.app
```

4. Deploy

## Step 4: Run Database Migration

After first deployment:

```bash
# Local with production database
DATABASE_URL="your-neon-url" npx prisma migrate deploy

# Or use Vercel CLI
vercel env pull .env.production.local
npx prisma migrate deploy
```

## Step 5: Seed Database (Optional)

```bash
DATABASE_URL="your-neon-url" npx prisma db seed
```

## Step 6: Configure Domain

1. In Vercel dashboard, go to Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `AUTH_URL` environment variable

## File Upload Configuration

For production, use cloud storage instead of local uploads:

### Option A: Vercel Blob

```bash
npm install @vercel/blob
```

```typescript
// src/app/api/upload/route.ts
import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  const blob = await put(file.name, file, {
    access: 'public',
  })

  return NextResponse.json({ url: blob.url })
}
```

Add to Vercel:
```env
BLOB_READ_WRITE_TOKEN=your-token
```

### Option B: Cloudflare R2

```bash
npm install @aws-sdk/client-s3
```

```typescript
// src/lib/r2.ts
import { S3Client } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
```

## Vercel Configuration

### vercel.json (Optional)

```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "regions": ["hnd1"],
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Troubleshooting

### Prisma Client Error

If you see "PrismaClient is not defined":

```bash
# Regenerate Prisma Client
npx prisma generate

# Redeploy
vercel --prod
```

### Database Connection Issues

1. Check connection string format
2. Ensure `?sslmode=require` is included
3. Check Neon dashboard for connection limits

### Build Timeout

Increase build timeout in Vercel settings or optimize:

```js
// next.config.js
module.exports = {
  experimental: {
    outputFileTracingExcludes: {
      '*': ['node_modules/@swc/core-*'],
    },
  },
}
```
