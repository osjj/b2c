---
name: b2c-init
description: Initialize a Next.js B2C e-commerce project with shadcn/ui, Prisma, and NextAuth. Use when users want to create a new B2C online shop, e-commerce website, or online store from scratch. Triggers on requests like "create a B2C project", "build an e-commerce site", "initialize online shop", or "start a new store project".
---

# B2C E-commerce Project Initialization

Create a complete Next.js B2C e-commerce project with store frontend and admin dashboard.

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- shadcn/ui + Tailwind CSS
- Prisma ORM (PostgreSQL)
- NextAuth.js v5
- Zustand (cart state)
- React Hook Form + Zod

## Project Structure

```
{project-name}/
├── src/
│   ├── app/
│   │   ├── (store)/          # Store frontend (/)
│   │   ├── admin/            # Admin panel (/admin)
│   │   ├── api/              # API routes
│   │   └── (auth)/           # Auth pages
│   ├── components/
│   │   ├── ui/               # shadcn/ui
│   │   ├── store/            # Store components
│   │   └── admin/            # Admin components
│   ├── lib/
│   ├── actions/
│   ├── hooks/
│   ├── stores/
│   └── types/
├── prisma/
└── public/uploads/
```

## Execution Steps

### Step 1: Gather Information

Ask user for:
1. Project name (e.g., `my-shop`)
2. Project directory (e.g., `D:/projects`)

### Step 2: Create Next.js Project

```bash
npx create-next-app@latest {project-name} --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### Step 3: Install Dependencies

```bash
cd {project-name}

# Core
npm install @prisma/client next-auth@beta zustand zod react-hook-form @hookform/resolvers lucide-react

# Dev
npm install -D prisma

# shadcn/ui
npx shadcn@latest init -d
npx shadcn@latest add button input label card table dialog dropdown-menu avatar badge separator sheet tabs form toast sonner
```

### Step 4: Create Directory Structure

```bash
mkdir -p src/app/(store)
mkdir -p src/app/admin
mkdir -p src/app/api/auth
mkdir -p src/app/(auth)/login
mkdir -p src/app/(auth)/register
mkdir -p src/components/store
mkdir -p src/components/admin
mkdir -p src/lib
mkdir -p src/actions
mkdir -p src/hooks
mkdir -p src/stores
mkdir -p src/types
mkdir -p prisma
mkdir -p public/uploads
```

### Step 5: Create Core Files

Create files from `references/core-files.md`:
- `src/lib/prisma.ts` - Prisma client singleton
- `src/lib/utils.ts` - Utility functions
- `src/types/index.ts` - TypeScript types
- `src/stores/cart.ts` - Zustand cart store
- `.env.example` - Environment template

### Step 6: Create Store Layout and Components

Create files from `references/store-components.md`:
- `src/app/(store)/layout.tsx`
- `src/app/(store)/page.tsx`
- `src/components/store/header.tsx`
- `src/components/store/footer.tsx`

### Step 7: Create Admin Layout and Components

Create files from `references/admin-components.md`:
- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/components/admin/sidebar.tsx`
- `src/components/admin/header.tsx`

### Step 8: Update package.json Scripts

Add to scripts:
```json
{
  "db:push": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:studio": "prisma studio",
  "db:seed": "prisma db seed"
}
```

### Step 9: Verify Installation

```bash
npm run dev
```

Visit:
- `http://localhost:3000` - Store homepage
- `http://localhost:3000/admin` - Admin dashboard

## Reference Files

- **Core files**: See `references/core-files.md` for lib, types, and stores code
- **Store components**: See `references/store-components.md` for store layout and components
- **Admin components**: See `references/admin-components.md` for admin layout and components

## Next Skills

After completion, suggest these skills in order:
1. `/b2c-database` - Prisma schema and migrations
2. `/b2c-auth` - Authentication with NextAuth
3. `/b2c-product` - Product and category management
4. `/b2c-cart` - Shopping cart functionality
5. `/b2c-checkout` - Checkout and order creation
6. `/b2c-order` - Order management
