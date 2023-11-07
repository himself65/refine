import type { Metadata } from 'next'
import React from 'react'
import { Inter } from 'next/font/google'
import '@blocksuite/editor/themes/affine.css'
import './globals.css'
import { Provider } from './provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'refine',
  description: 'note-taking app',
  authors: [
    {
      name: 'Alex Yang',
    }
  ]
}

export default function RootLayout ({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
    <body className={inter.className}>
    <Provider>
      {children}
    </Provider>
    </body>
    </html>
  )
}
