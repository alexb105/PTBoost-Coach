import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In — APEX Training",
  description: "Access your elite personal training platform",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
