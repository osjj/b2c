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

export const metadata: Metadata = {
  title: {
    default: "PPE Pro | Professional PPE Manufacturer",
    template: "%s | PPE Pro",
  },
  description:
    "Leading manufacturer of personal protective equipment. Safety gloves, shoes, workwear, and more. CE, ANSI, ISO9001 certified. OEM/ODM services available.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  keywords: [
    "PPE",
    "safety gloves",
    "work gloves",
    "protective equipment",
    "safety shoes",
    "workwear",
    "industrial safety",
    "personal protective equipment",
  ],
  authors: [{ name: "PPE Pro" }],
  creator: "PPE Pro",
  publisher: "PPE Pro",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PPE Pro",
    title: "PPE Pro | Professional PPE Manufacturer",
    description:
      "Leading manufacturer of personal protective equipment. Safety gloves, shoes, workwear, and more.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "PPE Pro - Professional Safety Equipment",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PPE Pro | Professional PPE Manufacturer",
    description:
      "Leading manufacturer of personal protective equipment. Safety gloves, shoes, workwear, and more.",
    images: ["/og-image.jpg"],
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
