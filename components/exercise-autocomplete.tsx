"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Exercise {
  id: string
  name: string
  display_name: string
}

interface ExerciseAutocompleteProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export function ExerciseAutocomplete({
  id,
  label = "Exercise Name",
  value,
  onChange,
  placeholder = "e.g., Bench Press",
  required = false,
  className,
}: ExerciseAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchExercises()
  }, [])

  useEffect(() => {
    setSearchQuery(value)
  }, [value])

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/exercises")
      if (response.ok) {
        const data = await response.json()
        setExercises(data.exercises || [])
      }
    } catch (error) {
      console.error("Error fetching exercises:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredExercises = exercises.filter((exercise) =>
    exercise.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Check if the search query matches any existing exercise exactly
  const exactMatch = exercises.find(
    (ex) => ex.display_name.toLowerCase() === searchQuery.toLowerCase().trim() ||
            ex.name.toLowerCase() === searchQuery.toLowerCase().trim()
  )

  // Show "Create new" option if there's a search query and no exact match
  const showCreateNew = searchQuery.trim() && !exactMatch && filteredExercises.length === 0

  const createNewExercise = async (exerciseName: string) => {
    if (!exerciseName.trim()) return

    try {
      setCreating(true)
      const response = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: exerciseName.trim(),
          display_name: exerciseName.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create exercise")
      }

      const data = await response.json()
      
      // Add the new exercise to the local list
      setExercises((prev) => [...prev, data.exercise].sort((a, b) => 
        a.display_name.localeCompare(b.display_name)
      ))

      // Set the value to the new exercise
      onChange(data.exercise.display_name)
      setSearchQuery(data.exercise.display_name)
      setOpen(false)
      
      toast.success(`Exercise "${data.exercise.display_name}" created successfully`)
    } catch (error: any) {
      console.error("Error creating exercise:", error)
      toast.error(error.message || "Failed to create exercise")
    } finally {
      setCreating(false)
    }
  }

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      createNewExercise(searchQuery.trim())
    }
  }

  const handleSelect = (exercise: Exercise) => {
    const displayName = exercise.display_name
    onChange(displayName)
    setSearchQuery(displayName)
    setOpen(false)
    // Ensure the input ref is updated
    if (inputRef.current) {
      inputRef.current.value = displayName
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)
    onChange(newValue)
  }

  const selectedExercise = exercises.find(
    (ex) => ex.display_name.toLowerCase() === value.toLowerCase() || ex.name.toLowerCase() === value.toLowerCase()
  )

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id}>
          {label} {required && "*"}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              id={id}
              value={searchQuery}
              onChange={handleInputChange}
              onClick={(e) => {
                e.stopPropagation()
                if (exercises.length > 0 && !open) {
                  setOpen(true)
                }
              }}
              onFocus={() => {
                if (exercises.length > 0) {
                  setOpen(true)
                }
              }}
              placeholder={placeholder}
              required={required}
              className={cn("pr-8", className)}
            />
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpen(!open)
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-6 w-6 flex items-center justify-center hover:bg-muted rounded"
                tabIndex={-1}
              >
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] p-0" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onEscapeKeyDown={() => {
              setOpen(false)
              inputRef.current?.focus()
            }}
          >
            <Command shouldFilter={false}>
              <CommandInput 
                placeholder="Search exercises..." 
                value={searchQuery} 
                onValueChange={(value) => {
                  setSearchQuery(value)
                  // Update main input when typing in command input
                  onChange(value)
                  if (inputRef.current) {
                    inputRef.current.value = value
                  }
                }} 
              />
              <CommandList>
                {loading || creating ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    {creating && (
                      <span className="ml-2 text-sm text-muted-foreground">Creating exercise...</span>
                    )}
                  </div>
                ) : (
                  <>
                    {showCreateNew && (
                      <CommandGroup>
                        <CommandItem
                          onSelect={handleCreateNew}
                          className="cursor-pointer bg-primary/5 hover:bg-primary/10 border-l-2 border-primary"
                        >
                          <Plus className="mr-2 h-4 w-4 text-primary" />
                          <div className="flex-1">
                            <div className="font-medium text-primary">
                              Create "{searchQuery.trim()}"
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Add this as a new exercise
                            </div>
                          </div>
                        </CommandItem>
                      </CommandGroup>
                    )}
                    {filteredExercises.length > 0 && (
                      <CommandGroup>
                        {filteredExercises.map((exercise) => (
                          <CommandItem
                            key={exercise.id}
                            value={exercise.display_name}
                            onSelect={() => handleSelect(exercise)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedExercise?.id === exercise.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{exercise.display_name}</div>
                              {exercise.name !== exercise.display_name.toLowerCase() && (
                                <div className="text-xs text-muted-foreground font-mono">{exercise.name}</div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {!showCreateNew && filteredExercises.length === 0 && (
                      <CommandEmpty>
                        {searchQuery ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No exercises found. Start typing to create a new exercise.
                          </div>
                        ) : (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Start typing to search exercises...
                          </div>
                        )}
                      </CommandEmpty>
                    )}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      {searchQuery && filteredExercises.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filteredExercises.length} {filteredExercises.length === 1 ? "match" : "matches"} found
        </p>
      )}
    </div>
  )
}
