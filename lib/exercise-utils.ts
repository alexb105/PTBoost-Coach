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
 * @param exerciseStr - The full exercise string (e.g., "Bench Press 3x8-10 @ 50kg - notes" or "[CARDIO] Running | 30min | 5km | moderate")
 * @returns The extracted exercise name
 */
export function extractExerciseName(exerciseStr: string): string {
  if (!exerciseStr || !exerciseStr.trim()) {
    return ''
  }

  // Handle cardio format: "[CARDIO] Exercise Name | 30min | 5km | Moderate - Notes"
  if (exerciseStr.startsWith('[CARDIO]')) {
    const cardioStr = exerciseStr.replace('[CARDIO]', '').trim()
    
    // Split by " - " to separate notes
    const parts = cardioStr.split(' - ')
    const mainPart = parts[0].trim()
    
    // Split by " | " to get name and cardio details
    const segments = mainPart.split(' | ')
    // First segment is the exercise name
    return segments[0].trim()
  }

  // Handle old cardio format: "Exercise Name - Duration: 30min, Distance: 5.0km, Intensity: Moderate - Notes"
  if (exerciseStr.includes('Duration:') || exerciseStr.includes('Distance:') || exerciseStr.includes('Intensity:')) {
    const parts = exerciseStr.split(' - ')
    // First part is the exercise name
    return parts[0].trim()
  }

  // Handle sets-based format: "Exercise Name 3x8-10 @ 50kg - notes"
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

