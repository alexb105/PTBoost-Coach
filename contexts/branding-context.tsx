"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface BrandingSettings {
  brand_name: string
  tagline: string
  logo_url: string | null
}

interface BrandingContextType {
  branding: BrandingSettings
  isLoading: boolean
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined)

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>({
    brand_name: 'coachapro',
    tagline: 'Elite Personal Training Platform',
    logo_url: null,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await fetch('/api/branding')
        if (response.ok) {
          const data = await response.json()
          setBranding({
            brand_name: data.brand_name,
            tagline: data.tagline,
            logo_url: data.logo_url,
          })
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

