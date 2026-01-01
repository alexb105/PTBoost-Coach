"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Trophy, Calendar, Loader2 } from "lucide-react"
import { ExerciseAutocomplete } from "@/components/exercise-autocomplete"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"
import { normalizeExerciseName } from "@/lib/exercise-utils"

export interface ExerciseFormData {
  name: string
  sets: string
  reps: string
  type: "reps" | "seconds"
  weight?: string
  notes?: string
}

interface ExerciseFormItemProps {
  exercise: ExerciseFormData
  index: number
  onUpdate: (index: number, field: keyof ExerciseFormData, value: string) => void
  onRemove?: (index: number) => void
  canRemove?: boolean
  idPrefix?: string
  customerId?: string // Customer ID for viewing PBs
}

interface ExercisePB {
  id: string
  reps?: string
  weight?: string
  seconds?: string
  workout_date?: string
}

interface PBHistoryEntry {
  workout_date: string
  reps?: string
  weight?: string
  seconds?: string
  completed_at?: string
}

export function ExerciseFormItem({
  exercise,
  index,
  onUpdate,
  onRemove,
  canRemove = false,
  idPrefix = "exercise",
  customerId,
}: ExerciseFormItemProps) {
  const [pbDialogOpen, setPbDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pb, setPb] = useState<ExercisePB | null>(null)
  const [pbHistory, setPbHistory] = useState<PBHistoryEntry[]>([])

  const fetchExercisePB = async () => {
    if (!exercise.name.trim() || !customerId) {
      toast.error("Please enter an exercise name first")
      return
    }

    try {
      setLoading(true)
      setPbDialogOpen(true)
      const normalizedName = normalizeExerciseName(exercise.name)
      const encodedName = encodeURIComponent(normalizedName)
      const response = await fetch(`/api/admin/customers/${customerId}/exercises/${encodedName}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch exercise PB")
      }

      const data = await response.json()
      setPb(data.pb)
      setPbHistory(data.history || [])
    } catch (error) {
      console.error("Error fetching exercise PB:", error)
      toast.error("Failed to load exercise personal bests")
    } finally {
      setLoading(false)
    }
  }

  const formatPBValue = (entry: ExercisePB | PBHistoryEntry) => {
    const parts: string[] = []
    
    if (entry.reps) {
      parts.push(`${entry.reps} ${entry.reps === "1" ? "rep" : "reps"}`)
    }
    if (entry.weight) {
      // If weight doesn't already have units, assume kg
      const weightValue = entry.weight.trim()
      const hasUnits = /(kg|lbs|lb|kg\.|pounds?)/i.test(weightValue)
      parts.push(hasUnits ? weightValue : `${weightValue}kg`)
    }
    if (entry.seconds) {
      const secondsNum = parseInt(entry.seconds)
      if (secondsNum === 1) {
        parts.push("1 second")
      } else if (secondsNum < 60) {
        parts.push(`${secondsNum} seconds`)
      } else {
        const minutes = Math.floor(secondsNum / 60)
        const remainingSeconds = secondsNum % 60
        if (remainingSeconds === 0) {
          parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`)
        } else {
          parts.push(`${minutes}m ${remainingSeconds}s`)
        }
      }
    }
    
    if (parts.length === 0) {
      return "No PB recorded"
    }
    
    // Format more naturally: "10 reps at 30kg" or "30 seconds"
    if (parts.length === 1) {
      return parts[0]
    } else if (parts.length === 2) {
      return `${parts[0]} at ${parts[1]}`
    } else {
      return parts.join(", ")
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {index + 1}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {customerId && exercise.name.trim() && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={fetchExercisePB}
              className="h-8 w-8"
              title="View client's personal bests"
            >
              <Trophy className="h-4 w-4 text-primary" />
            </Button>
          )}
          {canRemove && onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <ExerciseAutocomplete
          id={`${idPrefix}-name-${index}`}
          label="Exercise Name"
          value={exercise.name}
          onChange={(value) => onUpdate(index, "name", value)}
          placeholder="e.g., Bench Press"
          required
          className="bg-background"
        />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-sets-${index}`} className="text-xs">Sets</Label>
            <Input
              id={`${idPrefix}-sets-${index}`}
              type="number"
              min="1"
              value={exercise.sets}
              onChange={(e) => onUpdate(index, "sets", e.target.value)}
              placeholder="3"
              className="bg-background h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-type-${index}`} className="text-xs">Type</Label>
            <Select
              value={exercise.type || "reps"}
              onValueChange={(value) => onUpdate(index, "type", value as "reps" | "seconds")}
            >
              <SelectTrigger className="bg-background h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reps">Reps</SelectItem>
                <SelectItem value="seconds">Seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-reps-${index}`} className="text-xs">
              {exercise.type === "seconds" ? "Seconds" : "Reps"}
            </Label>
            <Input
              id={`${idPrefix}-reps-${index}`}
              type="number"
              min="1"
              value={exercise.reps}
              onChange={(e) => onUpdate(index, "reps", e.target.value)}
              placeholder={exercise.type === "seconds" ? "30" : "8-10"}
              className="bg-background h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-weight-${index}`} className="text-xs">Weight</Label>
            <Input
              id={`${idPrefix}-weight-${index}`}
              value={exercise.weight || ""}
              onChange={(e) => onUpdate(index, "weight", e.target.value)}
              placeholder="50kg"
              className="bg-background h-9"
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-notes-${index}`} className="text-xs text-muted-foreground">Notes (optional)</Label>
          <Input
            id={`${idPrefix}-notes-${index}`}
            value={exercise.notes || ""}
            onChange={(e) => onUpdate(index, "notes", e.target.value)}
            placeholder="Focus on form, rest 60s"
            className="bg-background h-9"
          />
        </div>
      </div>

      {/* PB History Dialog */}
      <Dialog open={pbDialogOpen} onOpenChange={setPbDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {exercise.name} - Personal Bests
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current PB */}
              {pb ? (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Current PB</span>
                  </div>
                  <p className="text-lg font-bold text-foreground mb-1">
                    {formatPBValue(pb)}
                  </p>
                  {pb.workout_date && (
                    <p className="text-xs text-muted-foreground">
                      Achieved on {format(parseISO(pb.workout_date), "MMMM d, yyyy")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
                  <p className="text-sm text-muted-foreground">No personal best recorded</p>
                </div>
              )}

              {/* PB History */}
              {pbHistory.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">History</h3>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {pbHistory.map((entry, idx) => {
                      const isCurrentPB = pb && entry.workout_date === pb.workout_date
                      const entryDate = entry.completed_at || entry.workout_date
                      
                      return (
                        <div
                          key={idx}
                          className={`rounded border p-2.5 text-sm ${
                            isCurrentPB
                              ? "bg-primary/5 border-primary/20"
                              : "bg-card border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">
                              {formatPBValue(entry)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(entryDate), "MMMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {pbHistory.length === 0 && !pb && (
                <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    No history available
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

