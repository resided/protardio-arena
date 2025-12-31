import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PROTARDIO ARENA - LET IT RIP!',
  description: 'Battle your Protardio NFTs in epic Beyblade-style showdowns on Arbitrum!',
  openGraph: {
    title: 'PROTARDIO ARENA',
    description: 'Battle your Protardio NFTs in epic Beyblade-style showdowns!',
  },
  other: {
    'fc:frame': 'vNext',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
