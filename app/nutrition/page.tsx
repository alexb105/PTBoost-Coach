import { NutritionTracker } from "@/components/nutrition-tracker"
import { ClientHeader } from "@/components/client-header"

export default function NutritionPage() {
  return (
    <main className="min-h-screen" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      <ClientHeader />
      <NutritionTracker />
    </main>
  )
}
