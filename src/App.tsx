import { Suspense, lazy, useEffect, useState } from "react"
import { AuthGate } from "@/features/auth/AuthGate"
import { AccessGranted } from "@/features/home/AccessGranted"
import type { AccessApi } from "@/features/auth/useAccess"
import { supabase } from "@/lib/supabase"

// Each screen loads only when opened, so nobody downloads what they don't use.
const AdminDashboard = lazy(async () => ({ default: (await import("@/features/admin/AdminDashboard")).AdminDashboard }))
const LibraryScreen = lazy(async () => ({ default: (await import("@/features/library/LibraryScreen")).LibraryScreen }))
const RolesScreen = lazy(async () => ({ default: (await import("@/features/roles/RolesScreen")).RolesScreen }))
const SquadScreen = lazy(async () => ({ default: (await import("@/features/squad/SquadScreen")).SquadScreen }))

/** Simple hash routes: "#/" = home (لوحة المدير for the owner), "#/squad" = الفرق واللاعبين, "#/library" = المكتبة, "#/roles" = المراكز والأدوار. */
function useRoute(): string {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const on = (): void => { setHash(window.location.hash); window.scrollTo({ top: 0 }) }
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  return hash.replace(/^#\/?/, "")
}

function Home({ access }: { access: AccessApi }): React.JSX.Element {
  const [owner, setOwner] = useState<boolean | null>(null)
  const route = useRoute()
  useEffect(() => {
    const run = async (): Promise<void> => { const { data } = await supabase.rpc("is_owner"); setOwner(data === true) }
    void run()
  }, [])
  const wait = <main className="min-h-dvh grid place-items-center opacity-60">…</main>
  if (owner === null) return wait
  if (!owner) return <AccessGranted access={access} />
  return <Suspense fallback={wait}>{route === "squad" ? <SquadScreen /> : route === "library" ? <LibraryScreen /> : route === "roles" ? <RolesScreen /> : <AdminDashboard />}</Suspense>
}

export default function App(): React.JSX.Element {
  return <AuthGate>{(access) => <Home access={access} />}</AuthGate>
}
