import { NextRequest, NextResponse } from 'next/server'

// Language code mapping for Google Translate API
const LANGUAGE_CODES: Record<string, string> = {
  'en': 'en',
  'th': 'th',
  'fr': 'fr',
  'de': 'de',
  'pl': 'pl',
}

export async function POST(request: NextRequest) {
  let text = ''
  
  try {
    const body = await request.json()
    text = body.text || ''
    const targetLang = body.targetLang

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Valid text is required' },
        { status: 400 }
      )
    }

    if (!targetLang) {
      return NextResponse.json(
        { error: 'Target language is required' },
        { status: 400 }
      )
    }

    // If target language is English, return text as-is
    if (targetLang === 'en') {
      return NextResponse.json({ translatedText: text })
    }

    const targetCode = LANGUAGE_CODES[targetLang] || 'en'

    // If target code is still English, return as-is
    if (targetCode === 'en') {
      return NextResponse.json({ translatedText: text })
    }

    // Use Google Translate API (free, no API key required)
    // Use dynamic import to avoid module resolution issues
    try {
      const translateModule = await import('google-translate-api-x')
      const translate = translateModule.default || translateModule.translate || translateModule
      const result = await translate(text, { to: targetCode })
      
      if (result && result.text) {
        const translated = result.text.trim()
        // If translation is the same as original (likely already in target language), return original
        if (translated.toLowerCase() === text.toLowerCase()) {
          return NextResponse.json({ translatedText: text })
        }
        return NextResponse.json({
          translatedText: translated,
        })
      } else {
        // Fallback: return original text if translation fails
        console.warn('Translation API returned empty result')
        return NextResponse.json({ translatedText: text })
      }
    } catch (translateError: any) {
      // Handle rate limiting and other errors gracefully
      if (translateError.message?.includes('429') || translateError.message?.includes('rate limit')) {
        console.warn('Translation rate limit exceeded, using original text')
      } else {
        console.warn('Translation request failed:', translateError.message || translateError)
      }
      // Return original text on any error
      return NextResponse.json({ translatedText: text })
    }
  } catch (error: any) {
    console.error('Error translating text:', error)
    // Return original text on error
    return NextResponse.json({ translatedText: text || '' })
  }
}

