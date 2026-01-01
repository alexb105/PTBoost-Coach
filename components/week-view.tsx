"use client"

import { Calendar, ChevronRight, CheckCircle2, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format, startOfWeek, addDays, isToday, isSameDay, parseISO } from "date-fns"
import { useLanguage } from "@/contexts/language-context"

export interface Workout {
  id: string
  title: string
  description?: string
  date: string
  exercises?: string[]
  completed?: boolean
  completed_at?: string
}

interface WeekViewProps {
  workouts?: Workout[]
  canEdit?: boolean
  onDayClick?: (date: Date, workout?: Workout) => void
  onEditWorkout?: (workout: Workout) => void
}

export function WeekView({ workouts = [], canEdit = false, onDayClick, onEditWorkout }: WeekViewProps) {
  const { t } = useLanguage()
  
  // Get current week (Monday to Sunday)
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
  const weekEnd = addDays(weekStart, 6) // Sunday

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    const dateStr = format(date, "yyyy-MM-dd")
    const workout = workouts.find((w) => {
      const workoutDate = parseISO(w.date)
      return isSameDay(workoutDate, date)
    })

    const dayName = format(date, "EEEE")
    const dayDate = format(date, "MMM d")
    const isTodayDate = isToday(date)

    let status: "rest" | "today" | "planned" | "completed" = "planned"
    let statusText = t("workouts.planAhead")

    if (workout) {
      if (workout.completed) {
        status = "completed"
        statusText = workout.title
      } else {
        status = isTodayDate ? "today" : "planned"
        statusText = workout.title
      }
    } else if (isTodayDate) {
      status = "today"
      statusText = canEdit ? t("workouts.tapToAdd") : t("workouts.noWorkoutScheduled")
    }

    return {
      date,
      dateStr,
      day: dayName,
      dayDate,
      status,
      statusText,
      workout,
      isToday: isTodayDate,
    }
  })

  const weekRange = `${format(weekStart, "MMMM d")} — ${format(weekEnd, "MMMM d, yyyy")}`

  const handleDayClick = (day: typeof weekDays[0]) => {
    if (onDayClick) {
      onDayClick(day.date, day.workout)
    }
  }

  const handleEditClick = (e: React.MouseEvent, workout: Workout) => {
    e.stopPropagation() // Prevent card click
    if (onEditWorkout) {
      onEditWorkout(workout)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 shadow-sm">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("workouts.yourWeek")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{weekRange}</p>
          <p className="mt-2 text-xs text-muted-foreground/80">
            {t("workouts.tapToViewDetails")}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {weekDays.map((day, index) => (
          <Card
            key={index}
            onClick={() => {
              if (canEdit || day.workout) {
                handleDayClick(day)
              }
            }}
            className={`group transition-all duration-300 touch-manipulation ${
              canEdit || (day.workout && !canEdit) ? "cursor-pointer hover:scale-[1.01] active:scale-[0.99]" : ""
            } ${
              day.status === "completed"
                ? "border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10 shadow-lg shadow-green-500/10 ring-1 ring-green-500/20"
                : day.status === "today"
                ? "border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                : "border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 hover:shadow-md"
            }`}
          >
            <div className="flex items-center justify-between p-5">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium tracking-tight text-foreground">
                    {day.day}, {day.dayDate}
                  </h3>
                  {day.isToday && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/90 px-3 py-0.5 text-xs font-medium tracking-wide text-primary-foreground shadow-sm"
                    >
                      TODAY
                    </Badge>
                  )}
                  {day.status === "completed" && (
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30 px-3 py-0.5 text-xs font-medium">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-sm tracking-wide text-muted-foreground">{day.statusText}</p>
                {day.workout?.description && (
                  <p className="mt-1 text-xs text-muted-foreground/80 line-clamp-1">{day.workout.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canEdit && day.workout && onEditWorkout && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleEditClick(e, day.workout!)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Edit Workout"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {(canEdit || (day.workout && !canEdit)) && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
