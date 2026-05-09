import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const baseUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Laifappe",
  description:
    "Laifappe is a leading manufacturer of personal protective equipment (PPE). We specialize in safety gloves, shoes, and workwear. CE, ANSI, ISO9001 certified. Bulk orders & OEM/ODM services available.",
  alternates: {
    canonical: "./",
  },
  keywords: [
    "PPE manufacturer",
    "safety gloves wholesale",
    "industrial safety equipment",
    "China PPE factory",
    "safety shoes supplier",
    "workwear OEM",
    "Laifappe",
  ],
  authors: [{ name: "Laifappe Team" }],
  creator: "Laifappe Industry",
  publisher: "Laifappe Industry",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Laifappe Industry",
    title: "Laifappe | Certified PPE Manufacturer & Supplier",
    description:
      "ISO9001 Certified factory for safety gloves, shoes, and workwear. Competitive wholesale prices for global distributors.",
    images: [
      {
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
    images: ["/og-image-main.webp"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
