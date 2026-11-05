// Who may open what. Visitors (anyone with the link) browse the open sections with real content;
// member sections open with an invite code from the owner or an annual subscription.
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export type Route = "" | "tour" | "library" | "roles" | "learning" | "tournaments" | "squad"

/** Open to every visitor — real content, nothing private, nothing that writes. */
export const PUBLIC_ROUTES: ReadonlySet<string> = new Set(["tour", "library", "board", "roles", "learning"])
/** "tour#join" → "tour" (the part after a second # is an in-page anchor). */
export const baseRoute = (route: string): string => route.split("#")[0].split("?")[0]
export const isPublic = (route: string): boolean => PUBLIC_ROUTES.has(baseRoute(route))

/** Signed in or not (live). null while the browser is still checking. */
export function useSignedIn(): boolean | null {
  const [on, setOn] = useState<boolean | null>(null)
  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => {
      const { data } = await supabase.auth.getSession()
      if (alive) setOn(!!data.session)
    }
    void run()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setOn(!!s) })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])
  return on
}

/** Marks the page as a visitor visit so shared UI (the side dock) can show member sections as locked. */
export function useVisitorFlag(visitor: boolean): void {
  useEffect(() => {
    const root = document.documentElement
    if (visitor) root.dataset.visitor = ""; else delete root.dataset.visitor
    return () => { delete root.dataset.visitor }
  }, [visitor])
}
