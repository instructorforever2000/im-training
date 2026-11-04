// التقييم والحالة البدنية — data access (training schema; docs/migrations/2026-11-04-training-assessment-sessions.sql).
// Results are never overwritten: every test or rating is a new dated row, so the player's progress stays visible.
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { PlayerStatus } from "@/features/squad/data"

export interface FitnessRow { id: string; org_id: string; player_id: string; test_key: string; value: number; measured_on: string; created_at: string }
export interface RatingRow { id: string; org_id: string; player_id: string; skill_id: string; rating: number; rated_on: string; created_at: string }
export interface AData { fitness: FitnessRow[]; ratings: RatingRow[] }
export type LoadError = "missing" | "other" | null

const db = (): ReturnType<typeof supabase.schema> => supabase.schema("training")
const NO_ROWS = "قاعدة البيانات رفضت العملية — الحساب ده مالوش الصلاحية دي."
const MISSING: ReadonlySet<string> = new Set(["PGRST205", "42P01"])

function outcome(r: { data: unknown[] | null; error: { message: string } | null }): string | null {
  if (r.error) return r.error.message
  return r.data?.length ? null : NO_ROWS
}

async function load(): Promise<AData> {
  const [f, r] = await Promise.all([
    db().from("fitness_results").select("id,org_id,player_id,test_key,value,measured_on,created_at").order("measured_on").order("created_at"),
    db().from("skill_ratings").select("id,org_id,player_id,skill_id,rating,rated_on,created_at").order("rated_on").order("created_at"),
  ])
  const failed = [f, r].find((x) => x.error)
  if (failed?.error) throw failed.error
  return { fitness: (f.data ?? []) as FitnessRow[], ratings: (r.data ?? []) as RatingRow[] }
}

export function useAData(): { data: AData | null; error: LoadError; reload: () => void } {
  const [data, setData] = useState<AData | null>(null)
  const [error, setError] = useState<LoadError>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => {
      try {
        const d = await load()
        if (alive) { setData(d); setError(null) }
      } catch (e) {
        if (alive) setError(MISSING.has((e as { code?: string }).code ?? "") ? "missing" : "other")
      }
    }
    void run()
    return () => { alive = false }
  }, [tick])
  return { data, error, reload: useCallback(() => setTick((n) => n + 1), []) }
}

export async function addFitness(orgId: string, playerId: string, testKey: string, value: number, on: string): Promise<string | null> {
  return outcome(await db().from("fitness_results").insert({ org_id: orgId, player_id: playerId, test_key: testKey, value, measured_on: on }).select("id"))
}

export async function addRating(orgId: string, playerId: string, skillId: string, rating: number): Promise<string | null> {
  return outcome(await db().from("skill_ratings").insert({ org_id: orgId, player_id: playerId, skill_id: skillId, rating }).select("id"))
}

export async function setStatus(playerId: string, status: PlayerStatus): Promise<string | null> {
  return outcome(await db().from("players").update({ status }).eq("id", playerId).select("id"))
}

/** Latest row per key (rows arrive oldest → newest). */
export function latestBy<T>(rows: readonly T[], key: (r: T) => string): Map<string, T> {
  return rows.reduce((m, r) => m.set(key(r), r), new Map<string, T>())
}
