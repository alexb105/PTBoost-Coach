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
      // The library exports translate as default or named export
      const translate = translateModule.default || translateModule.translate
      
      if (!translate || typeof translate !== 'function') {
        console.error('Translation function not found in module:', translateModule)
        return NextResponse.json({ translatedText: text })
      }
      
      // Auto-detect source language (default behavior, no need to specify 'from')
      const result = await translate(text, { 
        to: targetCode
      })
      
      if (result && result.text) {
        const translated = result.text.trim()
        
        // Always return the translated text, even if it's the same
        // (the library might return the same text if already in target language)
        return NextResponse.json({
          translatedText: translated,
        })
      } else {
        // Fallback: return original text if translation fails
        console.warn('Translation API returned empty result for text:', text.substring(0, 50))
        return NextResponse.json({ translatedText: text })
      }
    } catch (translateError: any) {
      // Handle rate limiting and other errors gracefully
      const errorMessage = translateError.message || String(translateError)
      if (errorMessage.includes('429') || 
          errorMessage.includes('rate limit') || 
          errorMessage.includes('Too Many Requests')) {
        // Silently handle rate limiting - don't log as it's expected behavior
        // Return original text on rate limit
        return NextResponse.json({ translatedText: text })
      } else {
        // Log non-rate-limit errors for debugging
        console.error('Translation request failed:', {
          error: errorMessage,
          text: text.substring(0, 100),
          targetLang,
          targetCode,
          stack: translateError.stack
        })
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

