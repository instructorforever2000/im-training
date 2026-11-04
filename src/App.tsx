import { Suspense, lazy, useEffect, useState } from "react"
import { AuthGate } from "@/features/auth/AuthGate"
import { AccessGranted } from "@/features/home/AccessGranted"
import type { AccessApi } from "@/features/auth/useAccess"
import { supabase } from "@/lib/supabase"
import { baseRoute, isPublic, useSignedIn, useVisitorFlag } from "@/features/visitor/access"
import { TourScreen, VisitorBar } from "@/features/visitor/TourScreen"

// Each screen loads only when opened, so nobody downloads what they don't use.
const AdminDashboard = lazy(async () => ({ default: (await import("@/features/admin/AdminDashboard")).AdminDashboard }))
const LibraryScreen = lazy(async () => ({ default: (await import("@/features/library/LibraryScreen")).LibraryScreen }))
const RolesScreen = lazy(async () => ({ default: (await import("@/features/roles/RolesScreen")).RolesScreen }))
const TournamentsScreen = lazy(async () => ({ default: (await import("@/features/tournaments/TournamentsScreen")).TournamentsScreen }))
const LearningScreen = lazy(async () => ({ default: (await import("@/features/learning/LearningScreen")).LearningScreen }))
const AssessmentScreen = lazy(async () => ({ default: (await import("@/features/assessment/AssessmentScreen")).AssessmentScreen }))
const ProgramScreen = lazy(async () => ({ default: (await import("@/features/program/ProgramScreen")).ProgramScreen }))
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

/** Approved members (coach, player, viewer…): the field screens; the owner's command centre stays the owner's.
 *  What each person may change is enforced by the database (row-level security), per role and organisation. */
const MEMBER_SCREENS: Record<string, () => React.JSX.Element> = {
  program: () => <ProgramScreen />, assessment: () => <AssessmentScreen />, tournaments: () => <TournamentsScreen />, squad: () => <SquadScreen />,
  library: () => <LibraryScreen />, roles: () => <RolesScreen />, learning: () => <LearningScreen />, tour: () => <TourScreen />,
}
function MemberArea({ route, access }: { route: string; access: AccessApi }): React.JSX.Element {
  useEffect(() => { document.documentElement.dataset.member = ""; return () => { delete document.documentElement.dataset.member } }, [])
  const key = baseRoute(route)
  if (key === "welcome") return <AccessGranted access={access} />
  const screen = MEMBER_SCREENS[key] ?? MEMBER_SCREENS.program
  return <Suspense fallback={<main className="min-h-dvh grid place-items-center opacity-60">…</main>}>{screen()}</Suspense>
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
  if (!owner) return <MemberArea route={route} access={access} />
  return <Suspense fallback={wait}>{route === "squad" ? <SquadScreen /> : route === "library" ? <LibraryScreen /> : route === "roles" ? <RolesScreen /> : route === "tournaments" ? <TournamentsScreen /> : route === "learning" ? <LearningScreen /> : route === "assessment" ? <AssessmentScreen /> : route === "program" ? <ProgramScreen /> : baseRoute(route) === "tour" ? <TourScreen /> : <AdminDashboard />}</Suspense>
}

/** Open sections for anyone with the link (visitor strip on top); everything else goes through sign-in. */
function OpenSection({ route, visitor }: { route: string; visitor: boolean }): React.JSX.Element {
  useVisitorFlag(visitor)
  const wait = <main className="min-h-dvh grid place-items-center opacity-60">…</main>
  const screen: Record<string, React.JSX.Element> = { tour: <TourScreen />, library: <LibraryScreen />, roles: <RolesScreen />, learning: <LearningScreen /> }
  const key = baseRoute(route)
  return <>{visitor && key !== "tour" && <VisitorBar />}<Suspense fallback={wait}>{screen[key] ?? <TourScreen />}</Suspense></>
}

export default function App(): React.JSX.Element {
  const route = useRoute()
  const signedIn = useSignedIn()
  if (isPublic(route) && signedIn === false) return <OpenSection route={route} visitor />
  return <AuthGate>{(access) => <Home access={access} />}</AuthGate>
}
