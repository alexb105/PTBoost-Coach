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
  { code: 'en', name: 'English', native: 'English', short: 'EN' },
  { code: 'th', name: 'Thai', native: 'ไทย', short: 'TH' },
  { code: 'fr', name: 'French', native: 'Français', short: 'FR' },
  { code: 'de', name: 'German', native: 'Deutsch', short: 'DE' },
  { code: 'pl', name: 'Polish', native: 'Polski', short: 'PL' },
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

  const currentLang = languages.find(l => l.code === language)

  return (
    <Select 
      value={language} 
      open={open}
      onOpenChange={setOpen}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[70px] sm:w-[140px] h-8 sm:h-10 px-1.5 sm:px-3 text-[10px] sm:text-sm">
        <Globe className="mr-0.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
        <SelectValue placeholder={t("common.language")} className="truncate" />
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

