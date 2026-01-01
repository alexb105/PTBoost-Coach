"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface BrandingSettings {
  brand_name: string
  tagline: string
  logo_url: string | null
  secondary_color: string
}

interface BrandingContextType {
  branding: BrandingSettings
  isLoading: boolean
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>({
    brand_name: 'APEX Training',
    tagline: 'Elite Personal Training Platform',
    logo_url: null,
    secondary_color: '#3b82f6',
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await fetch('/api/branding')
        if (response.ok) {
          const data = await response.json()
          setBranding(data)
          
          // Apply secondary color as CSS variables
          if (typeof document !== 'undefined' && data.secondary_color) {
            // Convert hex to RGB for CSS variables if needed
            const hex = data.secondary_color.replace('#', '')
            const r = parseInt(hex.substring(0, 2), 16)
            const g = parseInt(hex.substring(2, 4), 16)
            const b = parseInt(hex.substring(4, 6), 16)
            
            // Apply as CSS custom properties
            document.documentElement.style.setProperty('--secondary-color', data.secondary_color)
            document.documentElement.style.setProperty('--secondary-rgb', `${r}, ${g}, ${b}`)
            
            // Also update primary color to match secondary for consistency
            // This ensures buttons and primary elements use the brand color
            document.documentElement.style.setProperty('--primary', data.secondary_color)
          }
        }
      } catch (error) {
        console.error('Failed to load branding settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadBranding()
  }, [])

  return (
    <BrandingContext.Provider value={{ branding, isLoading }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const context = useContext(BrandingContext)
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider')
  }
  return context
}

