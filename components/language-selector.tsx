"use client"

import { useState, useEffect, useRef } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
]

interface LanguageSelectorProps {
  value: string
  onValueChange: (value: string) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function LanguageSelector({ value, onValueChange, open, onOpenChange }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedLanguage(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node) && onOpenChange) {
        onOpenChange(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onOpenChange])

  const handleSelect = (currentValue: string) => {
    setSelectedLanguage(currentValue)
    onValueChange(currentValue)
    if (onOpenChange) {
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 w-[200px] z-50 bg-zinc-900 border border-zinc-700 rounded-md shadow-md"
    >
      <Command className="bg-transparent">
        <CommandInput placeholder="Search language..." className="h-9" />
        <CommandList>
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {languages.map((language) => (
              <CommandItem
                  key={language.value}
                  value={language.value}
                  onSelect={() => handleSelect(language.value)}
                  className="cursor-pointer"
                >


                <Check
                  className={cn("mr-2 h-4 w-4", selectedLanguage === language.value ? "opacity-100" : "opacity-0")}
                />
                {language.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )
}
