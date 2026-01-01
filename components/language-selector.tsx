"use client"

import { useState } from "react"
import { useLanguage } from "@/contexts/language-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Globe } from "lucide-react"

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
]

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage()
  const [open, setOpen] = useState(false)

  const handleValueChange = (value: string) => {
    // Close the dropdown first
    setOpen(false)
    // Then change the language after a small delay to allow the portal to unmount
    setTimeout(() => {
      setLanguage(value as any)
    }, 100)
  }

  return (
    <Select 
      value={language} 
      open={open}
      onOpenChange={setOpen}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[140px]">
        <Globe className="mr-2 h-4 w-4" />
        <SelectValue placeholder={t("common.language")} />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.native} ({lang.name})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

