import type { Metadata } from "next";
import Script from "next/script";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const baseUrl = getSiteUrl()
const GOOGLE_ADS_ID = "AW-18154606166"
const META_PIXEL_ID = "1405506711622457"

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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ADS_ID}');
          `}
        </Script>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1" alt="" />`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
