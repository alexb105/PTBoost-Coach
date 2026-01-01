import { ProgressTracker } from "@/components/progress-tracker"
import { ClientHeader } from "@/components/client-header"

export default function ProgressPage() {
  return (
    <main className="min-h-screen" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
      <ClientHeader />
      <ProgressTracker />
    </main>
  )
}
