// الحضور (Attendance) — per training session: who attended, late, absent, excused or injured, with each player's
// effort (RPE 0–10) and minutes; the session load (minutes × RPE) is computed for the load tracking.
// Data: training.attendance (docs/migrations/2026-11-05-attendance-learning-media.sql).
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Player } from "@/features/squad/data"

type St = "present" | "late" | "absent" | "excused" | "injured"
interface Row { player_id: string; status: St; rpe: number | null; minutes: number | null }
const STATES: readonly { k: St; ar: string; c: string }[] = [
  { k: "present", ar: "حاضر", c: "#2fa36b" }, { k: "late", ar: "متأخر", c: "#e09a1c" }, { k: "absent", ar: "غائب", c: "#d9483b" },
  { k: "excused", ar: "معتذر", c: "#5b6fe0" }, { k: "injured", ar: "مصاب", c: "#9a6be0" },
]
const RPE_MAX = 10
const RPE = Array.from({ length: RPE_MAX + 1 }, (_, i) => i)
const db = (): ReturnType<typeof supabase.schema> => supabase.schema("training")
const ACTIVE: ReadonlySet<St> = new Set(["present", "late"])

export function AttendancePanel({ sessionId, orgId, minutes, players, close }: { sessionId: string; orgId: string; minutes: number; players: Player[]; close: () => void }): React.JSX.Element {
  const [rows, setRows] = useState<Record<string, Row>>({})
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => {
      const r = await db().from("attendance").select("player_id,status,rpe,minutes").eq("session_id", sessionId)
      if (!alive) return
      if (r.error) { setMsg("تعذّر تحميل الحضور: " + r.error.message); return }
      const got = Object.fromEntries(((r.data ?? []) as Row[]).map((x) => [x.player_id, x]))
      setRows(Object.fromEntries(players.map((p) => [p.id, got[p.id] ?? { player_id: p.id, status: "present", rpe: null, minutes }])))
    }
    void run()
    return () => { alive = false }
  }, [sessionId, players, minutes])
  const set = (id: string, v: Partial<Row>): void => setRows((r) => ({ ...r, [id]: { ...r[id], ...v } }))
  const counts = useMemo(() => STATES.map((s) => ({ ...s, n: Object.values(rows).filter((r) => r.status === s.k).length })), [rows])
  const load = Object.values(rows).filter((r) => ACTIVE.has(r.status)).reduce((a, r) => a + (r.minutes ?? 0) * (r.rpe ?? 0), 0)
  const save = async (): Promise<void> => {
    setBusy(true); setMsg("")
    const payload = Object.values(rows).map((r) => ({ ...r, session_id: sessionId, org_id: orgId }))
    const r = await db().from("attendance").upsert(payload, { onConflict: "session_id,player_id" }).select("id")
    setBusy(false)
    setMsg(r.error ? "تعذّر الحفظ: " + r.error.message : `✓ تم حفظ حضور ${payload.length} لاعبًا`)
  }
  return (
    <div className="att" role="dialog" aria-label="الحضور">
      <div className="atth"><h3>الحضور والجهد <span className="en">Attendance & RPE</span></h3><button onClick={close} aria-label="إغلاق">✕</button></div>
      <div className="attsum">{counts.map((s) => <span key={s.k} style={{ "--c": s.c } as React.CSSProperties}><i />{s.ar} <b>{s.n}</b></span>)}<span className="ld">حِمل الفريق <b>{load}</b> د×RPE</span></div>
      {!players.length && <p className="mut">لا يضم هذا الفريق لاعبين بعد.</p>}
      <div className="attlist">{players.map((p) => { const r = rows[p.id]; if (!r) return null; return (
        <div key={p.id} className="attrow">
          <span className="nm"><b>{p.shirt_number ?? "—"}</b>{p.full_name}</span>
          <span className="sts">{STATES.map((s) => <button key={s.k} className={r.status === s.k ? "on" : ""} style={{ "--c": s.c } as React.CSSProperties} onClick={() => set(p.id, { status: s.k })}>{s.ar}</button>)}</span>
          <label>RPE<select value={r.rpe ?? ""} disabled={!ACTIVE.has(r.status)} onChange={(e) => set(p.id, { rpe: e.target.value === "" ? null : Number(e.target.value) })}><option value="">—</option>{RPE.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label>دقائق<input type="number" min={0} max={300} value={r.minutes ?? ""} disabled={!ACTIVE.has(r.status)} onChange={(e) => set(p.id, { minutes: e.target.value === "" ? null : Number(e.target.value) })} /></label>
        </div>) })}</div>
      <div className="attgo"><span className="mut">{msg || "RPE: تقدير اللاعب لشدة الجهد من 0 (راحة) إلى 10 (أقصى جهد)، يُسأل بعد الوحدة بنحو 30 دقيقة."}</span>
        <button className="p" disabled={busy || !players.length} onClick={() => void save()}>{busy ? "جارٍ الحفظ…" : "حفظ الحضور"}</button></div>
    </div>
  )
}
