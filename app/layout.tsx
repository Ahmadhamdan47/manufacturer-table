import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Manufacturer',
  description: 'Created By Ahmad Hamdan',
  generator: 'Ahmad Hamdan',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
