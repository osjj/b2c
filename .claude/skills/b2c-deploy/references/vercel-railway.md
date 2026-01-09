# Vercel + Railway Deployment

## Overview

Vercel for Next.js hosting + Railway for PostgreSQL database.

## Step 1: Create Railway Database

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL service
4. Copy connection string from Variables tab:
   ```
   postgresql://postgres:password@hostname:port/railway
   ```

## Step 2: Configure Railway

### Set Database Variables

In Railway PostgreSQL settings:
- Enable public networking if needed
- Note the internal and external URLs

### Connection Pooling (Recommended)

Railway supports connection pooling via PgBouncer:
```
postgresql://postgres:password@hostname:port/railway?pgbouncer=true
```

## Step 3: Prepare Project

### Update prisma/schema.prisma

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Update package.json

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build"
  }
}
```

## Step 4: Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:

```env
DATABASE_URL=postgresql://postgres:password@hostname:port/railway
AUTH_SECRET=your-secret-key
AUTH_URL=https://your-app.vercel.app
```

4. Deploy

## Step 5: Run Migrations

```bash
# Pull production env
vercel env pull .env.production.local

# Run migration
npx prisma migrate deploy

# Seed if needed
npx prisma db seed
```

## Step 6: Configure Domain

Same as Vercel + Neon setup.

## Railway Web Service (Alternative)

You can also deploy Next.js directly to Railway:

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Procfile

```
web: npm run start
release: npx prisma migrate deploy
```

### Environment Variables on Railway

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_SECRET=your-secret
AUTH_URL=https://your-app.up.railway.app
PORT=3000
```

## Advantages of Railway

- Simple PostgreSQL setup
- Automatic SSL
- Connection pooling support
- Easy scaling
- Built-in monitoring

## Cost Estimation

| Resource | Free Tier | Paid |
|----------|-----------|------|
| Railway PostgreSQL | 500MB | $5/GB |
| Railway Compute | $5 credit/month | $0.01/hr |
| Vercel | 100GB bandwidth | $20/month |
