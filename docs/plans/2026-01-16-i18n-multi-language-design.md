# 多语言(i18n)功能设计

## 概述

为 B2C/B2B 电商项目添加多语言支持，覆盖 UI 文案和动态内容（产品、分类等）。

## 需求决策

| 项目 | 决定 |
|------|------|
| 支持语言 | 中文(zh)、英文(en)、阿拉伯文(ar) |
| URL 结构 | 路径前缀 `/zh/`, `/en/`, `/ar/` |
| 根路径行为 | 自动检测浏览器语言并重定向 |
| 默认/回退语言 | 英文(en) |
| 翻译范围 | UI 文案 + 产品/分类/集合/属性等动态内容 |
| 数据存储 | 独立翻译表 |
| 管理界面 | 同一表单内语言标签切换 |
| RTL 支持 | 阿拉伯文从右到左布局 |

## 技术选型

使用 **next-intl** 库：
- 专为 Next.js App Router 设计
- 支持服务端和客户端组件
- 内置 middleware 处理语言检测和路由
- 类型安全，TypeScript 支持完善

## 目录结构

```
src/
├── app/
│   └── [locale]/              # 所有页面移入此动态路由
│       ├── (store)/
│       ├── (auth)/
│       ├── admin/
│       └── layout.tsx
├── i18n/
│   ├── request.ts             # next-intl 配置
│   ├── routing.ts             # 路由配置
│   └── messages/              # UI 翻译文件
│       ├── en.json
│       ├── zh.json
│       └── ar.json
└── middleware.ts              # 语言检测和重定向
```

## 数据模型

### 新增翻译表

```prisma
// 产品翻译
model ProductTranslation {
  id          String   @id @default(cuid())
  productId   String
  locale      String   // "en", "zh", "ar"
  name        String
  description String?

  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, locale])
  @@index([productId])
  @@index([locale])
  @@map("product_translations")
}

// 分类翻译
model CategoryTranslation {
  id          String   @id @default(cuid())
  categoryId  String
  locale      String
  name        String
  description String?

  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, locale])
  @@map("category_translations")
}

// 集合翻译
model CollectionTranslation {
  id           String     @id @default(cuid())
  collectionId String
  locale       String
  name         String
  description  String?

  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  @@unique([collectionId, locale])
  @@map("collection_translations")
}

// 产品属性翻译
model AttributeTranslation {
  id          String    @id @default(cuid())
  attributeId String
  locale      String
  name        String

  attribute   Attribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)

  @@unique([attributeId, locale])
  @@map("attribute_translations")
}
```

### 原表处理

- `Product.name`, `Product.description` 保留作为英文默认值
- 查询时：优先取翻译表对应语言 → 回退到主表英文

## 查询与回退逻辑

```typescript
// src/lib/i18n-helpers.ts

export async function getProductWithTranslation(
  slug: string,
  locale: string
) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      translations: {
        where: { locale },
        take: 1,
      },
      category: {
        include: {
          translations: { where: { locale }, take: 1 },
        },
      },
      images: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!product) return null

  // 应用翻译，回退到默认值（英文）
  const translation = product.translations[0]
  return {
    ...product,
    name: translation?.name || product.name,
    description: translation?.description || product.description,
    category: product.category ? {
      ...product.category,
      name: product.category.translations[0]?.name || product.category.name,
    } : null,
  }
}
```

## UI 翻译文件

```json
// src/i18n/messages/en.json
{
  "common": {
    "home": "Home",
    "products": "Products",
    "categories": "Categories",
    "cart": "Cart",
    "quote": "Quote",
    "search": "Search",
    "language": "Language"
  },
  "product": {
    "addToCart": "Add to Cart",
    "addToQuote": "Add to Quote",
    "outOfStock": "Out of Stock",
    "inStock": "In Stock ({count} available)",
    "quantity": "Quantity",
    "price": "Price",
    "description": "Description"
  },
  "checkout": {
    "title": "Checkout",
    "shipping": "Shipping Address",
    "payment": "Payment",
    "placeOrder": "Place Order"
  },
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout",
    "email": "Email",
    "password": "Password"
  }
}
```

## 组件使用方式

```typescript
// 服务端组件
import { getTranslations } from 'next-intl/server'

export default async function ProductCard() {
  const t = await getTranslations('product')
  return <Button>{t('addToCart')}</Button>
}

// 客户端组件
'use client'
import { useTranslations } from 'next-intl'

export function AddToCartButton() {
  const t = useTranslations('product')
  return <Button>{t('addToCart')}</Button>
}
```

## RTL 支持

```typescript
// src/app/[locale]/layout.tsx
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir}>
      <body className={dir === 'rtl' ? 'rtl' : 'ltr'}>
        {children}
      </body>
    </html>
  )
}
```

## Middleware 配置

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['en', 'zh', 'ar'],
  defaultLocale: 'en',
  localeDetection: true,
  localePrefix: 'always',
})

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing)
```

**语言检测优先级：**
1. URL 路径中的语言前缀
2. Cookie 中保存的语言偏好
3. Accept-Language 请求头
4. 回退到默认语言（英文）

## 管理后台翻译界面

产品编辑页使用语言标签切换：

```
┌─────────────────────────────────────────────────────────────┐
│  Edit Product                                                │
├─────────────────────────────────────────────────────────────┤
│  [English] [中文] [العربية]                                  │
├─────────────────────────────────────────────────────────────┤
│  Name *                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Wireless Bluetooth Headphones                           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Description                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ High-quality wireless headphones with noise...          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ⚠️ 价格、库存、图片等非文字内容所有语言共享                  │
└─────────────────────────────────────────────────────────────┘
```

**交互逻辑：**
- 默认显示英文标签
- 切换标签时显示对应语言翻译
- 未翻译字段显示占位提示
- 保存时一次性提交所有语言
- 标签旁显示翻译状态指示器

## 语言切换器

```typescript
// src/components/store/language-switcher.tsx
const locales = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
]
```

## SEO 优化

每个页面自动生成 hreflang 标签：

```html
<link rel="alternate" hrefLang="en" href="https://shop.com/en/products" />
<link rel="alternate" hrefLang="zh" href="https://shop.com/zh/products" />
<link rel="alternate" hrefLang="ar" href="https://shop.com/ar/products" />
<link rel="alternate" hrefLang="x-default" href="https://shop.com/en/products" />
```

## 实现范围

| 类别 | 内容 |
|------|------|
| 数据库 | 新增 4 个翻译表 |
| 路由 | 所有页面移入 `[locale]` 动态路由 |
| Middleware | 集成 next-intl 语言检测 |
| Server Actions | 查询函数增加 locale 参数 |
| 管理后台 | 表单增加翻译标签 |
| 前端组件 | 硬编码文字替换为 t() |
| 布局 | RTL 支持 |

## 不在本次范围

- 邮件模板多语言（后续迭代）
- 订单历史翻译（保持原语言）
- 管理后台界面多语言（保持中/英文）

## 验收标准

- [ ] 访问根路径自动重定向到检测语言
- [ ] 所有页面支持 `/en/`, `/zh/`, `/ar/` 路径
- [ ] 语言切换器正常工作
- [ ] 产品/分类等动态内容正确显示翻译
- [ ] 翻译缺失时回退到英文
- [ ] 阿拉伯文页面正确显示 RTL 布局
- [ ] 管理后台可编辑所有语言翻译
- [ ] SEO hreflang 标签正确生成
