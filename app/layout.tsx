import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import Providers from './providers'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Syncia',
  description: 'Project-scoped team coordination for FHSU staff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
