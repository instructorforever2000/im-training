// البرنامج اليومي (Daily program) + الوحدة التدريبية (Training session).
// The day's sessions on a timeline, the week at a glance, each team's readiness, and a session builder
// that pulls drills straight from the library, phase by phase (warm-up → main → game → cool-down).
import { AttendancePanel } from "./Attendance"
import { useMemo, useState } from "react"
import "@fontsource/outfit/500.css"
import { Dock } from "@/components/ui/Dock"
import drills from "@/content/legacy-v28/drills.json"
import { useSquadData, type Player, type Team } from "@/features/squad/data"
import { archiveSession, saveSession, setSessionStatus, useSessions, type Block, type Session, type SessionInput, type SessionStatus } from "./data"
import "./program.css"

interface Drill { id: string; sp: string[] | string; cat: string; dur: number; int: number; age: number; ar: { name: string; obj: string; area: string; eq: string; n: string } }
const DRILLS = drills as unknown as Drill[]
const drillOf = (id: string): Drill | undefined => DRILLS.find((d) => d.id === id)
const sportsOf = (d: Drill): string[] => (Array.isArray(d.sp) ? d.sp : [d.sp])

const PHASES: readonly { k: string; ar: string; en: string; cats: string[]; c: string }[] = [
  { k: "warm", ar: "الإحماء", en: "Warm-up", cats: ["warm"], c: "#e0a81c" },
  { k: "main", ar: "الجزء الرئيسي", en: "Main part", cats: ["tech", "tact", "phys"], c: "#1FB5A8" },
  { k: "game", ar: "اللعب", en: "Game", cats: ["game"], c: "#5b6fe0" },
  { k: "cool", ar: "التهدئة", en: "Cool-down", cats: ["cool"], c: "#7a8797" },
]
const PHASE_C: Record<string, string> = Object.fromEntries(PHASES.map((p) => [p.k, p.c]))
const CAT_AR: Record<string, string> = { warm: "إحماء", tech: "فني", tact: "خططي", phys: "بدني", game: "لعب", cool: "تهدئة" }
const ST: Record<SessionStatus, { ar: string; c: string }> = { planned: { ar: "مخطّطة", c: "#5b6fe0" }, done: { ar: "نُفّذت", c: "#2fa36b" }, cancelled: { ar: "أُلغيت", c: "#94a3b8" } }
const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
const WEEK = 7
const DAY_MS = 86_400_000
const ISO_LEN = "yyyy-mm-dd".length
const TIME_LEN = "hh:mm".length
const PICK_SHOWN = 30
const PCT = 100
const MIN_MS = 60_000
const MIN_TITLE = 2
const DAY_DIGITS = 2
const iso = (d: Date): string => new Date(d.getTime() - d.getTimezoneOffset() * MIN_MS).toISOString().slice(0, ISO_LEN)
const addDays = (s: string, n: number): string => iso(new Date(new Date(`${s}T12:00:00`).getTime() + n * DAY_MS))
const dayName = (s: string): string => DAYS_AR[new Date(`${s}T12:00:00`).getDay()]
const totalMin = (b: readonly Block[]): number => b.reduce((s, x) => s + x.min, 0)

// ---------------- session builder ----------------
function Builder({ teams, orgOf, init, close, saved }: { teams: Team[]; orgOf: (t: Team) => string; init: Partial<Session> & { session_on: string }; close: () => void; saved: () => void }): React.JSX.Element {
  const [teamId, setTeamId] = useState(init.team_id ?? teams[0]?.id ?? "")
  const team = teams.find((t) => t.id === teamId)
  const [f, setF] = useState({ title: init.title ?? "", goal: init.goal ?? "", session_on: init.session_on, starts_at: init.starts_at?.slice(0, TIME_LEN) ?? "", notes: init.notes ?? "" })
  const [blocks, setBlocks] = useState<Block[]>(init.blocks ?? [])
  const [pick, setPick] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const options = useMemo(() => {
    const ph = PHASES.find((p) => p.k === pick)
    if (!ph) return []
    const t = q.trim()
    return DRILLS.filter((d) => ph.cats.includes(d.cat) && (!team || sportsOf(d).includes(team.sport)) && (!t || d.ar.name.includes(t) || d.ar.obj.includes(t))).slice(0, PICK_SHOWN)
  }, [pick, q, team])
  const add = (d: Drill): void => { setBlocks([...blocks, { phase: pick as string, drill_id: d.id, min: d.dur }]); setPick(null); setQ("") }
  const submit = async (): Promise<void> => {
    if (!team) { setErr("اختر الفريق."); return }
    if (f.title.trim().length < MIN_TITLE) { setErr("اكتب عنوان الوحدة."); return }
    const v: SessionInput = {
      org_id: team.org_id, team_id: team.id, session_on: f.session_on, starts_at: f.starts_at || null, title: f.title.trim(),
      goal: f.goal.trim() || null, blocks, status: init.status ?? "planned", notes: f.notes.trim() || null,
    }
    setBusy(true)
    const r = await saveSession(v, init.id)
    setBusy(false)
    if (r) setErr(`تعذّر الحفظ: ${r}`); else saved()
  }
  const unsupported = team && !DRILLS.some((d) => sportsOf(d).includes(team.sport))
  return (
    <div className="pg-modal" onClick={close}>
      <div className="pg-sheet" onClick={(e) => e.stopPropagation()}>
        <header><h3>{init.id ? "تعديل الوحدة التدريبية" : "وحدة تدريبية جديدة"} <span className="en">Training session</span></h3><b className="tot">{totalMin(blocks)} دقيقة</b><button className="x" onClick={close}>✕</button></header>
        <div className="body">
          <div className="row3">
            <label className="fld">الفريق<select value={teamId} onChange={(e) => setTeamId(e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name} · {orgOf(t)}</option>)}</select></label>
            <label className="fld">اليوم<input type="date" value={f.session_on} onChange={(e) => setF({ ...f, session_on: e.target.value })} /></label>
            <label className="fld">الساعة<input type="time" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></label>
          </div>
          <label className="fld">عنوان الوحدة <span className="en">Title</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="مثال: البناء من الخلف تحت الضغط" /></label>
          <label className="fld">هدف الوحدة <span className="en">Goal</span><input value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} placeholder="أن يتمكن اللاعب من الخروج بالكرة من الخلف تحت ضغط المهاجمين" /></label>
          {unsupported && <p className="mut">لا تحتوي مكتبة التمارين بعد على تمارين للعبة هذا الفريق. يمكنك كتابة الوحدة وملاحظاتها، وتُضاف التمارين مع توسّع المكتبة.</p>}
          <div className="phases">{PHASES.map((ph) => {
            const list = blocks.map((b, i) => ({ b, i })).filter((x) => x.b.phase === ph.k)
            return (
              <section key={ph.k} style={{ "--c": ph.c } as React.CSSProperties}>
                <h5>{ph.ar} <span className="en">{ph.en}</span><i>{totalMin(list.map((x) => x.b))} د</i></h5>
                {list.map(({ b, i }) => {
                  const d = drillOf(b.drill_id)
                  return (
                    <div key={i} className="blk">
                      <div><b>{d?.ar.name ?? b.drill_id}</b><span>{d ? `${CAT_AR[d.cat]} · ${d.ar.area} · ${d.ar.eq}` : ""}</span></div>
                      <input type="number" min={1} value={b.min} onChange={(e) => setBlocks(blocks.map((x, j) => (j === i ? { ...x, min: Math.max(1, Number(e.target.value) || 1) } : x)))} /><em>د</em>
                      <button className="rm" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))} title="إزالة التمرين">✕</button>
                    </div>
                  )
                })}
                {pick === ph.k ? (
                  <div className="picker">
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في المكتبة…" />
                    <div className="opts">{options.map((d) => <button key={d.id} onClick={() => add(d)}><b>{d.ar.name}</b><span>{CAT_AR[d.cat]} · {d.dur} د · من سن {d.age}</span></button>)}
                      {!options.length && <p className="mut">لا توجد تمارين مطابقة.</p>}</div>
                    <button className="link" onClick={() => setPick(null)}>إغلاق</button>
                  </div>
                ) : <button className="addb" onClick={() => { setPick(ph.k); setQ("") }}>+ تمرين من المكتبة</button>}
              </section>
            )
          })}</div>
          <label className="fld">ملاحظات المدرب <span className="en">Notes</span><textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
        </div>
        {err && <p className="err">{err}</p>}
        <footer><button className="btn" onClick={close}>إلغاء</button><button className="btn p" disabled={busy} onClick={() => void submit()}>{busy ? "جارٍ الحفظ…" : "حفظ الوحدة"}</button></footer>
      </div>
    </div>
  )
}

// ---------------- one session on the timeline ----------------
function SessionCard({ s, team, players, open, after }: { s: Session; team?: Team; players: Player[]; open: () => void; after: () => void }): React.JSX.Element {
  const tot = totalMin(s.blocks)
  const ready = players.filter((p) => p.status === "ready").length
  const mark = async (st: SessionStatus): Promise<void> => { await setSessionStatus(s.id, st); after() }
  const remove = async (): Promise<void> => { await archiveSession(s.id); after() }
  const [att, setAtt] = useState(false)
  return (
    <article className={`sc ${s.status}`} style={{ "--c": team?.color ?? "#1FB5A8" } as React.CSSProperties}>
      <div className="time"><b>{s.starts_at?.slice(0, TIME_LEN) ?? "—"}</b><span>{tot} د</span></div>
      <div className="main">
        <div className="top"><span className="team">{team?.name ?? "—"}</span><i className="st" style={{ "--s": ST[s.status].c } as React.CSSProperties}>{ST[s.status].ar}</i></div>
        <h4>{s.title}</h4>
        {s.goal && <p className="goal">🎯 {s.goal}</p>}
        <div className="bar">{s.blocks.map((b, i) => <i key={i} title={drillOf(b.drill_id)?.ar.name} style={{ flex: b.min, background: PHASE_C[b.phase] }} />)}</div>
        <div className="meta"><span>{s.blocks.length} تمرين</span><span>جاهزين: {ready}/{players.length}</span></div>
      </div>
      <div className="acts">
        <button onClick={open}>فتح</button>
        <button onClick={() => setAtt(true)}>الحضور</button>
        {s.status === "planned" && <button className="ok" onClick={() => void mark("done")}>✓ نُفّذت</button>}
        {s.status === "planned" && <button onClick={() => void mark("cancelled")}>إلغاء</button>}
        {s.status !== "planned" && <button onClick={() => void mark("planned")}>إعادتها إلى «مخطّطة»</button>}
        <button className="rm" onClick={() => void remove()} title="أرشفة">أرشفة</button>
      </div>
      {att && <AttendancePanel sessionId={s.id} orgId={s.org_id} minutes={tot} players={players} close={() => setAtt(false)} />}
    </article>
  )
}

// ---------------- screen ----------------
export function ProgramScreen(): React.JSX.Element {
  const sq = useSquadData()
  const ss = useSessions()
  const [day, setDay] = useState(iso(new Date()))
  const [edit, setEdit] = useState<(Partial<Session> & { session_on: string }) | null>(null)
  const teams = (sq.data?.teams ?? []).filter((t) => t.is_active)
  const teamOf = (id: string | null): Team | undefined => teams.find((t) => t.id === id)
  const orgOf = (t: Team): string => sq.data?.orgs.find((o) => o.id === t.org_id)?.name_ar ?? ""
  const playersOf = (id: string | null): Player[] => (sq.data?.players ?? []).filter((p) => p.is_active && p.team_id === id)
  const reload = (): void => { ss.reload(); sq.reload() }
  const start = addDays(day, -new Date(`${day}T12:00:00`).getDay())
  const week = Array.from({ length: WEEK }, (_, i) => addDays(start, i))
  const all = ss.sessions ?? []
  const today = all.filter((s) => s.session_on === day)
  const weekS = all.filter((s) => week.includes(s.session_on))
  const loads = teams.map((t) => ({ t, min: weekS.filter((s) => s.team_id === t.id && s.status !== "cancelled").reduce((x, s) => x + totalMin(s.blocks), 0) })).filter((x) => x.min > 0)
  const maxLoad = Math.max(1, ...loads.map((x) => x.min))
  const todayTeams = [...new Set(today.map((s) => s.team_id))].map(teamOf).filter((t): t is Team => !!t)

  const body = (): React.JSX.Element => {
    if (sq.error || ss.error === "other") return <div className="card msg"><p>حدثت مشكلة في تحميل البيانات.</p><button className="btn" onClick={reload}>إعادة المحاولة</button></div>
    if (ss.error === "missing") return <div className="card msg"><p>لم يُضف جدول الوحدات التدريبية إلى قاعدة البيانات بعد.</p></div>
    if (!sq.data || !ss.sessions) return <p className="mut pad">جارٍ التحميل…</p>
    if (!teams.length) return <div className="card msg"><p>أضف فريقًا أولًا من «الفرق واللاعبون»، ثم خطّط وحداته هنا.</p><a className="btn p" href="#/squad">الفرق واللاعبين</a></div>
    return (
      <div className="lay">
        <section className="tl">
          <h3>{dayName(day)} <span>{day}</span></h3>
          {today.length ? today.map((s) => <SessionCard key={s.id} s={s} team={teamOf(s.team_id)} players={playersOf(s.team_id)} open={() => setEdit(s)} after={reload} />)
            : <div className="empty"><p>لا توجد وحدات تدريبية في هذا اليوم.</p><button className="btn p" onClick={() => setEdit({ session_on: day })}>+ خطّط وحدة</button></div>}
        </section>
        <aside className="side">
          <div className="pane">
            <h5>جاهزية الفرق اليوم <span className="en">Readiness</span></h5>
            {(todayTeams.length ? todayTeams : teams).map((t) => {
              const ps = playersOf(t.id), r = ps.filter((p) => p.status === "ready").length
              return <div key={t.id} className="rd"><span>{t.name}</span><b>{r}/{ps.length}</b><i><em style={{ width: `${ps.length ? (r / ps.length) * PCT : 0}%` }} /></i></div>
            })}
            <a className="link" href="#/assessment">الحالة البدنية بالتفصيل ←</a>
          </div>
          <div className="pane">
            <h5>حِمل الأسبوع <span className="en">Weekly minutes</span></h5>
            {loads.length ? loads.map(({ t, min }) => <div key={t.id} className="rd"><span>{t.name}</span><b>{min} د</b><i><em style={{ width: `${(min / maxLoad) * PCT}%`, background: t.color }} /></i></div>) : <p className="mut">لا توجد دقائق مخطّطة لهذا الأسبوع بعد.</p>}
          </div>
          <div className="pane legend">{PHASES.map((p) => <span key={p.k}><i style={{ background: p.c }} />{p.ar}</span>)}</div>
        </aside>
      </div>
    )
  }

  return (
    <div className="pg">
      <Dock active="program" />
      <main>
        <div className="head">
          <div><h1>البرنامج اليومي <span className="en">Daily program</span></h1><p>الوحدات التدريبية لكل فريق، وتمارينها من المكتبة مباشرة</p></div>
          <button className="btn p" onClick={() => setEdit({ session_on: day })} disabled={!teams.length}>+ وحدة تدريبية</button>
        </div>
        <div className="week">
          <button className="nav" onClick={() => setDay(addDays(day, -WEEK))}>›</button>
          {week.map((d) => {
            const n = all.filter((s) => s.session_on === d && s.status !== "cancelled").length
            return <button key={d} className={`${d === day ? "on" : ""} ${d === iso(new Date()) ? "today" : ""}`} onClick={() => setDay(d)}><span>{dayName(d)}</span><b>{d.slice(-DAY_DIGITS)}</b><i>{Array.from({ length: n }, (_, k) => <em key={k} />)}</i></button>
          })}
          <button className="nav" onClick={() => setDay(addDays(day, WEEK))}>‹</button>
          <button className="todayb" onClick={() => setDay(iso(new Date()))}>اليوم</button>
        </div>
        {body()}
      </main>
      {edit && <Builder teams={teams} orgOf={orgOf} init={edit} close={() => setEdit(null)} saved={() => { setEdit(null); reload() }} />}
    </div>
  )
}
