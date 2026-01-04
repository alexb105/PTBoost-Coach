'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      // iOS-friendly: position at top to avoid keyboard, respect safe areas
      position="top-center"
      // Increase touch target and add safe area offset
      offset="max(16px, env(safe-area-inset-top, 16px))"
      // Longer duration for mobile users
      duration={4000}
      // Close on swipe for iOS-like feel
      closeButton={false}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      toastOptions={{
        // iOS-friendly: larger text and padding
        className: 'text-base py-4 px-4',
      }}
      {...props}
    />
  )
}

export { Toaster }
