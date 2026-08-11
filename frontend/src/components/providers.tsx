'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'
import { Toaster } from 'sonner'

function EnforceMobileLightMode() {
  const { setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    const checkAndEnforceLightMode = () => {
      if (typeof window === 'undefined') return
      const isMobileOrTablet = window.innerWidth < 1024 || /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(navigator.userAgent.toLowerCase())
      
      if (isMobileOrTablet) {
        if (resolvedTheme === 'dark') {
          setTheme('light')
        }
        document.documentElement.classList.remove('dark')
        document.documentElement.classList.add('light')
        try {
          document.cookie = 'simasmuh_theme_cache=light; path=/; max-age=31536000; SameSite=Lax'
          window.localStorage.setItem('simasmuh_theme_cache', 'light')
        } catch (e) {}
      }
    }

    checkAndEnforceLightMode()
    window.addEventListener('resize', checkAndEnforceLightMode)
    return () => window.removeEventListener('resize', checkAndEnforceLightMode)
  }, [setTheme, resolvedTheme])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0, // always refetch on mount/refetch to show latest data
        gcTime: 1000 * 60 * 30, // 30 minutes
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
      },
      mutations: {
        retry: false,
      },
    },
  }))

  // Sinkronisasi memori cache Cookie & LocalStorage untuk kenyamanan setingan terakhir pengguna di desktop
  useEffect(() => {
    try {
      const match = document.cookie.match(new RegExp('(^| )simasmuh_theme_cache=([^;]+)'))
      const cookieTheme = match ? match[2] : null
      const localTheme = window.localStorage.getItem('simasmuh_theme_cache')
      
      if (cookieTheme && !localTheme) {
        window.localStorage.setItem('simasmuh_theme_cache', cookieTheme)
      } else if (localTheme && (!cookieTheme || cookieTheme !== localTheme)) {
        document.cookie = `simasmuh_theme_cache=${localTheme}; path=/; max-age=31536000; SameSite=Lax`
      }
    } catch (e) {
      console.error('Gagal mensinkronisasi cache cookie tema:', e)
    }
  }, [])

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <NextThemesProvider attribute="class" defaultTheme="light" storageKey="simasmuh_theme_cache" enableSystem={false}>
          <EnforceMobileLightMode />
          {children}
          <Toaster 
            position="top-right"
            expand={true}
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
        </NextThemesProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}


