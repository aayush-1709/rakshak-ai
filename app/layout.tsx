import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import rakshakLogo from '../logo.png'
import { LanguageProvider } from '@/components/language-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Rakshak AI | Public Complaint Dashboard',
  description: 'AI-powered public complaint dashboard for monitoring and analyzing urban infrastructure issues',
  generator: 'v0.app',
  icons: {
    icon: rakshakLogo.src,
    apple: rakshakLogo.src,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <LanguageProvider>
          {children}
          <Toaster richColors position="top-right" />
          <Analytics />
        </LanguageProvider>
      </body>
    </html>
  )
}
