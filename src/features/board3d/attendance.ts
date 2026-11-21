// كشف الحضور اليوم — the squad selection on the board starts from today's attendance of the team (training.attendance).
import { supabase } from "@/lib/supabase"

export type AttendStatus = "present" | "late" | "absent" | "excused" | "injured"
/** Not available for today's line-up. */
export const OUT_TODAY: ReadonlySet<string> = new Set(["absent", "excused", "injured"])
export const ATTEND_AR: Record<AttendStatus, string> = { present: "حاضر", late: "متأخر", absent: "غائب", excused: "معتذر", injured: "مصاب" }

const ISO_DAY = 10
const today = (): string => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, ISO_DAY) }

export interface TodaySheet { title: string; marks: Map<string, AttendStatus> }

/** Today's training unit of the team and its attendance marks; null when there is no unit today or no access. */
export async function todayAttendance(teamId: string): Promise<TodaySheet | null> {
  const db = supabase.schema("training")
  const s = await db.from("sessions").select("id,title").eq("team_id", teamId).eq("session_on", today()).eq("is_active", true)
    .order("created_at", { ascending: false }).limit(1)
  const unit = (s.data as { id: string; title: string }[] | null)?.[0]
  if (s.error || !unit) return null
  const a = await db.from("attendance").select("player_id,status").eq("session_id", unit.id)
  if (a.error) return null
  const rows = (a.data ?? []) as { player_id: string; status: AttendStatus }[]
  return { title: unit.title, marks: new Map(rows.map((r) => [r.player_id, r.status])) }
}
