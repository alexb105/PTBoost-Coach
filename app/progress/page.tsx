import { ProgressTracker } from "@/components/progress-tracker"
import { ClientHeader } from "@/components/client-header"

export default function ProgressPage() {
  return (
    <main className="min-h-screen pb-20">
      <ClientHeader />
      <ProgressTracker />
    </main>
  )
}
