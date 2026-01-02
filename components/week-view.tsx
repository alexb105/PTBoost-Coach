"use client"

import { useState } from "react"
import { Calendar, ChevronRight, CheckCircle2, Pencil, Moon, ChevronLeft } from "lucide-react"
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
  is_rest_day?: boolean
}

interface WeekViewProps {
  workouts?: Workout[]
  canEdit?: boolean
  onDayClick?: (date: Date, workout?: Workout) => void
  onEditWorkout?: (workout: Workout) => void
  onToggleRestDay?: (date: Date, isRestDay: boolean) => void
}

export function WeekView({ workouts = [], canEdit = false, onDayClick, onEditWorkout, onToggleRestDay }: WeekViewProps) {
  const { t } = useLanguage()
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, -1 = previous week, 1 = next week
  
  // Get the week to display based on offset
  const today = new Date()
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday
  const weekStart = addDays(currentWeekStart, weekOffset * 7)
  const weekEnd = addDays(weekStart, 6) // Sunday
  
  const isCurrentWeek = weekOffset === 0

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
      if (workout.is_rest_day) {
        status = "rest"
        statusText = "Rest Day"
      } else if (workout.completed) {
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

  const handlePreviousWeek = () => {
    setWeekOffset(prev => prev - 1)
  }

  const handleNextWeek = () => {
    setWeekOffset(prev => prev + 1)
  }

  const handleToday = () => {
    setWeekOffset(0)
  }

  // Get relative week label
  const getWeekLabel = () => {
    if (weekOffset === 0) return "This Week"
    if (weekOffset === -1) return "Last Week"
    if (weekOffset === 1) return "Next Week"
    if (weekOffset < 0) return `${Math.abs(weekOffset)} Weeks Ago`
    return `In ${weekOffset} Weeks`
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-8">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 shadow-sm">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("workouts.yourWeek")}</h1>
                {isCurrentWeek && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    Current
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 text-sm font-medium text-foreground">{weekRange}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {getWeekLabel()} • {t("workouts.tapToViewDetails")}
              </p>
            </div>
          </div>
        </div>
        
        {/* Week Navigation - Compact Design */}
        <div className="flex items-center justify-center gap-2 bg-card/50 rounded-lg p-2 border border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousWeek}
            className="h-9 px-3 gap-1.5 hover:bg-background"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Prev</span>
          </Button>
          
          <div className="flex-1 flex items-center justify-center min-w-0">
            {!isCurrentWeek ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-9 px-4 text-sm font-medium hover:bg-background"
              >
                Jump to Today
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground px-4 py-2">
                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </span>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextWeek}
            className="h-9 px-3 gap-1.5 hover:bg-background"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
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
              day.status === "rest"
                ? "border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-500/10 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20"
                : day.status === "completed"
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
                  {day.status === "rest" && (
                    <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 px-3 py-0.5 text-xs font-medium">
                      Rest Day
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
                {canEdit && onToggleRestDay && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleRestDay(day.date, day.status === "rest")
                    }}
                    className={`h-8 w-8 ${day.status === "rest" ? "text-blue-500 hover:text-blue-600" : "text-muted-foreground hover:text-foreground"}`}
                    title={day.status === "rest" ? "Remove Rest Day" : "Mark as Rest Day"}
                  >
                    <Moon className="h-4 w-4" />
                  </Button>
                )}
                {canEdit && day.workout && !day.workout.is_rest_day && !day.workout.completed && onEditWorkout && (
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
