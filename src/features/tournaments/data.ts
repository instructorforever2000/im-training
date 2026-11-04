// البطولات — data access. Tables in the "training" schema (docs/migrations/2026-11-04-training-tournaments.sql).
// RLS: owner + the org's training staff read; owner/admin/technical director/coach write. No deletes — archive instead.
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Entry, Match, NewMatch } from "./logic"

export type System = "league" | "knockout" | "mixed" | "ranking"
export type Legs = 1 | 2
export interface Tournament {
  id: string; org_id: string; name: string; sport: string; system: System; legs: Legs
  pts_win: number; pts_draw: number; pts_loss: number; groups_count: number; lower_better: boolean; unit: string | null
  starts_on: string | null; notes: string | null; is_active: boolean; created_at: string
}
export interface EntryRow extends Entry { tournament_id: string; team_id: string | null }
export interface MatchRow extends Match { tournament_id: string; played_on: string | null }
export interface OrgLite { id: string; name_ar: string | null }
export interface TeamLite { id: string; org_id: string; name: string; sport: string; is_active: boolean }
export interface TData { orgs: OrgLite[]; teams: TeamLite[]; tours: Tournament[]; entries: EntryRow[]; matches: MatchRow[] }
export type LoadError = "schema" | "missing" | "other" | null

const db = (): ReturnType<typeof supabase.schema> => supabase.schema("training")
const T_COLS = "id,org_id,name,sport,system,legs,pts_win,pts_draw,pts_loss,groups_count,lower_better,unit,starts_on,notes,is_active,created_at"
const E_COLS = "id,tournament_id,team_id,name,grp,seed,result"
const M_COLS = "id,tournament_id,stage,grp,round,slot,home_id,away_id,home_score,away_score,home_pen,away_pen,played_on"
const NO_ROWS = "رفضت قاعدة البيانات العملية؛ فهذا الحساب لا يملك هذه الصلاحية."
const ISO_DATE_LEN = 10
const ERR_KIND: Record<string, LoadError> = { PGRST106: "schema", PGRST205: "missing", "42P01": "missing" }
/** null when the write changed at least one row, otherwise the reason. */
function outcome(r: { data: unknown[] | null; error: { message: string } | null }): string | null {
  if (r.error) return r.error.message
  return r.data?.length ? null : NO_ROWS
}

async function load(): Promise<TData> {
  const [o, tm, t, e, m] = await Promise.all([
    supabase.from("organizations").select("id,name_ar").eq("is_active", true).order("created_at"),
    db().from("teams").select("id,org_id,name,sport,is_active").order("created_at"),
    db().from("tournaments").select(T_COLS).order("created_at", { ascending: false }),
    db().from("tournament_entries").select(E_COLS).order("seed"),
    db().from("tournament_matches").select(M_COLS).order("round").order("slot"),
  ])
  const failed = [o, tm, t, e, m].find((r) => r.error)
  if (failed?.error) throw failed.error
  return { orgs: (o.data ?? []) as OrgLite[], teams: (tm.data ?? []) as TeamLite[], tours: (t.data ?? []) as Tournament[], entries: (e.data ?? []) as EntryRow[], matches: (m.data ?? []) as MatchRow[] }
}

export function useTData(): { data: TData | null; error: LoadError; reload: () => void } {
  const [data, setData] = useState<TData | null>(null)
  const [error, setError] = useState<LoadError>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => {
      try {
        const d = await load()
        if (alive) { setData(d); setError(null) }
      } catch (e) {
        if (alive) setError(ERR_KIND[(e as { code?: string }).code ?? ""] ?? "other")
      }
    }
    void run()
    return () => { alive = false }
  }, [tick])
  return { data, error, reload: useCallback(() => setTick((n) => n + 1), []) }
}

export interface NewTournament {
  org_id: string; name: string; sport: string; system: System; legs: Legs; pts_win: number; pts_draw: number; pts_loss: number
  groups_count: number; lower_better: boolean; unit: string | null; starts_on: string | null
}
export interface NewEntry { team_id: string | null; name: string; grp: number; seed: number }

/** Creates the tournament, its entries, then the fixtures built from the new entry ids. */
export async function createTournament(t: NewTournament, entries: readonly NewEntry[], fixtures: (ids: string[], rows: EntryRow[]) => NewMatch[]): Promise<{ id?: string; err?: string }> {
  const r = await db().from("tournaments").insert(t).select("id")
  if (r.error || !r.data?.length) return { err: r.error?.message ?? NO_ROWS }
  const id = (r.data[0] as { id: string }).id
  const e = await db().from("tournament_entries").insert(entries.map((x) => ({ ...x, tournament_id: id, org_id: t.org_id }))).select(E_COLS)
  if (e.error || !e.data?.length) return { err: e.error?.message ?? NO_ROWS }
  const rows = (e.data as EntryRow[]).sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0))
  const ms = fixtures(rows.map((x) => x.id), rows)
  if (ms.length) { const err = await addMatches(id, t.org_id, ms); if (err) return { err } }
  return { id }
}

export async function addMatches(tournamentId: string, orgId: string, ms: readonly NewMatch[]): Promise<string | null> {
  const r = await db().from("tournament_matches").insert(ms.map((m) => ({ ...m, tournament_id: tournamentId, org_id: orgId }))).select("id")
  return outcome(r)
}

export async function saveScore(id: string, v: { home_score: number | null; away_score: number | null; home_pen: number | null; away_pen: number | null }): Promise<string | null> {
  const r = await db().from("tournament_matches").update({ ...v, played_on: v.home_score === null ? null : new Date().toISOString().slice(0, ISO_DATE_LEN) }).eq("id", id).select("id")
  return outcome(r)
}

export async function saveResult(id: string, result: number | null): Promise<string | null> {
  const r = await db().from("tournament_entries").update({ result }).eq("id", id).select("id")
  return outcome(r)
}

export async function setTournamentActive(id: string, active: boolean): Promise<string | null> {
  const r = await db().from("tournaments").update({ is_active: active }).eq("id", id).select("id")
  return outcome(r)
}
