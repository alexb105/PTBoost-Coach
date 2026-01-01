"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Shield, Plus, Loader2, Edit, Trash2, Dumbbell } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Exercise {
  id: string
  name: string
  display_name: string
  created_at: string
  updated_at: string
}

export default function ExercisesPage() {
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null)
  const [exerciseForm, setExerciseForm] = useState({
    name: "",
    display_name: "",
  })

  // Check admin session
  useEffect(() => {
    checkAdminSession()
    fetchExercises()
  }, [])

  const checkAdminSession = async () => {
    try {
      const response = await fetch("/api/auth/admin/check")
      if (!response.ok) {
        router.push("/auth/admin")
      }
    } catch (error) {
      router.push("/auth/admin")
    }
  }

  const fetchExercises = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/exercises")
      
      if (!response.ok) {
        throw new Error("Failed to fetch exercises")
      }

      const data = await response.json()
      setExercises(data.exercises || [])
    } catch (error) {
      console.error("Error fetching exercises:", error)
      toast.error("Failed to load exercises")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingExercise
        ? `/api/admin/exercises/${editingExercise.id}`
        : "/api/admin/exercises"
      
      const method = editingExercise ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: exerciseForm.name,
          display_name: exerciseForm.display_name || exerciseForm.name,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save exercise")
      }

      toast.success(editingExercise ? "Exercise updated successfully" : "Exercise created successfully")
      setIsDialogOpen(false)
      setEditingExercise(null)
      setExerciseForm({ name: "", display_name: "" })
      fetchExercises()
    } catch (error: any) {
      console.error("Error saving exercise:", error)
      toast.error(error.message || "Failed to save exercise")
    }
  }

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setExerciseForm({
      name: exercise.display_name, // Show display name for editing
      display_name: exercise.display_name,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (exercise: Exercise) => {
    setExerciseToDelete(exercise)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!exerciseToDelete) return

    try {
      const response = await fetch(`/api/admin/exercises/${exerciseToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete exercise")
      }

      toast.success("Exercise deleted successfully")
      setDeleteDialogOpen(false)
      setExerciseToDelete(null)
      fetchExercises()
    } catch (error: any) {
      console.error("Error deleting exercise:", error)
      toast.error(error.message || "Failed to delete exercise")
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingExercise(null)
    setExerciseForm({ name: "", display_name: "" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Exercise Library</h1>
                <p className="text-xs text-muted-foreground">Manage global exercises</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => router.push("/admin")}
            >
              Back to Admin Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Exercises</h2>
            <p className="text-sm text-muted-foreground">
              Manage exercises that can be used across all clients. Each client has their own PB data.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => {
                setEditingExercise(null)
                setExerciseForm({ name: "", display_name: "" })
              }}>
                <Plus className="h-4 w-4" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingExercise ? "Edit Exercise" : "Add New Exercise"}
                </DialogTitle>
                <DialogDescription>
                  {editingExercise 
                    ? "Update the exercise name. This will be shared across all clients."
                    : "Create a new exercise that can be used across all clients."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveExercise} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Exercise Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Bench Press"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be normalized (lowercase) for matching. The display name will be automatically formatted.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name (Optional)</Label>
                  <Input
                    id="display_name"
                    type="text"
                    placeholder="Leave empty to auto-format"
                    value={exerciseForm.display_name}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, display_name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom display name. If empty, the exercise name will be auto-formatted.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingExercise ? "Update" : "Create"} Exercise
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Exercises Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : exercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No exercises yet</p>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Exercise
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Normalized Name</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exercises.map((exercise) => (
                    <TableRow key={exercise.id}>
                      <TableCell className="font-medium">
                        {exercise.display_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {exercise.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(exercise.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(exercise)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(exercise)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{exerciseToDelete?.display_name}"? 
              This action cannot be undone. If this exercise has personal best records, 
              you'll need to delete those first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

