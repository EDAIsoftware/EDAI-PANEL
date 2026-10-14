import type { Metadata } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' })

export const metadata: Metadata = {
  title: 'EDAI Tiendas',
  description: 'Tiendas online con pedidos por WhatsApp, por EDAI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={figtree.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  )
}
