// مراقبة الحِمل (Load monitoring) — weekly internal load per player from الحضور (minutes × RPE), and the ratio of
// this week to the player's 4-week average to flag sudden spikes (Gabbett 2016). Reports gated by "reports".
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Player, Team } from "@/features/squad/data"
import cfg from "./load-watch.json"

interface Att { player_id: string; status: string; rpe: number | null; minutes: number | null; session_id: string }
interface Ses { id: string; session_on: string }
interface Zone { min: number; ar: string; c: string; note: string }
const WEEKS = cfg.weeks
const CHRONIC = cfg.chronicWeeks
const ZONES = cfg.zones as Zone[]
const DAY_MS = 86_400_000
const WEEK_DAYS = 7
const ACTIVE: ReadonlySet<string> = new Set(["present", "late"])
const db = (): ReturnType<typeof supabase.schema> => supabase.schema("training")
const DATE_LEN = "yyyy-mm-dd".length
const RATIO_DP = 100
const PCT = 100

/** Saturday-based week start (Saudi / Gulf / Egypt training week). */
const weekStart = (d: Date): Date => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 1) % WEEK_DAYS)); return x }
const zoneOf = (r: number | null): Zone | null => (r === null ? null : ZONES.find((z) => r >= z.min) ?? ZONES[ZONES.length - 1])

export function LoadWatch({ team, players }: { team: Team; players: Player[] }): React.JSX.Element {
  const [att, setAtt] = useState<Att[] | null>(null)
  const [ses, setSes] = useState<Ses[]>([])
  const [err, setErr] = useState("")
  const from = useMemo(() => new Date(weekStart(new Date()).getTime() - (WEEKS - 1) * WEEK_DAYS * DAY_MS), [])
  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => {
      const s = await db().from("sessions").select("id,session_on").eq("team_id", team.id).gte("session_on", from.toISOString().slice(0, DATE_LEN))
      if (!alive) return
      if (s.error) { setErr(s.error.message); return }
      const list = (s.data ?? []) as Ses[]
      setSes(list)
      if (!list.length) { setAtt([]); return }
      const a = await db().from("attendance").select("player_id,status,rpe,minutes,session_id").in("session_id", list.map((x) => x.id))
      if (alive) { if (a.error) setErr(a.error.message); else setAtt((a.data ?? []) as Att[]) }
    }
    void run()
    return () => { alive = false }
  }, [team.id, from])

  const weeks = useMemo(() => Array.from({ length: WEEKS }, (_, i) => new Date(from.getTime() + i * WEEK_DAYS * DAY_MS)), [from])
  const weekOf = useMemo(() => new Map(ses.map((s) => [s.id, Math.floor((weekStart(new Date(s.session_on)).getTime() - from.getTime()) / (WEEK_DAYS * DAY_MS))])), [ses, from])
  const load = (pid: string): number[] => weeks.map((_, w) => (att ?? []).filter((a) => a.player_id === pid && weekOf.get(a.session_id) === w && ACTIVE.has(a.status)).reduce((t, a) => t + (a.minutes ?? 0) * (a.rpe ?? 0), 0))
  const ratio = (l: number[]): number | null => {
    const recent = l.slice(-CHRONIC)
    const chronic = recent.reduce((a, b) => a + b, 0) / CHRONIC
    return chronic > 0 ? Math.round((l[l.length - 1] / chronic) * RATIO_DP) / RATIO_DP : null
  }
  if (err) return <p className="err pad">تعذّر تحميل بيانات الحضور: {err}</p>
  if (!att) return <p className="mut pad">جارٍ التحميل…</p>
  const rows = players.map((p) => { const l = load(p.id); return { p, l, r: ratio(l) } })
  const max = Math.max(1, ...rows.flatMap((x) => x.l))
  const flagged = rows.filter((x) => (zoneOf(x.r)?.min ?? 0) >= cfg.alertFrom)
  return (
    <div className="lw">
      <div className="lwsum">
        {ZONES.map((z) => <div key={z.ar} style={{ "--c": z.c } as React.CSSProperties}><b>{rows.filter((x) => zoneOf(x.r) === z).length}</b><span>{z.ar}</span><small>{z.note}</small></div>)}
      </div>
      {flagged.length > 0 && <div className="lwalert">⚠ {flagged.map((x) => x.p.full_name).join("، ")} — حِمل هذا الأسبوع أعلى بوضوح من متوسط أسابيعه الأخيرة؛ راجع شدة الأيام القادمة وجاهزيته.</div>}
      {!ses.length && <div className="card msg"><p>لا توجد وحدات تدريبية مسجّلة لهذا الفريق في الأسابيع الخمسة الأخيرة. سجّل الوحدات في «البرنامج اليومي» ثم الحضور والجهد (RPE) بعد كل وحدة.</p><a className="btn p" href="#/program">البرنامج اليومي</a></div>}
      <div className="mx"><table>
        <thead><tr><th className="pn">اللاعب</th>{weeks.map((w, i) => <th key={i}>أسبوع {w.toLocaleDateString("ar", { day: "numeric", month: "short" })}<small>{i === weeks.length - 1 ? "الحالي" : ""}</small></th>)}<th>نسبة الأسبوع الحالي إلى المتوسط<small>آخر {CHRONIC} أسابيع</small></th></tr></thead>
        <tbody>{rows.map(({ p, l, r }) => { const z = zoneOf(r); return (
          <tr key={p.id}><td className="pn"><b>{p.shirt_number ?? "–"}</b>{p.full_name}</td>
            {l.map((v, i) => <td key={i} className="lwc"><i style={{ height: `${Math.round((v / max) * PCT)}%` }} /><span>{v || "—"}</span></td>)}
            <td>{z ? <span className="lwz" style={{ background: z.c }}>{r} · {z.ar}</span> : <span className="mut">—</span>}</td></tr>) })}</tbody>
      </table></div>
      <p className="mut pad">{cfg.explain} المصادر: {cfg.src}</p>
    </div>
  )
}
