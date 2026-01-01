"use client"

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import enTranslations from '@/lib/translations/en.json'

type Language = 'en' | 'th' | 'fr' | 'de' | 'pl'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Initialize with English translations to avoid null state
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language
      if (savedLanguage && ['en', 'th', 'fr', 'de', 'pl'].includes(savedLanguage)) {
        return savedLanguage
      }
    }
    return 'en'
  })
  const [translations, setTranslations] = useState<any>(enTranslations)

  useEffect(() => {
    // Load translations when language changes
    const loadTranslations = async () => {
      if (language === 'en') {
        setTranslations(enTranslations)
        return
      }
      
      try {
        const translationsModule = await import(`@/lib/translations/${language}.json`)
        setTranslations(translationsModule.default || translationsModule)
      } catch (error) {
        console.error(`Failed to load translations for ${language}:`, error)
        // Fallback to English
        setTranslations(enTranslations)
      }
    }
    loadTranslations()
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang)
    }
  }

  const t = useMemo(() => {
    return (key: string): string => {
      if (!translations) return key
      
      const keys = key.split('.')
      let value: any = translations
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k]
        } else {
          return key
        }
      }
      
      return typeof value === 'string' ? value : key
    }
  }, [translations])

  const value = useMemo(() => ({
    language,
    setLanguage,
    t
  }), [language, t])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

