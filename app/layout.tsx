import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { NavigationWrapper } from "@/components/navigation-wrapper"
import { Toaster } from "@/components/ui/sonner"
import { LanguageProvider } from "@/contexts/language-context"
import { BrandingProvider } from "@/contexts/branding-context"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "coachapro — Elite Personal Training",
  description: "Elevate your fitness journey with personalized elite training",
  generator: "v0.app",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1, // Prevent zoom on iOS for better UX
    userScalable: false, // Prevent double-tap zoom
    viewportFit: "cover", // Support notch/safe areas
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "coachapro",
    startupImage: [
      {
        url: "/apple-icon.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: {
    telephone: false, // Prevent auto-linking phone numbers
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      { url: "/apple-icon.png" },
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* iOS-specific meta tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="format-detection" content="date=no" />
        <meta name="format-detection" content="address=no" />
        <meta name="format-detection" content="email=no" />
      </head>
      <body className={`font-sans antialiased h-full overflow-hidden`}>
        <BrandingProvider>
          <LanguageProvider>
            <div className="h-full overflow-y-auto overflow-x-hidden overscroll-contain">
              {children}
              <NavigationWrapper />
            </div>
            <Analytics />
            <Toaster position="top-center" />
          </LanguageProvider>
        </BrandingProvider>
      </body>
    </html>
  )
}
