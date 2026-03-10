---
name: b2c-deploy
description: Deploy B2C e-commerce project to production with Vercel, Railway, or VPS. Configure environment variables, database, and CI/CD. Use when users need to deploy their B2C shop to production or configure deployment settings.
---

# B2C Deployment Guide

Deploy your B2C e-commerce project to production environments.

## Prerequisites

- Complete B2C project with all skills applied
- PostgreSQL database (production)
- Domain name (optional but recommended)

## Deployment Options

| Platform | Best For | Database | Cost |
|----------|----------|----------|------|
| Vercel + Neon | Easiest setup | Neon PostgreSQL | Free tier available |
| Vercel + Railway | More control | Railway PostgreSQL | $5/month+ |
| VPS (Ubuntu) | Full control | Self-hosted PostgreSQL | $5-20/month |
| Docker | Containerized | Any PostgreSQL | Varies |

## Execution Steps

### Option A: Vercel + Neon (Recommended)

See `references/vercel-neon.md`

### Option B: Vercel + Railway

See `references/vercel-railway.md`

### Option C: VPS Deployment

See `references/vps-deploy.md`

### Option D: Docker Deployment

See `references/docker-deploy.md`

## Common Steps for All Deployments

### Step 1: Environment Variables

Create production `.env` with:
```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="https://yourdomain.com"

# Upload (if using cloud storage)
UPLOAD_URL="https://your-cdn.com/uploads"
```

### Step 2: Database Migration

```bash
npx prisma migrate deploy
```

### Step 3: Build Optimization

Update `next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-cdn.com',
      },
    ],
  },
  // Enable static exports if needed
  // output: 'standalone',
}

module.exports = nextConfig
```

### Step 4: Seed Production Data (Optional)

```bash
npx prisma db seed
```

## Post-Deployment Checklist

- [ ] Database connected and migrated
- [ ] Environment variables configured
- [ ] AUTH_SECRET generated securely
- [ ] Admin user created
- [ ] Image uploads working
- [ ] SSL certificate active
- [ ] Domain configured
- [ ] Error monitoring setup (Sentry)
- [ ] Analytics configured

## Reference Files

- **Vercel + Neon**: See `references/vercel-neon.md`
- **Vercel + Railway**: See `references/vercel-railway.md`
- **VPS deployment**: See `references/vps-deploy.md`
- **Docker deployment**: See `references/docker-deploy.md`
- **CI/CD setup**: See `references/cicd.md`
- **Performance optimization**: See `references/performance.md`
