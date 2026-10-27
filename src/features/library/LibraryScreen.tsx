// المكتبة (Library) — approved merged direction, 27 Oct 2026:
// the coach's request is the main screen (Coach command) · a play opens in the 3D lab · a skill opens its knowledge map.
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react"
import "./library.css"
import cfg from "./library-config.json"
import {
  DRILLS, DRILL_CAT, PLAYS, PLAY_CAT, SKILLS, SKILL_CAT, SPORTS, parseAsk, playSport, scoreDrill, textMatch,
  type Ask, type Drill, type DrillCat, type NodeKey,
} from "./content"
import { Dock } from "./Dock"
import { SkillMap } from "./SkillMap"

const PlayLab = lazy(async () => ({ default: (await import("./PlayLab")).PlayLab }))

export type View = { v: "cmd" } | { v: "play"; id: string } | { v: "map"; key: NodeKey }
type Theme = "light" | "dark"
const THEME_KEY = "im-theme"
const ORDER: readonly DrillCat[] = ["warm", "phys", "tech", "tact", "game", "cool"]
const LANES = cfg.lanes as { ar: string; cats: DrillCat[]; color: string; take: number }[]
const RING = cfg.ring
const CURVE = cfg.curve
const RADAR = cfg.radar
const HALF = 2
const TAU = Math.PI * HALF
const PCT = 100

function readTheme(): Theme {
  try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light" } catch { return "light" }
}

export function LibraryScreen(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [view, setView] = useState<View>({ v: "cmd" })
  const flip = useCallback((): void => {
    setTheme((t) => { const n: Theme = t === "dark" ? "light" : "dark"; try { localStorage.setItem(THEME_KEY, n) } catch { /* private mode */ } return n })
  }, [])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [view])
  return (
    <div className="lib" data-theme={theme} dir="rtl">
      <Dock />
      {view.v === "cmd" && <Command open={setView} flip={flip} />}
      {view.v === "play" && <Suspense fallback={<div className="cmdv"><p className="wrap">…</p></div>}><PlayLab id={view.id} open={setView} flip={flip} theme={theme} /></Suspense>}
      {view.v === "map" && <SkillMap start={view.key} open={setView} flip={flip} />}
    </div>
  )
}

// ---------------- Coach command ----------------
function Command({ open, flip }: { open: (v: View) => void; flip: () => void }): React.JSX.Element {
  const [q, setQ] = useState(cfg.example)
  const [ask, setAsk] = useState<Ask>(() => parseAsk(cfg.example))
  const [picked, setPicked] = useState<string[] | null>(null)
  const scored = useMemo(() => DRILLS.map((x) => ({ x, s: scoreDrill(x, ask) })).filter((o) => o.s > 0).sort((a, b) => b.s - a.s), [ask])
  const auto = useMemo(() => {
    const take = (cs: DrillCat[], n: number): string[] => scored.filter((o) => cs.includes(o.x.cat)).slice(0, n).map((o) => o.x.id)
    return cfg.autoPick.flatMap((a) => take(a.cats as DrillCat[], a.n))
  }, [scored])
  const sel = picked ?? auto
  const toggle = (id: string): void => setPicked(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])
  const plays = useMemo(() => PLAYS.filter((p) => (!ask.sp || playSport(p) === ask.sp) && textMatch(q, p.name.ar, p.name.en, p.desc.ar)).slice(0, cfg.sideTake), [q, ask])
  const skills = useMemo(() => SKILLS.filter((s) => (!ask.sp || s.sp === ask.sp) && (!ask.age || s.age <= ask.age) && textMatch(q, s.ar.n, s.en.n, s.ar.w)).slice(0, cfg.sideTake), [q, ask])
  const run = (): void => { setAsk(parseAsk(q)); setPicked(null) }

  return (
    <div className="cmdv"><div className="wrap">
      <section className="glass cmd">
        <div className="row1"><h1>المكتبة <span className="en">Library</span></h1>
          <label className="ask"><span className="ai">AI</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run() }} placeholder="اكتب هدف الوحدة: اللعبة، العمر، الزمن، التركيز…" aria-label="طلب المدرب" />
            <button className="kbd" onClick={run}>Enter</button></label>
          <button className="chip" onClick={flip} title="فاتح / غامق">◐</button></div>
        <div className="parsed">فهمت:
          {ask.sp && <span className="chip on">اللعبة <b>{SPORTS[ask.sp].ar}</b></span>}
          {ask.age && <span className="chip on">العمر <b>تحت {ask.age}</b></span>}
          <span className="chip on">الزمن <b>{ask.min} د</b></span>
          {ask.focus.map((w) => <span key={w} className="chip on">التركيز <b>{w}</b></span>)}
          {ask.few && <span className="chip on">الأدوات <b>قليلة</b></span>}
          <span className="chip">{DRILLS.length} تمرين · {SKILLS.length} مهارة · {PLAYS.length} خطة متحركة</span>
        </div>
      </section>

      <section className="glass res">
        <div className="rh"><h2>اقتراحات المكتبة</h2><span>{scored.length} تمرين مطابق من {DRILLS.length}</span><span className="live" style={{ marginInlineStart: "auto" }}>مرتّبة حسب التطابق</span></div>
        <div className="lanes">
          {LANES.map((l) => {
            const all = scored.filter((o) => l.cats.includes(o.x.cat))
            return (
              <div key={l.ar} className="lane" style={{ "--c": l.color } as React.CSSProperties}>
                <h3><i />{l.ar}<small>{all.length}</small></h3>
                {all.slice(0, l.take).map((o, i) => <DrillCard key={o.x.id} x={o.x} s={o.s} i={i} on={sel.includes(o.x.id)} toggle={toggle} />)}
              </div>
            )
          })}
        </div>
        <div className="lanes">
          <div className="lane" style={{ "--c": "#e09a1c" } as React.CSSProperties}><h3><i />خطط متحركة <span className="en">Plays · 3D</span></h3>
            {plays.length ? plays.map((p) => (
              <button key={p.id} className="rc" onClick={() => open({ v: "play", id: p.id })}>
                <span className="t"><b>{p.name.ar}</b><small>{PLAY_CAT[p.cat]?.ar} · {p.steps.length} خطوات · {playSport(p) ? SPORTS[playSport(p) ?? "football"].ar : "أنشطة عامة"}</small></span><span className="add">↗</span></button>
            )) : <p className="sub">اكتب اسم موقف أو خطة (ضغط، بناء، مرتد…)</p>}
          </div>
          <div className="lane" style={{ "--c": "#5b6fe0" } as React.CSSProperties}><h3><i />مهارات <span className="en">Skills · Map</span></h3>
            {skills.length ? skills.map((s) => (
              <button key={s.id} className="rc" onClick={() => open({ v: "map", key: `s:${s.id}` })}>
                <span className="t"><b>{s.ar.n}</b><small>{SKILL_CAT[s.cat]?.ar} · {SPORTS[s.sp].ar} · المستوى {s.lvl}</small></span><span className="add">↗</span></button>
            )) : <p className="sub">اكتب اسم مهارة (تمرير، تسديد، استلام…)</p>}
          </div>
        </div>
      </section>

      <Builder ids={sel} ask={ask} remove={toggle} />
    </div></div>
  )
}

function DrillCard({ x, s, i, on, toggle }: { x: Drill; s: number; i: number; on: boolean; toggle: (id: string) => void }): React.JSX.Element {
  const c = DRILL_CAT[x.cat]; const len = TAU * RING.r
  return (
    <button className={`rc${on ? " in" : ""}`} style={{ animationDelay: `${i * RING.stagger}ms` }} onClick={() => toggle(x.id)}>
      <span className="mring"><svg viewBox={`0 0 ${RING.box} ${RING.box}`}><circle cx={RING.box / HALF} cy={RING.box / HALF} r={RING.r} fill="none" stroke="var(--chip)" strokeWidth={RING.w} />
        <circle cx={RING.box / HALF} cy={RING.box / HALF} r={RING.r} fill="none" stroke={c.color} strokeWidth={RING.w} strokeLinecap="round" strokeDasharray={`${(len * s) / PCT} ${len}`} /></svg><b>{s}</b></span>
      <span className="t"><b>{x.ar.name}</b><small>{c.ar} · {x.dur} د · RPE {x.rpe} · من {x.age} س</small></span>
      <span className="add">{on ? "✓" : "+"}</span>
    </button>
  )
}

// ---------------- Session builder ----------------
function fitNote(total: number, goal: number): string {
  if (total > goal) return `⚠ الوحدة ${total} دقيقة — أطول من المطلوب بـ ${total - goal} دقيقة.`
  if (total < goal) return `باقي ${goal - total} دقيقة — اختار تمرين تاني من الاقتراحات.`
  return "✓ الوحدة مظبوطة على الزمن المطلوب."
}

function Builder({ ids, ask, remove }: { ids: string[]; ask: Ask; remove: (id: string) => void }): React.JSX.Element {
  const xs = ids.map((id) => DRILLS.find((d) => d.id === id)).filter((d): d is Drill => Boolean(d)).sort((a, b) => ORDER.indexOf(a.cat) - ORDER.indexOf(b.cat))
  const total = xs.reduce((a, x) => a + x.dur, 0)
  const load = xs.reduce((a, x) => a + x.dur * x.rpe, 0)
  const span = Math.max(total, ask.min) || 1
  let at = 0
  const steps: [number, number][] = []
  xs.forEach((x) => { const w = (x.dur / span) * CURVE.w; const y = CURVE.base - x.rpe * CURVE.perRpe; steps.push([at, y], [at + w, y]); at += w })
  const area = steps.length ? `M0,${CURVE.base} L${steps.map((p) => p.join(",")).join(" L")} L${at},${CURVE.base}Z` : ""
  const line = steps.length ? `M${steps.map((p) => p.join(",")).join(" L")}` : ""
  const goal = (ask.min / span) * CURVE.w
  const mins = ORDER.map((k) => xs.filter((x) => x.cat === k).reduce((a, x) => a + x.dur, 0))
  const mx = Math.max(1, ...mins)
  const pt = (i: number, v: number): string => { const a = (i / ORDER.length) * TAU - Math.PI / HALF; return `${Math.cos(a) * RADAR.r * v},${Math.sin(a) * RADAR.r * v}` }
  let t = 0
  return (
    <aside className="glass build">
      <h2>الوحدة التدريبية <span className="en">Session builder</span></h2>
      <div className="meta"><div><b>{total}</b><span>دقيقة</span></div><div><b>{xs.length}</b><span>تمارين</span></div><div><b>{load}</b><span>الحِمل (د × RPE)</span></div></div>
      <div className="curve"><svg viewBox={`0 0 ${CURVE.w} ${CURVE.h}`}>
        <defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1FB5A8" stopOpacity=".45" /><stop offset="1" stopColor="#1FB5A8" stopOpacity="0" /></linearGradient></defs>
        <line x1="0" x2={CURVE.w} y1={CURVE.base} y2={CURVE.base} stroke="var(--ln)" />
        <line x1={CURVE.w - goal} x2={CURVE.w - goal} y1="0" y2={CURVE.h} stroke="var(--mu)" strokeDasharray="3 4" />
        <g transform={`translate(${CURVE.w},0) scale(-1,1)`}><path d={area} fill="url(#lg)" /><path d={line} fill="none" stroke="#1FB5A8" strokeWidth="2.5" /></g>
        <text x="0" y="10" fontSize="9" fill="var(--mu)">منحنى الشدة عبر الوحدة · الخط المتقطع = {ask.min}′</text></svg></div>
      <div className="blocks">{xs.map((x) => { const s = t; t += x.dur; return (
        <div key={x.id} className="blk" style={{ "--c": DRILL_CAT[x.cat].color } as React.CSSProperties}><span className="tm">{s}′</span>
          <span><b>{x.ar.name}</b><small>{DRILL_CAT[x.cat].ar} · RPE {x.rpe} · {x.ar.eq || "بدون أدوات"}</small></span>
          <button className="d" onClick={() => remove(x.id)} title="شيل من الوحدة">{x.dur}د ✕</button></div>) })}
        {!xs.length && <p className="sub">اختار تمارين من الاقتراحات — هتتحط هنا بالترتيب.</p>}</div>
      <div className="radar"><svg viewBox={`${-RADAR.box} ${-RADAR.box} ${RADAR.box * HALF} ${RADAR.box * HALF}`}>
        {RADAR.levels.map((v) => <polygon key={v} points={ORDER.map((_, i) => pt(i, v)).join(" ")} fill="none" stroke="var(--ln)" />)}
        <polygon points={mins.map((m, i) => pt(i, RADAR.floor + (1 - RADAR.floor) * (m / mx))).join(" ")} fill="#1FB5A833" stroke="#1FB5A8" strokeWidth="2" /></svg>
        <ul>{ORDER.map((k, i) => <li key={k} style={{ "--c": DRILL_CAT[k].color } as React.CSSProperties}><i />{DRILL_CAT[k].ar}<b>{mins[i]} د</b></li>)}</ul></div>
      <div className="warn">{fitNote(total, ask.min)}</div>
      <div className="go"><button className="p" disabled title="بعد بناء قسم الوحدة التدريبية">اعتمد الوحدة · قريبًا</button><button onClick={() => window.print()}>اطبع</button></div>
    </aside>
  )
}
