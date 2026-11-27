import type { Metadata } from 'next'
import { Pixelify_Sans, Space_Grotesk } from 'next/font/google'
import Link from 'next/link'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { SistemigroPromo } from '@/components/SistemigroPromo'

/**
 * `latin-ext` is what carries U+0218–021B (Șș Țț). Without it every Romanian
 * diacritic falls back to another face mid-word.
 */
const pixelify = Pixelify_Sans({
  variable: '--font-pixelify',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Unul la un milion — joc de cultură generală despre România',
    template: '%s · Unul la un milion',
  },
  description:
    'Câte răspunsuri rare știi despre România? Șapte întrebări, 20 de secunde fiecare. ' +
    'Cu cât răspunsul tău e mai rar, cu atât primești mai multe puncte.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    siteName: 'Unul la un milion',
    url: '/',
  },
  twitter: { card: 'summary_large_image' },
}

/** The ia-style tricolour stripe that tops and tails every screen. */
function Tricolour() {
  return (
    <div className="flex h-1.5 shrink-0" aria-hidden="true">
      <div className="flex-1 bg-blue" />
      <div className="flex-1 bg-yellow" />
      <div className="flex-1 bg-action" />
    </div>
  )
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ro" className={`${pixelify.variable} ${spaceGrotesk.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Tricolour />
        <main className="mx-auto w-full max-w-[430px] flex-1">{children}</main>
        <footer className="mx-auto w-full max-w-[430px] border-t-2 px-5 pt-4 pb-5 text-[13px]">
          <nav aria-label="Pagini" className="flex flex-wrap justify-center gap-4">
            <Link href="/cum-se-joaca">Cum se joacă</Link>
            <Link href="/despre">Despre</Link>
            <Link href="/confidentialitate">Confidențialitate</Link>
          </nav>
          <SistemigroPromo />
        </footer>
        <Tricolour />
        <Analytics />
      </body>
    </html>
  )
}
