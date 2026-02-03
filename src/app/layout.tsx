import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 定义基础 URL，确保生产环境绝对路径正确
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL 
  ? `https://${process.env.NEXT_PUBLIC_SITE_URL}` 
  : "http://localhost:3000"

export const metadata: Metadata = {
  // 1. 这里的 Base 很重要，它让下面的 canonical 和 og:image 自动生成完整链接
  metadataBase: new URL(baseUrl),

  title: {
    // B2B 黄金法则：品牌 + 核心商业词 (Factory/Manufacturer) + 核心地域 (China)
    template: '%s | China Top PPE Manufacturer - Laifappe',
    default: 'Laifappe - Professional PPE Supplier & Wholesale Factory', // 加上 Wholesale (批发)
  },

  description:
    "Laifappe is a leading manufacturer of personal protective equipment (PPE). We specialize in safety gloves, shoes, and workwear. CE, ANSI, ISO9001 certified. Bulk orders & OEM/ODM services available.",

  // 2. 规范标签 (Canonical)：防止参数导致的内容重复问题 (SEO 必须)   
  alternates: {
    canonical: './', 
  },

  keywords: [
    "PPE manufacturer", // 加上 manufacturer 后缀更精准
    "safety gloves wholesale", // 加上 wholesale
    "industrial safety equipment",
    "China PPE factory", // 地域词很关键
    "safety shoes supplier",
    "workwear OEM", // 强调代工能力
    "Laifappe", // 品牌词
  ],

  // 3. 品牌统一：全部改为 Laifappe
  authors: [{ name: "Laifappe Team" }], 
  creator: "Laifappe Industry",
  publisher: "Laifappe Industry",

  // 4. OpenGraph 优化：这是你在 WhatsApp/LinkedIn 分享链接时别人看到的样子
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Laifappe Industry", // 统一品牌名
    title: "Laifappe | Certified PPE Manufacturer & Supplier",
    description:
      "ISO9001 Certified factory for safety gloves, shoes, and workwear. Competitive wholesale prices for global distributors.",
    images: [
      {
        // 不要只用 Logo！Logo 在分享卡片里太小看不清。
        // 建议做一张 1200x630 的图，包含：工厂实景 + 热门产品拼图 + 大号文字 "Factory Direct"
        url: "/og-image-main.webp", 
        width: 1200,
        height: 630,
        alt: "Laifappe PPE Factory Production Line",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Laifappe - Top PPE Manufacturer in China",
    description: "Bulk buy safety equipment directly from certified factory. OEM/ODM available.",
    // 同样建议使用专门的宣传图，而不是 Logo
    images: ["/og-image-main.webp"], 
  },

  // 5. 图标设置 (Next.js 推荐在这里配置)
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
