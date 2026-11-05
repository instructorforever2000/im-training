// مركز التعلّم — keeps the learner's progress in their account (training.learning_progress / learning_profiles)
// so it follows them on any device. Visitors keep progress on the device only.
import { supabase } from "@/lib/supabase"
import type { Progress, UnitResult } from "./progress"

const db = (): ReturnType<typeof supabase.schema> => supabase.schema("training")

async function signedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return Boolean(data.session)
}

/** Merge the account's saved results with this device's (the higher score wins) and push the merge back. */
export async function syncProgress(local: Progress): Promise<Progress | null> {
  if (!(await signedIn())) return null
  const [u, prof] = await Promise.all([db().from("learning_progress").select("unit_id,best,updated_at"), db().from("learning_profiles").select("cert_name").maybeSingle()])
  if (u.error) return null
  const cloud = Object.fromEntries(((u.data ?? []) as { unit_id: string; best: number; updated_at: string }[]).map((r) => [r.unit_id, { best: r.best, at: r.updated_at } as UnitResult]))
  const ids = [...new Set([...Object.keys(cloud), ...Object.keys(local.units)])]
  const units = Object.fromEntries(ids.map((id) => { const a = cloud[id], b = local.units[id]; return [id, !a || (b && b.best > a.best) ? b : a] }))
  const name = local.name || ((prof.data as { cert_name: string | null } | null)?.cert_name ?? "")
  const rows = Object.entries(units).filter(([id, r]) => (cloud[id]?.best ?? -1) < r.best).map(([unit_id, r]) => ({ unit_id, best: r.best }))
  if (rows.length) await db().from("learning_progress").upsert(rows, { onConflict: "user_id,unit_id" })
  return { units, name }
}

export async function pushUnit(unit_id: string, best: number): Promise<void> {
  if (!(await signedIn())) return
  await db().from("learning_progress").upsert({ unit_id, best, updated_at: new Date().toISOString() }, { onConflict: "user_id,unit_id" })
}

export async function pushName(cert_name: string): Promise<void> {
  if (!(await signedIn())) return
  await db().from("learning_profiles").upsert({ cert_name, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
}
