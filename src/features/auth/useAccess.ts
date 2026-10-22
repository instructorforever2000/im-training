import { useCallback, useEffect, useRef, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { PLATFORM_ID, appUrl, supabase } from "@/lib/supabase"
import { T } from "./strings"

export type Phase = "loading" | "signedOut" | "needInvite" | "pending" | "suspended" | "granted" | "error"

export interface Membership {
  role: string
  status: "pending" | "approved" | "suspended"
  orgNameAr: string | null
  orgNameEn: string | null
}

export interface AccessState {
  phase: Phase
  session: Session | null
  membership: Membership | null
}

export interface AccessApi extends AccessState {
  signInGoogle: () => Promise<string | null>
  signInEmail: (email: string) => Promise<string | null>
  redeem: (code: string) => Promise<string | null>
  signOut: () => Promise<void>
  retry: () => void
}

interface MembershipRow { role: string; status: Membership["status"]; org_id: string }
interface OrgRow { name_ar: string | null; name_en: string | null }

const DEV_PREVIEW = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("preview") : null

async function resolve(session: Session): Promise<{ phase: Phase; membership: Membership | null }> {
  const { data: rows, error } = await supabase
    .from("memberships")
    .select("role,status,org_id")
    .eq("platform_id", PLATFORM_ID)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
  if (error) throw error
  const row = (rows as MembershipRow[] | null)?.[0]
  if (!row) {
    // The platform owner has access without a membership row.
    const { data: ok } = await supabase.rpc("has_platform_access", { p_platform: PLATFORM_ID })
    return ok === true ? { phase: "granted", membership: null } : { phase: "needInvite", membership: null }
  }
  const { data: org } = await supabase.from("organizations").select("name_ar,name_en").eq("id", row.org_id).maybeSingle()
  const o = org as OrgRow | null
  const membership: Membership = { role: row.role, status: row.status, orgNameAr: o?.name_ar ?? null, orgNameEn: o?.name_en ?? null }
  const phase: Phase = row.status === "approved" ? "granted" : row.status === "suspended" ? "suspended" : "pending"
  return { phase, membership }
}

export function useAccess(): AccessApi {
  const [state, setState] = useState<AccessState>({ phase: "loading", session: null, membership: null })
  const [tick, setTick] = useState(0)
  const phaseRef = useRef<Phase>("loading")
  phaseRef.current = state.phase

  const refresh = useCallback(async (session: Session | null): Promise<void> => {
    if (!session) {
      setState({ phase: "signedOut", session: null, membership: null })
      return
    }
    try {
      const r = await resolve(session)
      setState({ phase: r.phase, session, membership: r.membership })
    } catch {
      setState({ phase: "error", session, membership: null })
    }
  }, [])

  useEffect(() => {
    if (DEV_PREVIEW) return
    let alive = true
    void supabase.auth.getSession().then(({ data }) => { if (alive) void refresh(data.session) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return
      void refresh(session)
    })
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [refresh, tick])

  // While waiting for approval, re-check every 12 s and when the tab becomes visible again.
  useEffect(() => {
    if (DEV_PREVIEW || state.phase !== "pending") return
    const check = (): void => { void refresh(state.session) }
    const id = window.setInterval(check, 12000)
    const vis = (): void => { if (document.visibilityState === "visible") check() }
    document.addEventListener("visibilitychange", vis)
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", vis) }
  }, [state.phase, state.session, refresh])

  const signInGoogle = useCallback(async (): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: appUrl() } })
    return error ? T.genericError : null
  }, [])

  const signInEmail = useCallback(async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: appUrl() } })
    return error ? T.genericError : null
  }, [])

  const redeem = useCallback(async (code: string): Promise<string | null> => {
    const { error } = await supabase.rpc("redeem_invite", { p_code: code })
    if (error) {
      if (error.code === "42501") return T.inviteSignIn
      if (error.code === "P0002") return T.inviteInvalid
      return T.genericError
    }
    await refresh(state.session)
    return null
  }, [refresh, state.session])

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
    setState({ phase: "signedOut", session: null, membership: null })
  }, [])

  const retry = useCallback((): void => { setState((s) => ({ ...s, phase: "loading" })); setTick((n) => n + 1) }, [])

  if (DEV_PREVIEW) {
    const phase = (["signedOut", "needInvite", "pending", "suspended", "loading", "error"].includes(DEV_PREVIEW) ? DEV_PREVIEW : "signedOut") as Phase
    return { phase, session: null, membership: null, signInGoogle, signInEmail, redeem: async () => T.inviteInvalid, signOut, retry }
  }
  return { ...state, signInGoogle, signInEmail, redeem, signOut, retry }
}
