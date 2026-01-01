"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ExerciseFormItem, type ExerciseFormData } from "@/components/exercise-form-item"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface WorkoutTemplate {
  id: string
  title: string
  description?: string
  exercises?: string[]
  created_at?: string
  updated_at?: string
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [templateForm, setTemplateForm] = useState<{
    title: string
    description: string
    exercises: ExerciseFormData[]
  }>({
    title: "",
    description: "",
    exercises: [],
  })

  useEffect(() => {
    checkAdminSession()
    fetchTemplates()
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

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/workout-templates")
      
      if (!response.ok) {
        throw new Error("Failed to fetch templates")
      }

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  // Helper function to parse exercise string into structured format
  const parseExercise = (exerciseStr: string): ExerciseFormData => {
    if (!exerciseStr || !exerciseStr.trim()) {
      return { name: "", exercise_type: "sets", sets: "", reps: "", type: "reps", weight: "", notes: "" }
    }

    const parts = exerciseStr.split(" - ")
    const notes = parts.length > 1 ? parts[1].trim() : ""
    let mainPart = parts[0].trim()
    
    const weightMatch = mainPart.match(/@\s*([^-]+?)(?:\s*-\s*|$)/)
    let weight = ""
    if (weightMatch) {
      weight = weightMatch[1].trim()
      mainPart = mainPart.replace(/@\s*[^-]+?(\s*-\s*|$)/, "").trim()
    }
    
    // Extract sets and reps/seconds (format: 3x8 or 3x30s)
    const setsRepsMatch = mainPart.match(/(\d+)x([\d-]+)(s)?/)
    let sets = ""
    let reps = ""
    let type: "reps" | "seconds" = "reps"
    if (setsRepsMatch) {
      sets = setsRepsMatch[1]
      reps = setsRepsMatch[2]
      type = setsRepsMatch[3] === "s" ? "seconds" : "reps"
      mainPart = mainPart.replace(/\d+x[\d-]+s?/, "").trim()
    }
    
    const name = mainPart.trim()
    
    return { name, exercise_type: "sets", sets, reps, type, weight, notes }
  }

  const handleCreateClick = () => {
    setEditingTemplate(null)
    setTemplateForm({
      title: "",
      description: "",
      exercises: [{ name: "", exercise_type: "sets", sets: "", reps: "", type: "reps" as const, weight: "", notes: "" }],
    })
    setIsDialogOpen(true)
  }

  const handleEditClick = (template: WorkoutTemplate) => {
    setEditingTemplate(template)
    
    // Parse exercises from stored format
    const parsedExercises = template.exercises && Array.isArray(template.exercises) && template.exercises.length > 0
      ? template.exercises.map(parseExercise)
      : [{ name: "", exercise_type: "sets", sets: "", reps: "", type: "reps" as const, weight: "", notes: "" }]
    
    setTemplateForm({
      title: template.title,
      description: template.description || "",
      exercises: parsedExercises,
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (templateId: string) => {
    setDeleteTemplateId(templateId)
    setIsDeleteDialogOpen(true)
  }

  const addExercise = () => {
    setTemplateForm({
      ...templateForm,
      exercises: [...templateForm.exercises, { name: "", exercise_type: "sets", sets: "", reps: "", type: "reps" as const, weight: "", notes: "" }],
    })
  }

  const removeExercise = (index: number) => {
    setTemplateForm({
      ...templateForm,
      exercises: templateForm.exercises.filter((_, i) => i !== index),
    })
  }

  const updateExercise = (index: number, field: keyof ExerciseFormData, value: string) => {
    const updatedExercises = [...templateForm.exercises]
    updatedExercises[index] = { ...updatedExercises[index], [field]: value }
    setTemplateForm({ ...templateForm, exercises: updatedExercises })
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Format exercises as strings for storage
      const formattedExercises = templateForm.exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => {
          let exerciseStr = ex.name
          if (ex.sets && ex.reps) {
            exerciseStr += ` ${ex.sets}x${ex.reps}${ex.type === "seconds" ? "s" : ""}`
          }
          if (ex.weight) {
            exerciseStr += ` @ ${ex.weight}`
          }
          if (ex.notes) {
            exerciseStr += ` - ${ex.notes}`
          }
          return exerciseStr
        })

      const url = editingTemplate
        ? `/api/admin/workout-templates/${editingTemplate.id}`
        : `/api/admin/workout-templates`
      
      const method = editingTemplate ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: templateForm.title,
          description: templateForm.description,
          exercises: formattedExercises,
        }),
      })

      if (!response.ok) {
        throw new Error(editingTemplate ? "Failed to update template" : "Failed to create template")
      }

      toast.success(editingTemplate ? "Template updated successfully" : "Template created successfully")
      setIsDialogOpen(false)
      setEditingTemplate(null)
      setTemplateForm({
        title: "",
        description: "",
        exercises: [{ name: "", sets: "", reps: "", type: "reps" as const, weight: "", notes: "" }],
      })
      fetchTemplates()
    } catch (error: any) {
      toast.error(error.message || "Failed to save template")
    }
  }

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return

    try {
      const response = await fetch(`/api/admin/workout-templates/${deleteTemplateId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete template")
      }

      toast.success("Template deleted successfully")
      setIsDeleteDialogOpen(false)
      setDeleteTemplateId(null)
      fetchTemplates()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete template")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Workout Templates</h1>
              <p className="text-xs text-muted-foreground">Manage reusable workout templates</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Templates</h2>
            <p className="text-sm text-muted-foreground">Create and manage workout templates</p>
          </div>
          <Button onClick={handleCreateClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No templates yet</p>
              <Button onClick={handleCreateClick} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1">{template.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(template)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(template.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {template.exercises && Array.isArray(template.exercises) && template.exercises.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {template.exercises.length} exercise{template.exercises.length !== 1 ? "s" : ""}
                      </p>
                      <div className="space-y-1">
                        {template.exercises.slice(0, 3).map((exercise, idx) => (
                          <p key={idx} className="text-sm text-muted-foreground truncate">
                            • {exercise}
                          </p>
                        ))}
                        {template.exercises.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{template.exercises.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No exercises</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Template Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Edit Template" : "Create New Template"}</DialogTitle>
              <DialogDescription>
                {editingTemplate ? "Update the workout template" : "Create a reusable workout template"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveTemplate} className="space-y-6">
              {/* Template Information Section */}
              <Card className="p-5">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Template Information</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="template-title">Template Title *</Label>
                    <Input
                      id="template-title"
                      value={templateForm.title}
                      onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                      placeholder="e.g., Upper Body Strength"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                      placeholder="Template description or notes..."
                      rows={3}
                    />
                  </div>
                </div>
              </Card>

              {/* Exercises Section */}
              <Card className="p-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Exercises</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addExercise}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Exercise
                    </Button>
                  </div>

                  {templateForm.exercises.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                      <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-3">No exercises added yet</p>
                      <Button type="button" variant="outline" onClick={addExercise} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add First Exercise
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {templateForm.exercises.map((exercise, index) => (
                        <ExerciseFormItem
                          key={index}
                          exercise={exercise}
                          index={index}
                          onUpdate={updateExercise}
                          onRemove={removeExercise}
                          canRemove={templateForm.exercises.length > 1}
                          idPrefix="template-exercise"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false)
                  setEditingTemplate(null)
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!templateForm.title || templateForm.exercises.every((e) => !e.name.trim())}>
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the template.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}

