/**
 * Normalizes an exercise name for consistent matching.
 * This ensures that "Bench Press", "bench press", and "Bench Press " all match.
 * 
 * @param exerciseName - The exercise name to normalize
 * @returns The normalized exercise name (lowercase, trimmed)
 */
export function normalizeExerciseName(exerciseName: string): string {
  if (!exerciseName) return ''
  return exerciseName.trim().toLowerCase()
}

/**
 * Extracts the exercise name from an exercise string.
 * Uses the same parsing logic as parseExercise in workout-detail-view.
 * 
 * @param exerciseStr - The full exercise string (e.g., "Bench Press 3x8-10 @ 50kg - notes")
 * @returns The extracted exercise name
 */
export function extractExerciseName(exerciseStr: string): string {
  if (!exerciseStr || !exerciseStr.trim()) {
    return ''
  }

  const parts = exerciseStr.split(' - ')
  let mainPart = parts[0].trim()
  
  // Remove weight (same regex as parseExercise)
  const weightMatch = mainPart.match(/@\s*([^-]+?)(?:\s*-\s*|$)/)
  if (weightMatch) {
    mainPart = mainPart.replace(/@\s*[^-]+?(\s*-\s*|$)/, '').trim()
  }
  
  // Remove sets/reps (same regex as parseExercise)
  const setsRepsMatch = mainPart.match(/(\d+)x([\d-]+)(s)?/)
  if (setsRepsMatch) {
    mainPart = mainPart.replace(/\d+x[\d-]+s?/, '').trim()
  }
  
  return mainPart.trim()
}

/**
 * Extracts and normalizes an exercise name from an exercise string.
 * 
 * @param exerciseStr - The full exercise string
 * @returns The normalized exercise name
 */
export function extractAndNormalizeExerciseName(exerciseStr: string): string {
  return normalizeExerciseName(extractExerciseName(exerciseStr))
}

