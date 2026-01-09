# Prisma Schema

## prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== Auth Models ====================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  password      String?
  image         String?
  phone         String?
  role          Role      @default(CUSTOMER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts  Account[]
  sessions  Session[]
  cart      Cart?
  orders    Order[]
  addresses Address[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

enum Role {
  CUSTOMER
  ADMIN
}

// ==================== Product Models ====================

model Category {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  description String?
  image       String?
  parentId    String?
  sortOrder   Int        @default(0)
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  products Product[]

  @@map("categories")
}

model Product {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?  @db.Text
  price       Decimal  @db.Decimal(10, 2)
  comparePrice Decimal? @db.Decimal(10, 2)
  cost        Decimal? @db.Decimal(10, 2)
  sku         String?  @unique
  barcode     String?
  stock       Int      @default(0)
  lowStock    Int      @default(5)
  weight      Decimal? @db.Decimal(10, 2)
  categoryId  String?
  isActive    Boolean  @default(true)
  isFeatured  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category   Category?        @relation(fields: [categoryId], references: [id])
  images     ProductImage[]
  variants   ProductVariant[]
  cartItems  CartItem[]
  orderItems OrderItem[]

  @@index([categoryId])
  @@index([isActive, isFeatured])
  @@map("products")
}

model ProductImage {
  id        String   @id @default(cuid())
  productId String
  url       String
  alt       String?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_images")
}

model ProductVariant {
  id        String   @id @default(cuid())
  productId String
  name      String
  sku       String   @unique
  price     Decimal  @db.Decimal(10, 2)
  stock     Int      @default(0)
  options   Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  cartItems  CartItem[]
  orderItems OrderItem[]

  @@map("product_variants")
}

// ==================== Cart Models ====================

model Cart {
  id        String   @id @default(cuid())
  userId    String?  @unique
  sessionId String?  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  items CartItem[]

  @@map("carts")
}

model CartItem {
  id        String   @id @default(cuid())
  cartId    String
  productId String
  variantId String?
  quantity  Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cart    Cart            @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  variant ProductVariant? @relation(fields: [variantId], references: [id])

  @@unique([cartId, productId, variantId])
  @@map("cart_items")
}

// ==================== Order Models ====================

model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique
  userId          String?
  email           String
  phone           String?
  status          OrderStatus @default(PENDING)
  paymentStatus   PaymentStatus @default(PENDING)
  paymentMethod   String?
  subtotal        Decimal     @db.Decimal(10, 2)
  shippingFee     Decimal     @default(0) @db.Decimal(10, 2)
  discount        Decimal     @default(0) @db.Decimal(10, 2)
  total           Decimal     @db.Decimal(10, 2)
  note            String?
  shippingAddress Json?
  billingAddress  Json?
  paidAt          DateTime?
  shippedAt       DateTime?
  deliveredAt     DateTime?
  cancelledAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  user  User?       @relation(fields: [userId], references: [id])
  items OrderItem[]

  @@index([userId])
  @@index([status])
  @@index([orderNumber])
  @@map("orders")
}

model OrderItem {
  id         String  @id @default(cuid())
  orderId    String
  productId  String
  variantId  String?
  name       String
  sku        String?
  price      Decimal @db.Decimal(10, 2)
  quantity   Int
  total      Decimal @db.Decimal(10, 2)

  order   Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product         @relation(fields: [productId], references: [id])
  variant ProductVariant? @relation(fields: [variantId], references: [id])

  @@map("order_items")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

// ==================== Address Model ====================

model Address {
  id         String  @id @default(cuid())
  userId     String
  name       String
  phone      String
  province   String
  city       String
  district   String
  street     String
  zipCode    String?
  isDefault  Boolean @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("addresses")
}

// ==================== Settings Model ====================

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("settings")
}
```

## Key Features

1. **Auth Models**: NextAuth.js compatible with User, Account, Session
2. **Category Tree**: Self-referencing for nested categories
3. **Product Variants**: Support for SKU variations (size, color)
4. **Cart**: Supports both logged-in users and guest sessions
5. **Order**: Complete order lifecycle with status tracking
6. **Address**: Multiple shipping addresses per user
