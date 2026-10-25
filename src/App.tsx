import { Suspense, lazy, useEffect, useState } from "react"
import { AuthGate } from "@/features/auth/AuthGate"
import { AccessGranted } from "@/features/home/AccessGranted"
import { supabase } from "@/lib/supabase"
import type { AccessApi } from "@/features/auth/useAccess"

// Loaded only for the owner, so other members never download the admin bundle.
const AdminDashboard = lazy(async () => ({ default: (await import("@/features/admin/AdminDashboard")).AdminDashboard }))

/** The owner lands on لوحة المدير; everyone else on their home screen (Daily Program — in progress). */
function Home({ access }: { access: AccessApi }): React.JSX.Element {
  const [owner, setOwner] = useState<boolean | null>(null)
  useEffect(() => {
    const run = async (): Promise<void> => { const { data } = await supabase.rpc("is_owner"); setOwner(data === true) }
    void run()
  }, [])
  if (owner === null) return <main className="min-h-dvh grid place-items-center opacity-60">…</main>
  const wait = <main className="min-h-dvh grid place-items-center opacity-60">…</main>
  return owner ? <Suspense fallback={wait}><AdminDashboard /></Suspense> : <AccessGranted access={access} />
}

export default function App(): React.JSX.Element {
  return <AuthGate>{(access) => <Home access={access} />}</AuthGate>
}
