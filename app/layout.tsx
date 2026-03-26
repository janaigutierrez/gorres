import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gorres PET — Gorres artesanals de PET reciclat',
  description: 'Gorres d\'hivern artesanals fetes amb plàstic PET reciclat. Personalitzades per a empreses, events i ajuntaments.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ca" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
