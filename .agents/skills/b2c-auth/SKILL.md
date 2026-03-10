---
name: b2c-auth
description: Setup NextAuth.js v5 authentication for B2C e-commerce with credentials login, admin protection, and session management. Use after b2c-database when users need login, registration, or authentication features.
---

# B2C Authentication Setup

Setup NextAuth.js v5 with credentials provider, admin middleware, and auth components.

## Prerequisites

- Project initialized with `/b2c-init`
- Database schema created with `/b2c-database`

## Features

- Email/Password login
- User registration
- Session management
- Admin route protection
- Role-based access control

## Execution Steps

### Step 1: Generate Auth Secret

```bash
npx auth secret
```

Or add to `.env`:
```env
AUTH_SECRET="your-secret-key-here"
```

### Step 2: Create Auth Configuration

Create `src/lib/auth.ts` from `references/auth-config.md`

### Step 3: Create Auth Route Handler

Create `src/app/api/auth/[...nextauth]/route.ts` from `references/auth-config.md`

### Step 4: Create Auth Middleware

Create `middleware.ts` in project root from `references/middleware.md`

### Step 5: Create Server Actions

Create `src/actions/auth.ts` from `references/auth-actions.md`

### Step 6: Create Login Page

Create `src/app/(auth)/login/page.tsx` from `references/auth-pages.md`

### Step 7: Create Register Page

Create `src/app/(auth)/register/page.tsx` from `references/auth-pages.md`

### Step 8: Create Auth Layout

Create `src/app/(auth)/layout.tsx` from `references/auth-pages.md`

### Step 9: Update Store Header

Update `src/components/store/header.tsx` to include login/logout buttons

### Step 10: Update Admin Layout

Update `src/app/admin/layout.tsx` to check admin role

### Step 11: Install bcryptjs

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

### Step 12: Verify Authentication

```bash
npm run dev
```

Test:
- Visit `/login` - Should show login form
- Visit `/register` - Should show registration form
- Visit `/admin` - Should redirect to login if not authenticated
- Login as admin - Should access admin dashboard

## Reference Files

- **Auth config**: See `references/auth-config.md` for NextAuth setup
- **Middleware**: See `references/middleware.md` for route protection
- **Server actions**: See `references/auth-actions.md` for login/register actions
- **Auth pages**: See `references/auth-pages.md` for login/register UI

## Test Accounts (after seeding)

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | ADMIN |
| customer@example.com | customer123 | CUSTOMER |

## Next Skills

After completion, continue with:
1. `/b2c-product` - Product management
