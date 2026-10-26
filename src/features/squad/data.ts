// الفرق واللاعبين — data access. Tables live in the "training" schema of the shared parent
// project (RLS: owner + the org's coaching staff; no deletes — suspend instead).
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import cfg from "./squad-config.json"

export type Gender = "m" | "f" | "x"
export type PlayerStatus = "ready" | "limited" | "injured" | "absent"
export type Foot = "R" | "L" | "B"

export interface Team {
  id: string; org_id: string; name: string; sport: string; gender: Gender; age_group: string | null
  grade_from: number | null; grade_to: number | null; play_format: string | null; color: string; is_active: boolean; created_at: string
}
export interface Player {
  id: string; org_id: string; team_id: string; full_name: string; shirt_number: number | null; position: string | null
  birth_date: string | null; strong_foot: Foot | null; height_cm: number | null; weight_kg: number | null
  status: PlayerStatus; guardian_consent_on: string | null; coach_notes: string | null; is_active: boolean; created_at: string
}
export interface OrgLite { id: string; name_ar: string | null; org_type: string }

export type TeamInput = Omit<Team, "id" | "created_at" | "is_active">
export type PlayerInput = Omit<Player, "id" | "created_at" | "is_active">

const db = (): ReturnType<typeof supabase.schema> => supabase.schema("training")
const TEAM_COLS = "id,org_id,name,sport,gender,age_group,grade_from,grade_to,play_format,color,is_active,created_at"
const PLAYER_COLS = "id,org_id,team_id,full_name,shirt_number,position,birth_date,strong_foot,height_cm,weight_kg,status,guardian_consent_on,coach_notes,is_active,created_at"
const NO_ROWS = "قاعدة البيانات رفضت العملية — الحساب ده مالوش الصلاحية دي."
/** PostgREST answers this when the "training" schema is not exposed in the Data API settings yet. */
const SCHEMA_HIDDEN = "PGRST106"

export type LoadError = "schema" | "other" | null

export interface SquadData { orgs: OrgLite[]; teams: Team[]; players: Player[] }

async function load(): Promise<SquadData> {
  const [o, t, p] = await Promise.all([
    supabase.from("organizations").select("id,name_ar,org_type").eq("is_active", true).order("created_at"),
    db().from("teams").select(TEAM_COLS).order("created_at"),
    db().from("players").select(PLAYER_COLS).order("shirt_number"),
  ])
  const failed = [o, t, p].find((r) => r.error)
  if (failed?.error) throw failed.error
  return { orgs: (o.data ?? []) as OrgLite[], teams: (t.data ?? []) as Team[], players: (p.data ?? []) as Player[] }
}

export function useSquadData(): { data: SquadData | null; error: LoadError; reload: () => void } {
  const [data, setData] = useState<SquadData | null>(null)
  const [error, setError] = useState<LoadError>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => {
      try {
        const d = await load()
        if (alive) { setData(d); setError(null) }
      } catch (e) {
        if (alive) setError((e as { code?: string }).code === SCHEMA_HIDDEN ? "schema" : "other")
      }
    }
    void run()
    return () => { alive = false }
  }, [tick])
  return { data, error, reload: useCallback(() => setTick((n) => n + 1), []) }
}

const done = (r: { data: unknown[] | null; error: { message: string } | null }): string | null => {
  if (r.error) return r.error.message
  return r.data?.length ? null : NO_ROWS
}

export async function saveTeam(v: TeamInput, id?: string): Promise<string | null> {
  const q = id ? db().from("teams").update(v).eq("id", id) : db().from("teams").insert(v)
  return done(await q.select("id"))
}

export async function setTeamActive(id: string, active: boolean): Promise<string | null> {
  return done(await db().from("teams").update({ is_active: active }).eq("id", id).select("id"))
}

export async function savePlayer(v: PlayerInput, id?: string): Promise<string | null> {
  const q = id ? db().from("players").update(v).eq("id", id) : db().from("players").insert(v)
  return done(await q.select("id"))
}

export async function setPlayerActive(id: string, active: boolean): Promise<string | null> {
  return done(await db().from("players").update({ is_active: active }).eq("id", id).select("id"))
}

export async function addPlayers(rows: PlayerInput[]): Promise<string | null> {
  return done(await db().from("players").insert(rows).select("id"))
}

// ---------- pure helpers ----------
export interface Position { code: string; ar: string; en: string }
export const positionsFor = (sport: string): Position[] => {
  const set = (cfg.sportSet as Record<string, string>)[sport]
  return set ? (cfg.positions as Record<string, Position[]>)[set] : []
}

const DAYS_PER_YEAR = 365.25
const DAY_MS = 86_400_000
const MS_YEAR = DAYS_PER_YEAR * DAY_MS
export const ageOf = (birth: string | null): number | null => (birth ? Math.floor((Date.now() - Date.parse(birth)) / MS_YEAR) : null)

// Line breaks: matches "\n" and "\r\n"; rejects a plain space " ". https://regex101.com/?regex=%5Cr%3F%5Cn
const LINE_BREAK = /\r?\n/
// Cell separators from Excel/CSV: matches a tab "\t", "," ";" or "|"; rejects a space " ". https://regex101.com/?regex=%5Ct%7C%2C%7C%3B%7C%5C%7C
const CELL_SEP = /\t|,|;|\|/
// Birth date as YYYY-MM-DD: matches "2012-05-30"; rejects "30/05/2012". https://regex101.com/?regex=%5E%5Cd%7B4%7D-%5Cd%7B2%7D-%5Cd%7B2%7D%24
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Paste from Excel: one player per line — name, number, position, birth date (tab/comma/semicolon). */
export function parseRoster(text: string, sport: string): { full_name: string; shirt_number: number | null; position: string | null; birth_date: string | null }[] {
  const codes = positionsFor(sport)
  return text.split(LINE_BREAK).map((l) => l.trim()).filter(Boolean).slice(0, cfg.limits.bulkMax).map((line) => {
    const [name = "", num = "", pos = "", dob = ""] = line.split(CELL_SEP).map((s) => s.trim())
    const n = Number.parseInt(num, 10)
    const hit = codes.find((c) => c.code.toLowerCase() === pos.toLowerCase() || c.ar === pos)
    const d = ISO_DATE.test(dob) ? dob : null
    return { full_name: name, shirt_number: Number.isNaN(n) || n > cfg.limits.shirtMax ? null : n, position: hit?.code ?? (pos || null), birth_date: d }
  }).filter((r) => r.full_name)
}
