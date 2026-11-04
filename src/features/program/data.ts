// البرنامج اليومي والوحدة التدريبية — data access (training.sessions; docs/migrations/2026-11-04-training-assessment-sessions.sql).
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export type SessionStatus = "planned" | "done" | "cancelled"
export interface Block { phase: string; drill_id: string; min: number }
export interface Session {
  id: string; org_id: string; team_id: string | null; session_on: string; starts_at: string | null
  title: string; goal: string | null; blocks: Block[]; status: SessionStatus; notes: string | null; is_active: boolean
}
export type SessionInput = Omit<Session, "id" | "is_active">
export type LoadError = "missing" | "other" | null

const db = (): ReturnType<typeof supabase.schema> => supabase.schema("training")
const COLS = "id,org_id,team_id,session_on,starts_at,title,goal,blocks,status,notes,is_active"
const NO_ROWS = "رفضت قاعدة البيانات العملية؛ فهذا الحساب لا يملك هذه الصلاحية."
const MISSING: ReadonlySet<string> = new Set(["PGRST205", "42P01"])

function outcome(r: { data: unknown[] | null; error: { message: string } | null }): string | null {
  if (r.error) return r.error.message
  return r.data?.length ? null : NO_ROWS
}

export function useSessions(): { sessions: Session[] | null; error: LoadError; reload: () => void } {
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [error, setError] = useState<LoadError>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => {
      const r = await db().from("sessions").select(COLS).eq("is_active", true).order("session_on").order("starts_at")
      if (!alive) return
      if (r.error) { setError(MISSING.has(r.error.code ?? "") ? "missing" : "other"); return }
      setSessions((r.data ?? []) as Session[]); setError(null)
    }
    void run()
    return () => { alive = false }
  }, [tick])
  return { sessions, error, reload: useCallback(() => setTick((n) => n + 1), []) }
}

export async function saveSession(v: SessionInput, id?: string): Promise<string | null> {
  const q = id ? db().from("sessions").update(v).eq("id", id) : db().from("sessions").insert(v)
  return outcome(await q.select("id"))
}

export async function setSessionStatus(id: string, status: SessionStatus): Promise<string | null> {
  return outcome(await db().from("sessions").update({ status }).eq("id", id).select("id"))
}

export async function archiveSession(id: string): Promise<string | null> {
  return outcome(await db().from("sessions").update({ is_active: false }).eq("id", id).select("id"))
}
