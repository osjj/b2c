---
name: b2c-database
description: Create Prisma database schema for B2C e-commerce with products, categories, users, orders, and cart. Use after b2c-init when users need database setup, schema design, or data models for their e-commerce project.
---

# B2C Database Schema Setup

Create complete Prisma schema with all e-commerce data models.

## Prerequisites

- Project initialized with `/b2c-init`
- PostgreSQL database available

## Data Models

| Model          | Description      |
|----------------|------------------|
| User           | Users/Customers  |
| Account        | OAuth accounts   |
| Session        | User sessions    |
| Category       | Product categories |
| Product        | Products         |
| ProductImage   | Product images   |
| ProductVariant | SKU variants     |
| Cart           | Shopping carts   |
| CartItem       | Cart items       |
| Order          | Orders           |
| OrderItem      | Order line items |
| Address        | Shipping address |
| Setting        | System settings  |

## Execution Steps

### Step 1: Initialize Prisma

```bash
cd {project-directory}
npx prisma init
```

### Step 2: Configure Database URL

Update `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/b2c_shop?schema=public"
```

### Step 3: Create Prisma Schema

Create `prisma/schema.prisma` from `references/schema.prisma.md`

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

### Step 5: Push Schema to Database

```bash
npx prisma db push
```

### Step 6: Create Seed Script (Optional)

Create `prisma/seed.ts` from `references/seed.md`

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

Install tsx:
```bash
npm install -D tsx
```

Run seed:
```bash
npx prisma db seed
```

### Step 7: Verify with Prisma Studio

```bash
npx prisma studio
```

## Reference Files

- **Schema**: See `references/schema.prisma.md` for complete Prisma schema
- **Seed data**: See `references/seed.md` for sample data script

## Next Skills

After completion, continue with:
1. `/b2c-auth` - Authentication setup
