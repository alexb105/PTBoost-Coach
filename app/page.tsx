"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WeekView, type Workout } from "@/components/week-view"
import { WorkoutDetailView, type WorkoutDetail } from "@/components/workout-detail-view"
import { WorkoutSummaryView } from "@/components/workout-summary-view"
import { ClientHeader } from "@/components/client-header"
import { Loader2 } from "lucide-react"
import { parseISO } from "date-fns"

export default function SessionsPage() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDetail | null>(null)

  useEffect(() => {
    fetchWorkouts()
  }, [])

  const fetchWorkouts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/customer/workouts", { credentials: 'include' })
      
      if (response.status === 401) {
        // User is not authenticated, redirect to login
        router.push("/auth/login")
        return
      }
      
      if (!response.ok) {
        throw new Error("Failed to fetch workouts")
      }

      const data = await response.json()
      setWorkouts(data.workouts || [])
    } catch (error) {
      console.error("Error fetching workouts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDayClick = (date: Date, workout?: Workout) => {
    if (workout) {
      // If workout is completed, show summary view; otherwise show detail view
      if (workout.completed) {
        setSelectedWorkout(workout as WorkoutDetail)
      } else {
        setSelectedWorkout(workout as WorkoutDetail)
      }
    }
  }

  const handleCompleteWorkout = async (workoutId: string) => {
    try {
      const response = await fetch(`/api/customer/workouts/${workoutId}/complete`, {
        method: "POST",
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error("Failed to mark workout as complete")
      }

      const data = await response.json()
      
      // Refresh workouts to get updated completion status
      await fetchWorkouts()
      
      // Update selected workout with the data returned from API (includes all fields)
      if (selectedWorkout && selectedWorkout.id === workoutId) {
        setSelectedWorkout({
          ...selectedWorkout,
          ...data.workout,
          completed: true,
          completed_at: data.workout.completed_at || new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Error completing workout:", error)
      throw error
    }
  }

  const handleUncompleteWorkout = async (workoutId: string) => {
    try {
      const response = await fetch(`/api/customer/workouts/${workoutId}/uncomplete`, {
        method: "POST",
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error("Failed to mark workout as incomplete")
      }

      // Refresh workouts to get updated completion status
      await fetchWorkouts()
      
      // Update selected workout if it's the one being uncompleted
      if (selectedWorkout && selectedWorkout.id === workoutId) {
        setSelectedWorkout({
          ...selectedWorkout,
          completed: false,
          completed_at: undefined,
        })
      }
    } catch (error) {
      console.error("Error uncompleting workout:", error)
      throw error
    }
  }

  const handleExerciseComplete = async (workoutId: string, exerciseIndex: number, rating: "easy" | "good" | "hard" | "too_hard", bestSet?: { reps?: string; weight?: string; seconds?: string; duration_minutes?: string; distance_km?: string; intensity?: string }) => {
    try {
      const response = await fetch(`/api/customer/workouts/${workoutId}/exercises/${exerciseIndex}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, bestSet }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error("Failed to complete exercise")
      }

      const data = await response.json()
      
      // Use the workout data returned from the API (fresh from database)
      if (data.workout) {
        // Update selected workout with fresh data from database
        if (selectedWorkout && selectedWorkout.id === workoutId) {
          setSelectedWorkout(data.workout)
        }
        
        // Also refresh workouts list to ensure consistency
        await fetchWorkouts()
      } else {
        // Fallback: refresh workouts list to get latest data
        await fetchWorkouts()
        
        // Update selected workout from refreshed list
        if (selectedWorkout && selectedWorkout.id === workoutId) {
          const refreshedWorkouts = await fetch("/api/customer/workouts", { credentials: 'include' }).then(r => r.json())
          const updatedWorkout = refreshedWorkouts.workouts?.find((w: any) => w.id === workoutId)
          if (updatedWorkout) {
            setSelectedWorkout(updatedWorkout)
          }
        }
      }
    } catch (error) {
      console.error("Error completing exercise:", error)
      throw error
    }
  }

  const handleExerciseUncomplete = async (workoutId: string, exerciseIndex: number) => {
    try {
      const response = await fetch(`/api/customer/workouts/${workoutId}/exercises/${exerciseIndex}/uncomplete`, {
        method: "POST",
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error("Failed to uncomplete exercise")
      }

      const data = await response.json()
      
      // Use the workout data returned from the API (fresh from database)
      if (data.workout) {
        // Update selected workout with fresh data from database
        if (selectedWorkout && selectedWorkout.id === workoutId) {
          setSelectedWorkout(data.workout)
        }
        
        // Also refresh workouts list to ensure consistency
        await fetchWorkouts()
      } else {
        // Fallback: refresh workouts list to get latest data
        await fetchWorkouts()
        
        // Update selected workout from refreshed list
        if (selectedWorkout && selectedWorkout.id === workoutId) {
          const refreshedWorkouts = await fetch("/api/customer/workouts", { credentials: 'include' }).then(r => r.json())
          const updatedWorkout = refreshedWorkouts.workouts?.find((w: any) => w.id === workoutId)
          if (updatedWorkout) {
            setSelectedWorkout(updatedWorkout)
          }
        }
      }
    } catch (error) {
      console.error("Error uncompleting exercise:", error)
      throw error
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center pb-safe" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    )
  }

  if (selectedWorkout) {
    // Show summary view for completed workouts, detail view for incomplete ones
    if (selectedWorkout.completed) {
      return (
        <main className="min-h-screen" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
          <ClientHeader />
          <WorkoutSummaryView
            workout={selectedWorkout}
            onBack={() => setSelectedWorkout(null)}
          />
        </main>
      )
    }
    
    return (
      <main className="min-h-screen" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
        <ClientHeader />
        <WorkoutDetailView
          workout={selectedWorkout}
          onBack={() => setSelectedWorkout(null)}
          onComplete={handleCompleteWorkout}
          onUncomplete={handleUncompleteWorkout}
          onExerciseComplete={handleExerciseComplete}
          onExerciseUncomplete={handleExerciseUncomplete}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      <ClientHeader />
      <WeekView 
        workouts={workouts} 
        canEdit={false}
        onDayClick={handleDayClick}
      />
    </main>
  )
}
