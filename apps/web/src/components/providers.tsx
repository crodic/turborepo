import React from 'react'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { HelmetProvider } from 'react-helmet-async'
import { DirectionProvider } from '@/context/direction-provider'
import { FontProvider } from '@/context/font-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { RuntimeWebsiteMetadata } from './runtime-website-metadata'
import { Toaster } from './ui/sonner'

const helmetContext = {}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HelmetProvider context={helmetContext}>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <RuntimeWebsiteMetadata />
            <Toaster duration={5000} />
            {children}
            {import.meta.env.MODE === 'development' && (
              <ReactQueryDevtools buttonPosition='bottom-right' />
            )}
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}
