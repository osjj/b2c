import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { routing } from '@/i18n/routing'
import { isRtlLocale, locales, defaultLocale } from '@/i18n/config'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  // Generate alternate language links for hreflang tags
  const languages: Record<string, string> = {}
  locales.forEach((loc) => {
    languages[loc] = `${baseUrl}/${loc}`
  })
  languages['x-default'] = `${baseUrl}/${defaultLocale}`

  return {
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages,
    },
  }
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
