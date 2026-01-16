# 多语言(i18n)功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 B2C/B2B 电商项目添加完整的多语言支持，包括 UI 文案、动态内容翻译和 RTL 布局。

**Architecture:** 使用 next-intl 处理 UI 翻译和路由，独立翻译表存储动态内容，所有页面移入 `[locale]` 动态路由，middleware 处理语言检测和重定向。

**Tech Stack:** next-intl, Prisma, tailwindcss-rtl, Next.js App Router

---

## Task 1: 安装依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装 next-intl 和 RTL 支持**

Run:
```bash
npm install next-intl tailwindcss-rtl
```

Expected: 依赖安装成功

**Step 2: 验证安装**

Run:
```bash
npm ls next-intl
```

Expected: 显示 next-intl 版本

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add next-intl and tailwindcss-rtl dependencies"
```

---

## Task 2: 数据库模型 - 添加翻译表

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: 添加 ProductTranslation 模型**

在 `prisma/schema.prisma` 中添加：

```prisma
model ProductTranslation {
  id          String   @id @default(cuid())
  productId   String
  locale      String
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, locale])
  @@index([productId])
  @@index([locale])
  @@map("product_translations")
}
```

**Step 2: 添加 CategoryTranslation 模型**

```prisma
model CategoryTranslation {
  id          String   @id @default(cuid())
  categoryId  String
  locale      String
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category    Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, locale])
  @@index([categoryId])
  @@map("category_translations")
}
```

**Step 3: 添加 CollectionTranslation 模型**

```prisma
model CollectionTranslation {
  id           String     @id @default(cuid())
  collectionId String
  locale       String
  name         String
  description  String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  @@unique([collectionId, locale])
  @@index([collectionId])
  @@map("collection_translations")
}
```

**Step 4: 添加 AttributeTranslation 模型**

```prisma
model AttributeTranslation {
  id          String    @id @default(cuid())
  attributeId String
  locale      String
  name        String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  attribute   Attribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)

  @@unique([attributeId, locale])
  @@index([attributeId])
  @@map("attribute_translations")
}
```

**Step 5: 添加 AttributeOptionTranslation 模型**

```prisma
model AttributeOptionTranslation {
  id        String          @id @default(cuid())
  optionId  String
  locale    String
  value     String
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  option    AttributeOption @relation(fields: [optionId], references: [id], onDelete: Cascade)

  @@unique([optionId, locale])
  @@index([optionId])
  @@map("attribute_option_translations")
}
```

**Step 6: 在现有模型中添加 translations 关系**

在 Product 模型添加：
```prisma
translations ProductTranslation[]
```

在 Category 模型添加：
```prisma
translations CategoryTranslation[]
```

在 Collection 模型添加：
```prisma
translations CollectionTranslation[]
```

在 Attribute 模型添加：
```prisma
translations AttributeTranslation[]
```

在 AttributeOption 模型添加：
```prisma
translations AttributeOptionTranslation[]
```

**Step 7: 推送数据库变更**

Run:
```bash
npx prisma db push
```

Expected: 数据库同步成功

**Step 8: 生成 Prisma Client**

Run:
```bash
npx prisma generate
```

Expected: Client 生成成功

**Step 9: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add translation models for i18n support"
```

---

## Task 3: i18n 配置文件

**Files:**
- Create: `src/i18n/routing.ts`
- Create: `src/i18n/request.ts`
- Create: `src/i18n/config.ts`

**Step 1: 创建 i18n 配置常量**

```typescript
// src/i18n/config.ts
export const locales = ['en', 'zh', 'ar'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ar: 'العربية',
}

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  zh: '🇨🇳',
  ar: '🇸🇦',
}

export const rtlLocales: Locale[] = ['ar']

export function isRtlLocale(locale: string): boolean {
  return rtlLocales.includes(locale as Locale)
}
```

**Step 2: 创建路由配置**

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'
import { locales, defaultLocale } from './config'

export const routing = defineRouting({
  locales,
  defaultLocale,
  localeDetection: true,
  localePrefix: 'always',
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
```

**Step 3: 创建 request 配置**

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
```

**Step 4: Commit**

```bash
git add src/i18n/
git commit -m "feat(i18n): add routing and request configuration"
```

---

## Task 4: UI 翻译文件

**Files:**
- Create: `src/i18n/messages/en.json`
- Create: `src/i18n/messages/zh.json`
- Create: `src/i18n/messages/ar.json`

**Step 1: 创建英文翻译文件**

```json
// src/i18n/messages/en.json
{
  "common": {
    "home": "Home",
    "products": "Products",
    "categories": "Categories",
    "collections": "Collections",
    "cart": "Cart",
    "quote": "Quote",
    "search": "Search",
    "searchPlaceholder": "Search products...",
    "language": "Language",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "view": "View",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "submit": "Submit",
    "close": "Close",
    "all": "All",
    "noResults": "No results found",
    "viewAll": "View All"
  },
  "nav": {
    "home": "Home",
    "products": "Products",
    "categories": "Categories",
    "about": "About",
    "contact": "Contact",
    "account": "Account",
    "orders": "Orders",
    "logout": "Logout"
  },
  "product": {
    "addToCart": "Add to Cart",
    "addToQuote": "Add to Quote",
    "addedToCart": "Added to cart",
    "addedToQuote": "Added to quote",
    "outOfStock": "Out of Stock",
    "inStock": "In Stock",
    "available": "{count} available",
    "lowStock": "Only {count} left",
    "quantity": "Quantity",
    "price": "Price",
    "unitPrice": "Unit Price",
    "subtotal": "Subtotal",
    "description": "Description",
    "specifications": "Specifications",
    "details": "Product Details",
    "relatedProducts": "Related Products",
    "featured": "Featured",
    "new": "New",
    "sale": "Sale",
    "off": "{percent}% OFF",
    "from": "From",
    "sku": "SKU",
    "category": "Category",
    "uncategorized": "Uncategorized"
  },
  "cart": {
    "title": "Shopping Cart",
    "empty": "Your cart is empty",
    "continueShopping": "Continue Shopping",
    "checkout": "Checkout",
    "remove": "Remove",
    "update": "Update",
    "total": "Total",
    "items": "{count} items"
  },
  "quote": {
    "title": "Quote Request",
    "list": "Quote List",
    "empty": "Your quote list is empty",
    "requestQuote": "Request Quote",
    "submitQuote": "Submit Quote",
    "submitted": "Quote Submitted",
    "quoteNumber": "Quote Number",
    "expectedPrice": "Expected Price",
    "expectedPriceHint": "Providing an expected price helps us offer you a better quote",
    "items": "{count} items",
    "contact": "Contact Information",
    "remark": "Remarks",
    "uploadFile": "Upload File",
    "thankYou": "Thank you for your inquiry. We will contact you shortly."
  },
  "checkout": {
    "title": "Checkout",
    "shipping": "Shipping Address",
    "payment": "Payment",
    "review": "Review Order",
    "placeOrder": "Place Order",
    "orderPlaced": "Order Placed",
    "orderNumber": "Order Number",
    "thankYou": "Thank you for your order!"
  },
  "auth": {
    "login": "Login",
    "register": "Register",
    "logout": "Logout",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "name": "Name",
    "phone": "Phone",
    "company": "Company",
    "forgotPassword": "Forgot Password?",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "loginSuccess": "Login successful",
    "registerSuccess": "Registration successful"
  },
  "account": {
    "title": "My Account",
    "profile": "Profile",
    "orders": "My Orders",
    "addresses": "Addresses",
    "settings": "Settings"
  },
  "order": {
    "title": "Order",
    "orders": "Orders",
    "orderDetails": "Order Details",
    "status": "Status",
    "date": "Date",
    "total": "Total",
    "pending": "Pending",
    "processing": "Processing",
    "shipped": "Shipped",
    "delivered": "Delivered",
    "cancelled": "Cancelled",
    "noOrders": "No orders yet"
  },
  "footer": {
    "about": "About Us",
    "contact": "Contact",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service",
    "copyright": "© {year} All rights reserved."
  },
  "tier": {
    "bulkPricing": "Bulk Pricing",
    "quantity": "Quantity",
    "unitPrice": "Unit Price",
    "savings": "Savings",
    "recommended": "Recommended",
    "currentPrice": "Current Price",
    "addMore": "Add {count} more to get {price}/unit ({percent}% off)"
  },
  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email",
    "minLength": "Minimum {count} characters",
    "maxLength": "Maximum {count} characters"
  }
}
```

**Step 2: 创建中文翻译文件**

```json
// src/i18n/messages/zh.json
{
  "common": {
    "home": "首页",
    "products": "产品",
    "categories": "分类",
    "collections": "系列",
    "cart": "购物车",
    "quote": "询价",
    "search": "搜索",
    "searchPlaceholder": "搜索产品...",
    "language": "语言",
    "loading": "加载中...",
    "error": "错误",
    "success": "成功",
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "view": "查看",
    "back": "返回",
    "next": "下一步",
    "previous": "上一步",
    "submit": "提交",
    "close": "关闭",
    "all": "全部",
    "noResults": "未找到结果",
    "viewAll": "查看全部"
  },
  "nav": {
    "home": "首页",
    "products": "产品",
    "categories": "分类",
    "about": "关于我们",
    "contact": "联系我们",
    "account": "账户",
    "orders": "订单",
    "logout": "退出登录"
  },
  "product": {
    "addToCart": "加入购物车",
    "addToQuote": "加入询价单",
    "addedToCart": "已加入购物车",
    "addedToQuote": "已加入询价单",
    "outOfStock": "缺货",
    "inStock": "有货",
    "available": "库存 {count} 件",
    "lowStock": "仅剩 {count} 件",
    "quantity": "数量",
    "price": "价格",
    "unitPrice": "单价",
    "subtotal": "小计",
    "description": "描述",
    "specifications": "规格参数",
    "details": "产品详情",
    "relatedProducts": "相关产品",
    "featured": "热门",
    "new": "新品",
    "sale": "促销",
    "off": "省 {percent}%",
    "from": "起",
    "sku": "SKU",
    "category": "分类",
    "uncategorized": "未分类"
  },
  "cart": {
    "title": "购物车",
    "empty": "购物车为空",
    "continueShopping": "继续购物",
    "checkout": "结算",
    "remove": "移除",
    "update": "更新",
    "total": "合计",
    "items": "{count} 件商品"
  },
  "quote": {
    "title": "询价单",
    "list": "询价列表",
    "empty": "询价单为空",
    "requestQuote": "提交询价",
    "submitQuote": "提交询价",
    "submitted": "询价已提交",
    "quoteNumber": "询价单号",
    "expectedPrice": "期望价格",
    "expectedPriceHint": "填写期望价格有助于我们为您提供更优惠的报价",
    "items": "{count} 件商品",
    "contact": "联系方式",
    "remark": "备注",
    "uploadFile": "上传文件",
    "thankYou": "感谢您的询价，我们将尽快与您联系。"
  },
  "checkout": {
    "title": "结算",
    "shipping": "收货地址",
    "payment": "支付方式",
    "review": "确认订单",
    "placeOrder": "提交订单",
    "orderPlaced": "订单已提交",
    "orderNumber": "订单号",
    "thankYou": "感谢您的订购！"
  },
  "auth": {
    "login": "登录",
    "register": "注册",
    "logout": "退出登录",
    "email": "邮箱",
    "password": "密码",
    "confirmPassword": "确认密码",
    "name": "姓名",
    "phone": "电话",
    "company": "公司",
    "forgotPassword": "忘记密码？",
    "noAccount": "没有账户？",
    "hasAccount": "已有账户？",
    "loginSuccess": "登录成功",
    "registerSuccess": "注册成功"
  },
  "account": {
    "title": "我的账户",
    "profile": "个人资料",
    "orders": "我的订单",
    "addresses": "收货地址",
    "settings": "设置"
  },
  "order": {
    "title": "订单",
    "orders": "订单列表",
    "orderDetails": "订单详情",
    "status": "状态",
    "date": "日期",
    "total": "合计",
    "pending": "待处理",
    "processing": "处理中",
    "shipped": "已发货",
    "delivered": "已送达",
    "cancelled": "已取消",
    "noOrders": "暂无订单"
  },
  "footer": {
    "about": "关于我们",
    "contact": "联系方式",
    "privacy": "隐私政策",
    "terms": "服务条款",
    "copyright": "© {year} 版权所有"
  },
  "tier": {
    "bulkPricing": "批量价格",
    "quantity": "数量",
    "unitPrice": "单价",
    "savings": "节省",
    "recommended": "推荐",
    "currentPrice": "当前单价",
    "addMore": "再加 {count} 件即可享受 {price}/件，节省 {percent}%"
  },
  "validation": {
    "required": "此字段为必填",
    "email": "请输入有效的邮箱地址",
    "minLength": "最少 {count} 个字符",
    "maxLength": "最多 {count} 个字符"
  }
}
```

**Step 3: 创建阿拉伯文翻译文件**

```json
// src/i18n/messages/ar.json
{
  "common": {
    "home": "الرئيسية",
    "products": "المنتجات",
    "categories": "الفئات",
    "collections": "المجموعات",
    "cart": "سلة التسوق",
    "quote": "طلب عرض سعر",
    "search": "بحث",
    "searchPlaceholder": "البحث عن منتجات...",
    "language": "اللغة",
    "loading": "جاري التحميل...",
    "error": "خطأ",
    "success": "نجاح",
    "save": "حفظ",
    "cancel": "إلغاء",
    "delete": "حذف",
    "edit": "تعديل",
    "view": "عرض",
    "back": "رجوع",
    "next": "التالي",
    "previous": "السابق",
    "submit": "إرسال",
    "close": "إغلاق",
    "all": "الكل",
    "noResults": "لا توجد نتائج",
    "viewAll": "عرض الكل"
  },
  "nav": {
    "home": "الرئيسية",
    "products": "المنتجات",
    "categories": "الفئات",
    "about": "من نحن",
    "contact": "اتصل بنا",
    "account": "الحساب",
    "orders": "الطلبات",
    "logout": "تسجيل الخروج"
  },
  "product": {
    "addToCart": "أضف إلى السلة",
    "addToQuote": "أضف إلى طلب العرض",
    "addedToCart": "تمت الإضافة إلى السلة",
    "addedToQuote": "تمت الإضافة إلى طلب العرض",
    "outOfStock": "غير متوفر",
    "inStock": "متوفر",
    "available": "{count} متوفر",
    "lowStock": "متبقي {count} فقط",
    "quantity": "الكمية",
    "price": "السعر",
    "unitPrice": "سعر الوحدة",
    "subtotal": "المجموع الفرعي",
    "description": "الوصف",
    "specifications": "المواصفات",
    "details": "تفاصيل المنتج",
    "relatedProducts": "منتجات ذات صلة",
    "featured": "مميز",
    "new": "جديد",
    "sale": "تخفيض",
    "off": "خصم {percent}%",
    "from": "من",
    "sku": "رمز المنتج",
    "category": "الفئة",
    "uncategorized": "غير مصنف"
  },
  "cart": {
    "title": "سلة التسوق",
    "empty": "سلة التسوق فارغة",
    "continueShopping": "متابعة التسوق",
    "checkout": "إتمام الشراء",
    "remove": "إزالة",
    "update": "تحديث",
    "total": "الإجمالي",
    "items": "{count} منتجات"
  },
  "quote": {
    "title": "طلب عرض سعر",
    "list": "قائمة طلبات الأسعار",
    "empty": "قائمة طلبات الأسعار فارغة",
    "requestQuote": "طلب عرض سعر",
    "submitQuote": "إرسال طلب العرض",
    "submitted": "تم إرسال طلب العرض",
    "quoteNumber": "رقم طلب العرض",
    "expectedPrice": "السعر المتوقع",
    "expectedPriceHint": "تحديد السعر المتوقع يساعدنا في تقديم عرض أفضل لك",
    "items": "{count} منتجات",
    "contact": "معلومات الاتصال",
    "remark": "ملاحظات",
    "uploadFile": "رفع ملف",
    "thankYou": "شكراً لاستفسارك. سنتواصل معك قريباً."
  },
  "checkout": {
    "title": "إتمام الشراء",
    "shipping": "عنوان الشحن",
    "payment": "الدفع",
    "review": "مراجعة الطلب",
    "placeOrder": "تأكيد الطلب",
    "orderPlaced": "تم تأكيد الطلب",
    "orderNumber": "رقم الطلب",
    "thankYou": "شكراً لطلبك!"
  },
  "auth": {
    "login": "تسجيل الدخول",
    "register": "إنشاء حساب",
    "logout": "تسجيل الخروج",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "confirmPassword": "تأكيد كلمة المرور",
    "name": "الاسم",
    "phone": "الهاتف",
    "company": "الشركة",
    "forgotPassword": "نسيت كلمة المرور؟",
    "noAccount": "ليس لديك حساب؟",
    "hasAccount": "لديك حساب بالفعل؟",
    "loginSuccess": "تم تسجيل الدخول بنجاح",
    "registerSuccess": "تم إنشاء الحساب بنجاح"
  },
  "account": {
    "title": "حسابي",
    "profile": "الملف الشخصي",
    "orders": "طلباتي",
    "addresses": "العناوين",
    "settings": "الإعدادات"
  },
  "order": {
    "title": "الطلب",
    "orders": "الطلبات",
    "orderDetails": "تفاصيل الطلب",
    "status": "الحالة",
    "date": "التاريخ",
    "total": "الإجمالي",
    "pending": "قيد الانتظار",
    "processing": "قيد المعالجة",
    "shipped": "تم الشحن",
    "delivered": "تم التوصيل",
    "cancelled": "ملغي",
    "noOrders": "لا توجد طلبات"
  },
  "footer": {
    "about": "من نحن",
    "contact": "اتصل بنا",
    "privacy": "سياسة الخصوصية",
    "terms": "شروط الخدمة",
    "copyright": "© {year} جميع الحقوق محفوظة."
  },
  "tier": {
    "bulkPricing": "أسعار الجملة",
    "quantity": "الكمية",
    "unitPrice": "سعر الوحدة",
    "savings": "التوفير",
    "recommended": "موصى به",
    "currentPrice": "السعر الحالي",
    "addMore": "أضف {count} أخرى للحصول على {price}/وحدة (خصم {percent}%)"
  },
  "validation": {
    "required": "هذا الحقل مطلوب",
    "email": "يرجى إدخال بريد إلكتروني صحيح",
    "minLength": "الحد الأدنى {count} أحرف",
    "maxLength": "الحد الأقصى {count} أحرف"
  }
}
```

**Step 4: Commit**

```bash
git add src/i18n/messages/
git commit -m "feat(i18n): add UI translation files for en, zh, ar"
```

---

## Task 5: 更新 Next.js 配置

**Files:**
- Modify: `next.config.ts`
- Create: `src/i18n.ts`

**Step 1: 更新 next.config.ts 添加 next-intl 插件**

```typescript
// next.config.ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // ... existing config
}

export default withNextIntl(nextConfig)
```

**Step 2: Commit**

```bash
git add next.config.ts
git commit -m "feat(i18n): configure next-intl plugin"
```

---

## Task 6: 更新 Middleware

**Files:**
- Modify: `src/middleware.ts`

**Step 1: 集成 next-intl middleware**

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next()
  }

  // Apply intl middleware first
  const intlResponse = intlMiddleware(request)

  // Extract locale from the response or pathname
  const localeMatch = pathname.match(/^\/(en|zh|ar)(\/|$)/)
  const locale = localeMatch?.[1] || routing.defaultLocale

  // Check auth for protected routes
  const protectedPatterns = [
    new RegExp(`^/${locale}/admin`),
    new RegExp(`^/${locale}/account`),
  ]
  const authPatterns = [
    new RegExp(`^/${locale}/login`),
    new RegExp(`^/${locale}/register`),
  ]

  const isProtectedRoute = protectedPatterns.some((p) => p.test(pathname))
  const isAuthRoute = authPatterns.some((p) => p.test(pathname))

  if (isProtectedRoute || isAuthRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    })

    if (isProtectedRoute && !token) {
      const loginUrl = new URL(`/${locale}/login`, request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (isAuthRoute && token) {
      return NextResponse.redirect(new URL(`/${locale}/`, request.url))
    }

    // Check admin access
    if (pathname.includes('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL(`/${locale}/`, request.url))
    }
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
```

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(i18n): integrate next-intl middleware with auth"
```

---

## Task 7: 重构路由结构 - 创建 [locale] 动态路由

**Files:**
- Create: `src/app/[locale]/layout.tsx`
- Create: `src/app/[locale]/page.tsx`
- Move all existing pages into `[locale]` folder

**Step 1: 创建 locale layout**

```typescript
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { isRtlLocale } from '@/i18n/config'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages()
  const dir = isRtlLocale(locale) ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir}>
      <body className={dir === 'rtl' ? 'rtl' : 'ltr'}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

**Step 2: 移动现有页面**

将 `src/app/(store)`, `src/app/(auth)`, `src/app/admin` 等文件夹移动到 `src/app/[locale]/` 下。

保留 `src/app/api` 和 `src/app/layout.tsx`（作为根 layout）。

**Step 3: 更新根 layout.tsx**

```typescript
// src/app/layout.tsx
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

**Step 4: Commit**

```bash
git add src/app/
git commit -m "feat(i18n): restructure routes with [locale] dynamic segment"
```

---

## Task 8: 创建 i18n 数据查询辅助函数

**Files:**
- Create: `src/lib/i18n-helpers.ts`

**Step 1: 创建翻译辅助函数**

```typescript
// src/lib/i18n-helpers.ts
import { prisma } from './prisma'
import { defaultLocale } from '@/i18n/config'

// Generic translation applier
export function applyTranslation<
  T extends { name: string; description?: string | null },
  U extends { name: string; description?: string | null }
>(entity: T, translation: U | undefined): T {
  if (!translation) return entity
  return {
    ...entity,
    name: translation.name || entity.name,
    description: translation.description ?? entity.description,
  }
}

// Get product with translation
export async function getProductWithTranslation(
  slug: string,
  locale: string
) {
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
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
      priceTiers: { orderBy: { sortOrder: 'asc' } },
      attributeValues: {
        include: {
          attribute: {
            include: {
              translations: { where: { locale }, take: 1 },
            },
          },
          option: {
            include: {
              translations: { where: { locale }, take: 1 },
            },
          },
        },
      },
    },
  })

  if (!product) return null

  const translation = product.translations[0]
  return {
    ...product,
    name: translation?.name || product.name,
    description: translation?.description || product.description,
    category: product.category
      ? applyTranslation(product.category, product.category.translations[0])
      : null,
    attributeValues: product.attributeValues.map((av) => ({
      ...av,
      attribute: applyTranslation(av.attribute, av.attribute.translations[0]),
      option: av.option
        ? {
            ...av.option,
            value: av.option.translations[0]?.value || av.option.value,
          }
        : null,
    })),
  }
}

// Get products with translations
export async function getProductsWithTranslation(
  locale: string,
  options: {
    categoryId?: string
    limit?: number
    offset?: number
    activeOnly?: boolean
    featured?: boolean
  } = {}
) {
  const { categoryId, limit = 20, offset = 0, activeOnly = true, featured } = options

  const where: any = {}
  if (activeOnly) where.isActive = true
  if (categoryId) where.categoryId = categoryId
  if (featured) where.isFeatured = true

  const products = await prisma.product.findMany({
    where,
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
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      priceTiers: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return products.map((product) => {
    const translation = product.translations[0]
    return {
      ...product,
      name: translation?.name || product.name,
      description: translation?.description || product.description,
      category: product.category
        ? applyTranslation(product.category, product.category.translations[0])
        : null,
    }
  })
}

// Get categories with translations
export async function getCategoriesWithTranslation(locale: string) {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      translations: {
        where: { locale },
        take: 1,
      },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return categories.map((category) =>
    applyTranslation(category, category.translations[0])
  )
}

// Get collections with translations
export async function getCollectionsWithTranslation(locale: string) {
  const collections = await prisma.collection.findMany({
    where: { isActive: true },
    include: {
      translations: {
        where: { locale },
        take: 1,
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return collections.map((collection) =>
    applyTranslation(collection, collection.translations[0])
  )
}
```

**Step 2: Commit**

```bash
git add src/lib/i18n-helpers.ts
git commit -m "feat(i18n): add translation query helper functions"
```

---

## Task 9: 创建语言切换器组件

**Files:**
- Create: `src/components/store/language-switcher.tsx`

**Step 1: 创建语言切换器**

```typescript
// src/components/store/language-switcher.tsx
'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()

  const handleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{localeNames[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleChange(loc)}
            className="gap-2"
          >
            <span>{localeFlags[loc]}</span>
            <span>{localeNames[loc]}</span>
            {locale === loc && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/store/language-switcher.tsx
git commit -m "feat(i18n): add language switcher component"
```

---

## Task 10: 更新 Tailwind 配置添加 RTL 支持

**Files:**
- Modify: `tailwind.config.ts`
- Create: `src/styles/rtl.css`

**Step 1: 添加 RTL 插件**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  // ... existing config
  plugins: [
    require('tailwindcss-animate'),
    require('tailwindcss-rtl'),
  ],
}

export default config
```

**Step 2: 创建 RTL 样式覆盖**

```css
/* src/styles/rtl.css */
/* RTL-specific overrides */
.rtl {
  direction: rtl;
  text-align: right;
}

.rtl .space-x-2 > :not([hidden]) ~ :not([hidden]) {
  --tw-space-x-reverse: 1;
}

.rtl .space-x-4 > :not([hidden]) ~ :not([hidden]) {
  --tw-space-x-reverse: 1;
}

/* Flip icons that indicate direction */
.rtl .icon-directional {
  transform: scaleX(-1);
}
```

**Step 3: 导入 RTL 样式到全局 CSS**

在 `src/app/globals.css` 中添加：

```css
@import '../styles/rtl.css';
```

**Step 4: Commit**

```bash
git add tailwind.config.ts src/styles/rtl.css src/app/globals.css
git commit -m "feat(i18n): add RTL support with tailwindcss-rtl"
```

---

## Task 11: 创建管理后台翻译组件

**Files:**
- Create: `src/components/admin/translation-tabs.tsx`
- Create: `src/components/admin/translatable-input.tsx`
- Create: `src/components/admin/translatable-textarea.tsx`

**Step 1: 创建翻译标签组件**

```typescript
// src/components/admin/translation-tabs.tsx
'use client'

import { cn } from '@/lib/utils'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { Check, Circle } from 'lucide-react'

interface TranslationTabsProps {
  activeLocale: Locale
  onLocaleChange: (locale: Locale) => void
  completedLocales?: Locale[]
}

export function TranslationTabs({
  activeLocale,
  onLocaleChange,
  completedLocales = [],
}: TranslationTabsProps) {
  return (
    <div className="flex gap-1 border-b mb-4">
      {locales.map((locale) => {
        const isActive = activeLocale === locale
        const isCompleted = completedLocales.includes(locale)

        return (
          <button
            key={locale}
            type="button"
            onClick={() => onLocaleChange(locale)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {localeNames[locale]}
            {isCompleted ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Circle className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        )
      })}
    </div>
  )
}
```

**Step 2: 创建可翻译输入框**

```typescript
// src/components/admin/translatable-input.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { locales, defaultLocale, type Locale } from '@/i18n/config'

interface TranslatableInputProps {
  name: string
  label: string
  values: Record<Locale, string>
  onChange: (locale: Locale, value: string) => void
  activeLocale: Locale
  required?: boolean
  placeholder?: string
}

export function TranslatableInput({
  name,
  label,
  values,
  onChange,
  activeLocale,
  required = false,
  placeholder,
}: TranslatableInputProps) {
  const defaultValue = values[defaultLocale]
  const currentValue = values[activeLocale]
  const isDefault = activeLocale === defaultLocale
  const isEmpty = !currentValue

  return (
    <div>
      <Label htmlFor={`${name}-${activeLocale}`}>
        {label} {required && '*'}
      </Label>
      <Input
        id={`${name}-${activeLocale}`}
        value={currentValue || ''}
        onChange={(e) => onChange(activeLocale, e.target.value)}
        placeholder={
          isDefault
            ? placeholder
            : isEmpty && defaultValue
            ? `(${defaultValue})`
            : placeholder
        }
        className={isEmpty && !isDefault ? 'border-dashed' : ''}
      />
      {isEmpty && !isDefault && defaultValue && (
        <p className="text-xs text-muted-foreground mt-1">
          未翻译 - 将显示英文: &quot;{defaultValue}&quot;
        </p>
      )}
    </div>
  )
}
```

**Step 3: 创建可翻译文本域**

```typescript
// src/components/admin/translatable-textarea.tsx
'use client'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { defaultLocale, type Locale } from '@/i18n/config'

interface TranslatableTextareaProps {
  name: string
  label: string
  values: Record<Locale, string>
  onChange: (locale: Locale, value: string) => void
  activeLocale: Locale
  rows?: number
  placeholder?: string
}

export function TranslatableTextarea({
  name,
  label,
  values,
  onChange,
  activeLocale,
  rows = 4,
  placeholder,
}: TranslatableTextareaProps) {
  const defaultValue = values[defaultLocale]
  const currentValue = values[activeLocale]
  const isDefault = activeLocale === defaultLocale
  const isEmpty = !currentValue

  return (
    <div>
      <Label htmlFor={`${name}-${activeLocale}`}>{label}</Label>
      <Textarea
        id={`${name}-${activeLocale}`}
        value={currentValue || ''}
        onChange={(e) => onChange(activeLocale, e.target.value)}
        rows={rows}
        placeholder={
          isDefault
            ? placeholder
            : isEmpty && defaultValue
            ? `(${defaultValue?.substring(0, 100)}...)`
            : placeholder
        }
        className={isEmpty && !isDefault ? 'border-dashed' : ''}
      />
      {isEmpty && !isDefault && defaultValue && (
        <p className="text-xs text-muted-foreground mt-1">
          未翻译 - 将回退到英文内容
        </p>
      )}
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/components/admin/translation-tabs.tsx src/components/admin/translatable-input.tsx src/components/admin/translatable-textarea.tsx
git commit -m "feat(admin): add translation editing components"
```

---

## Task 12: 更新产品 Server Action 支持翻译

**Files:**
- Modify: `src/actions/products.ts`

**Step 1: 更新 createProduct 处理翻译**

在 `createProduct` 函数中添加翻译数据处理：

```typescript
// 解析翻译数据
const translationsJson = formData.get('translations')
let translations: Record<string, { name: string; description: string }> = {}
if (translationsJson && typeof translationsJson === 'string') {
  try {
    translations = JSON.parse(translationsJson)
  } catch {
    // ignore
  }
}

// 在事务中创建翻译
const translationEntries = Object.entries(translations).filter(
  ([locale, data]) => locale !== 'en' && data.name
)

if (translationEntries.length > 0) {
  await tx.productTranslation.createMany({
    data: translationEntries.map(([locale, data]) => ({
      productId: product.id,
      locale,
      name: data.name,
      description: data.description || null,
    })),
  })
}
```

**Step 2: 更新 updateProduct 处理翻译**

```typescript
// 删除现有翻译
await tx.productTranslation.deleteMany({ where: { productId: id } })

// 创建新翻译
const translationEntries = Object.entries(translations).filter(
  ([locale, data]) => locale !== 'en' && data.name
)

if (translationEntries.length > 0) {
  await tx.productTranslation.createMany({
    data: translationEntries.map(([locale, data]) => ({
      productId: id,
      locale,
      name: data.name,
      description: data.description || null,
    })),
  })
}
```

**Step 3: 更新 getProduct 返回翻译**

```typescript
include: {
  // ... existing includes
  translations: true,
}
```

**Step 4: Commit**

```bash
git add src/actions/products.ts
git commit -m "feat(api): add translation support to product actions"
```

---

## Task 13: 更新产品表单集成翻译编辑

**Files:**
- Modify: `src/components/admin/product-form.tsx`

**Step 1: 添加翻译状态和组件**

```typescript
import { TranslationTabs } from './translation-tabs'
import { TranslatableInput } from './translatable-input'
import { TranslatableTextarea } from './translatable-textarea'
import { locales, defaultLocale, type Locale } from '@/i18n/config'

// 添加状态
const [activeLocale, setActiveLocale] = useState<Locale>(defaultLocale)
const [translations, setTranslations] = useState<Record<Locale, { name: string; description: string }>>(() => {
  const initial: Record<Locale, { name: string; description: string }> = {} as any
  locales.forEach((locale) => {
    if (locale === defaultLocale) {
      initial[locale] = {
        name: product?.name || '',
        description: product?.description || '',
      }
    } else {
      const existing = product?.translations?.find((t) => t.locale === locale)
      initial[locale] = {
        name: existing?.name || '',
        description: existing?.description || '',
      }
    }
  })
  return initial
})

// 更新翻译的函数
const updateTranslation = (locale: Locale, field: 'name' | 'description', value: string) => {
  setTranslations((prev) => ({
    ...prev,
    [locale]: { ...prev[locale], [field]: value },
  }))
}

// 计算已完成翻译的语言
const completedLocales = locales.filter(
  (locale) => translations[locale]?.name
)
```

**Step 2: 在表单中添加翻译标签和输入框**

```typescript
{/* 在 Name 和 Description 字段区域添加 */}
<TranslationTabs
  activeLocale={activeLocale}
  onLocaleChange={setActiveLocale}
  completedLocales={completedLocales}
/>

<TranslatableInput
  name="name"
  label="Product Name"
  values={Object.fromEntries(
    locales.map((l) => [l, translations[l]?.name || ''])
  ) as Record<Locale, string>}
  onChange={(locale, value) => updateTranslation(locale, 'name', value)}
  activeLocale={activeLocale}
  required
/>

<TranslatableTextarea
  name="description"
  label="Description"
  values={Object.fromEntries(
    locales.map((l) => [l, translations[l]?.description || ''])
  ) as Record<Locale, string>}
  onChange={(locale, value) => updateTranslation(locale, 'description', value)}
  activeLocale={activeLocale}
/>

{/* 添加隐藏字段传递翻译数据 */}
<input type="hidden" name="translations" value={JSON.stringify(translations)} />
```

**Step 3: Commit**

```bash
git add src/components/admin/product-form.tsx
git commit -m "feat(admin): integrate translation editing into product form"
```

---

## Task 14: 更新分类 Server Action 和表单支持翻译

**Files:**
- Modify: `src/actions/categories.ts`
- Modify: `src/components/admin/category-form.tsx`

（与产品类似的实现模式）

**Step 1: 更新分类 actions**

**Step 2: 更新分类表单**

**Step 3: Commit**

```bash
git add src/actions/categories.ts src/components/admin/category-form.tsx
git commit -m "feat(admin): add translation support to categories"
```

---

## Task 15: 更新前端组件使用翻译

**Files:**
- Modify: `src/components/store/header.tsx`
- Modify: `src/components/store/footer.tsx`
- Modify: `src/components/store/product-card.tsx`
- Modify: Multiple store pages

**Step 1: 更新 Header 组件**

```typescript
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from './language-switcher'

export async function Header() {
  const t = await getTranslations('nav')

  return (
    <header>
      {/* ... */}
      <nav>
        <Link href="/">{t('home')}</Link>
        <Link href="/products">{t('products')}</Link>
        <Link href="/categories">{t('categories')}</Link>
      </nav>
      <LanguageSwitcher />
      {/* ... */}
    </header>
  )
}
```

**Step 2: 更新其他组件使用 useTranslations**

**Step 3: Commit**

```bash
git add src/components/store/
git commit -m "feat(i18n): update store components with translations"
```

---

## Task 16: 更新前端页面使用 locale 参数

**Files:**
- Modify: `src/app/[locale]/(store)/products/page.tsx`
- Modify: `src/app/[locale]/(store)/products/[slug]/page.tsx`
- Modify: Other store pages

**Step 1: 更新产品列表页**

```typescript
import { getProductsWithTranslation } from '@/lib/i18n-helpers'
import { setRequestLocale } from 'next-intl/server'

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const products = await getProductsWithTranslation(locale)
  // ...
}
```

**Step 2: 更新产品详情页**

```typescript
import { getProductWithTranslation } from '@/lib/i18n-helpers'
import { setRequestLocale } from 'next-intl/server'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const product = await getProductWithTranslation(slug, locale)
  // ...
}
```

**Step 3: Commit**

```bash
git add src/app/[locale]/
git commit -m "feat(i18n): update pages to use locale-aware data fetching"
```

---

## Task 17: 添加 SEO hreflang 标签

**Files:**
- Create: `src/components/seo/hreflang-tags.tsx`
- Modify: `src/app/[locale]/layout.tsx`

**Step 1: 创建 hreflang 组件**

```typescript
// src/components/seo/hreflang-tags.tsx
import { locales, defaultLocale } from '@/i18n/config'

interface HreflangTagsProps {
  pathname: string
  baseUrl: string
}

export function HreflangTags({ pathname, baseUrl }: HreflangTagsProps) {
  return (
    <>
      {locales.map((locale) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale}
          href={`${baseUrl}/${locale}${pathname}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${baseUrl}/${defaultLocale}${pathname}`}
      />
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/seo/
git commit -m "feat(seo): add hreflang tags for multi-language support"
```

---

## Task 18: 构建验证和最终测试

**Step 1: 运行构建**

Run:
```bash
npm run build
```

Expected: 构建成功，无 TypeScript 错误

**Step 2: 运行开发服务器测试**

Run:
```bash
npm run dev
```

测试验证：
1. 访问 `/` 自动重定向到检测语言
2. 语言切换器正常工作
3. `/en/products`, `/zh/products`, `/ar/products` 正常访问
4. 阿拉伯文页面 RTL 布局正确
5. 产品/分类内容正确显示翻译
6. 管理后台可编辑多语言内容

**Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete i18n multi-language implementation"
```

---

## 验收标准

- [ ] 安装 next-intl 和 tailwindcss-rtl 依赖
- [ ] 数据库添加 5 个翻译表
- [ ] 所有页面移入 `[locale]` 动态路由
- [ ] Middleware 正确处理语言检测和重定向
- [ ] UI 翻译文件包含 en/zh/ar 三种语言
- [ ] 语言切换器正常工作
- [ ] 产品/分类等动态内容支持多语言
- [ ] 管理后台可编辑翻译内容
- [ ] 阿拉伯文 RTL 布局正确
- [ ] SEO hreflang 标签正确生成
- [ ] 构建成功，无错误
