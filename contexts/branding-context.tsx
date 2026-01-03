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
    brand_name: 'coachapro',
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
            // Convert hex to RGB for CSS variables
            const hex = data.secondary_color.replace('#', '')
            const r = parseInt(hex.substring(0, 2), 16)
            const g = parseInt(hex.substring(2, 4), 16)
            const b = parseInt(hex.substring(4, 6), 16)
            
            // Convert to OKLCH for proper Tailwind compatibility
            // This ensures opacity modifiers like bg-primary/10 work correctly on iOS
            const rNorm = r / 255
            const gNorm = g / 255
            const bNorm = b / 255
            
            // sRGB to linear RGB
            const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
            const rLin = toLinear(rNorm)
            const gLin = toLinear(gNorm)
            const bLin = toLinear(bNorm)
            
            // Linear RGB to XYZ (D65)
            const x = 0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin
            const y = 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin
            const z = 0.0193339 * rLin + 0.1191920 * gLin + 0.9503041 * bLin
            
            // XYZ to Lab (approximate OKLCH lightness and chroma)
            const L = Math.cbrt(y)
            const a_lab = (Math.cbrt(x / 0.95047) - Math.cbrt(y)) * 500
            const b_lab = (Math.cbrt(y) - Math.cbrt(z / 1.08883)) * 200
            const C = Math.sqrt(a_lab * a_lab + b_lab * b_lab) / 100
            const H = (Math.atan2(b_lab, a_lab) * 180 / Math.PI + 360) % 360
            
            // Apply as CSS custom properties - use OKLCH format for Tailwind 4 compatibility
            document.documentElement.style.setProperty('--secondary-color', data.secondary_color)
            document.documentElement.style.setProperty('--secondary-rgb', `${r}, ${g}, ${b}`)
            
            // Update primary color with OKLCH format for proper opacity support on iOS
            const oklchValue = `oklch(${L.toFixed(3)} ${(C * 0.4).toFixed(3)} ${H.toFixed(1)})`
            document.documentElement.style.setProperty('--primary', oklchValue)
            
            // Also set a direct brand color variable for use with inline styles
            document.documentElement.style.setProperty('--brand-color', data.secondary_color)
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

