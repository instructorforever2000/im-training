// بناء الوحدة التدريبية (Session builder) — the coach sets the brief with clear choices (sport, age group, duration,
// fitness components, game focus, equipment) or types it; the library proposes drills per part of the session,
// "Build it for me" fills the session to the minute, and the timeline shows load, intensity curve and balance.
import { useMemo, useState } from "react"
import cfg from "./library-config.json"
import { DRILLS, DRILL_CAT, FITNESS_FOCUS, GAME_FOCUS, SPORTS, parseAsk, scoreDrill, type Ask, type Drill, type DrillCat, type Sport } from "./content"
import { CapButton } from "@/components/ui/CapButton"
import { printWith } from "@/features/auth/caps"

const ORDER: readonly DrillCat[] = ["warm", "phys", "tech", "tact", "game", "cool"]
const CURVE = cfg.curve
const RADAR = cfg.radar
const HALF = 2
const TAU = Math.PI * HALF
const S = cfg.session
const AGES = S.ages as readonly { v: number | null; ar: string }[]
const MINUTES = S.minutes as readonly number[]
interface Part { readonly key: string; readonly ar: string; readonly en: string; readonly cats: readonly DrillCat[]; readonly share: number; readonly color: string }
const PARTS = S.parts as unknown as readonly Part[]
const PART_TAKE = S.partTake
const OVERSHOOT_MIN = S.overshoot

type Scored = { readonly x: Drill; readonly s: number }

/** Fill each part of the session with its best-matching drills until the part's share of the minutes is reached. */
function autoPlan(scored: readonly Scored[], minutes: number): string[] {
  return PARTS.flatMap((p) => {
    const target = minutes * p.share
    return scored.filter((o) => p.cats.includes(o.x.cat)).sort((a, b) => b.s - a.s || b.x.dur - a.x.dur).reduce<{ ids: string[]; t: number }>((acc, o) => {
      if (acc.t >= target || acc.t + o.x.dur > target + OVERSHOOT_MIN) return acc
      return { ids: [...acc.ids, o.x.id], t: acc.t + o.x.dur }
    }, { ids: [], t: 0 }).ids
  })
}

const toggleIn = (xs: readonly string[], v: string): string[] => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v])

export function SessionPlanner({ extra, openDrill }: { extra: string[]; openDrill: (id: string, list: string[]) => void }): React.JSX.Element {
  const [ask, setAsk] = useState<Ask>(() => parseAsk(cfg.example))
  const [text, setText] = useState("")
  const [sel, setSel] = useState<string[]>(extra)
  const scored = useMemo(() => DRILLS.map((x) => ({ x, s: scoreDrill(x, ask) })).filter((o) => o.s > 0).sort((a, b) => b.s - a.s), [ask])
  const upd = (p: Partial<Ask>): void => setAsk((a) => ({ ...a, ...p }))
  const fromText = (): void => { if (text.trim()) setAsk(parseAsk(text)) }
  const toggle = (id: string): void => setSel((s) => toggleIn(s, id))
  return (
    <div className="cmdv"><div className="ses">
      <section className="glass brief">
        <div className="bh"><h2>1 · معطيات الوحدة <span className="en">Session brief</span></h2>
          <label className="ask sm"><span className="ai">AI</span>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") fromText() }} placeholder="أو اكتب طلبك: وحدة سرعة ورشاقة لكرة القدم تحت 12 سنة، 60 دقيقة" aria-label="طلب المدرب" />
            <button className="kbd" onClick={fromText}>تطبيق</button></label></div>
        <div className="bf">
          <label><span>اللعبة</span><select value={ask.sp ?? ""} onChange={(e) => upd({ sp: (e.target.value || null) as Sport | null })}>
            <option value="">كل الألعاب</option>{(Object.keys(SPORTS) as Sport[]).map((k) => <option key={k} value={k}>{SPORTS[k].ar}</option>)}</select></label>
          <label><span>الفئة العمرية</span><select value={ask.age ?? ""} onChange={(e) => upd({ age: e.target.value ? Number(e.target.value) : null })}>
            {AGES.map((a) => <option key={a.ar} value={a.v ?? ""}>{a.ar}</option>)}</select></label>
          <label><span>زمن الوحدة</span><select value={ask.min} onChange={(e) => upd({ min: Number(e.target.value) })}>
            {MINUTES.map((m) => <option key={m} value={m}>{m} دقيقة</option>)}</select></label>
          <label><span>الأدوات المتاحة</span><select value={ask.few ? "few" : "any"} onChange={(e) => upd({ few: e.target.value === "few" })}>
            <option value="any">كل الأدوات</option><option value="few">أدوات قليلة</option></select></label>
        </div>
        <div className="bchips"><span>عناصر اللياقة المطلوب تنميتها</span>
          <div className="chips">{FITNESS_FOCUS.map((f) => <button key={f} className={`chip${ask.focus.includes(f) ? " on" : ""}`} onClick={() => upd({ focus: toggleIn(ask.focus, f) })}>{f}</button>)}</div></div>
        <div className="bchips"><span>التركيز المهاري والخططي</span>
          <div className="chips">{GAME_FOCUS.map((f) => <button key={f} className={`chip${ask.focus.includes(f) ? " on" : ""}`} onClick={() => upd({ focus: toggleIn(ask.focus, f) })}>{f}</button>)}</div></div>
        <div className="bgo"><button className="p" onClick={() => setSel(autoPlan(scored, ask.min))}>⚡ ابنِ الوحدة تلقائيًا</button>
          <button onClick={() => setSel([])}>تفريغ الوحدة</button><span className="mu">{scored.length} تمرينًا مطابقًا من {DRILLS.length}</span></div>
      </section>

      <section className="glass sug">
        <h2>2 · اختر التمارين لكل جزء <span className="en">Pick drills</span></h2>
        <div className="parts">{PARTS.map((p) => {
          const all = scored.filter((o) => p.cats.includes(o.x.cat))
          return (
            <div key={p.key} className="part" style={{ "--c": p.color } as React.CSSProperties}>
              <h3><i />{p.ar} <span className="en">{p.en}</span><small>{all.length} تمرين · نحو {Math.round(ask.min * p.share)} د</small></h3>
              {all.slice(0, PART_TAKE).map((o) => (
                <div key={o.x.id} className={`prow${sel.includes(o.x.id) ? " in" : ""}`}>
                  <button className="pt" onClick={() => openDrill(o.x.id, all.map((a) => a.x.id))} title="افتح بطاقة التمرين">
                    <b>{o.x.ar.name}</b><small>{DRILL_CAT[o.x.cat].ar} · {o.x.dur} د · RPE {o.x.rpe} · تطابق {o.s}%</small></button>
                  <button className="add" onClick={() => toggle(o.x.id)} aria-label={sel.includes(o.x.id) ? "إزالة" : "إضافة"}>{sel.includes(o.x.id) ? "✓" : "+"}</button>
                </div>
              ))}
              {!all.length && <p className="sub">لا توجد تمارين مطابقة لهذا الجزء.</p>}
            </div>
          )
        })}</div>
      </section>

      <Timeline ids={sel} minutes={ask.min} remove={toggle} />
    </div></div>
  )
}

function fitNote(total: number, goal: number): string {
  if (total > goal) return `⚠ مدة الوحدة ${total} دقيقة، أي أطول من المطلوب بـ ${total - goal} دقيقة.`
  if (total < goal) return `يتبقى ${goal - total} دقيقة — أضف تمرينًا أو اضغط «ابنِ الوحدة تلقائيًا».`
  return "✓ الوحدة مطابقة للزمن المطلوب."
}

function Timeline({ ids, minutes, remove }: { ids: string[]; minutes: number; remove: (id: string) => void }): React.JSX.Element {
  const xs = ids.map((id) => DRILLS.find((d) => d.id === id)).filter((d): d is Drill => Boolean(d)).sort((a, b) => ORDER.indexOf(a.cat) - ORDER.indexOf(b.cat))
  const total = xs.reduce((a, x) => a + x.dur, 0)
  const load = xs.reduce((a, x) => a + x.dur * x.rpe, 0)
  const span = Math.max(total, minutes) || 1
  const pts = xs.reduce<{ at: number; p: [number, number][] }>((acc, x) => { const w = (x.dur / span) * CURVE.w, y = CURVE.base - x.rpe * CURVE.perRpe; return { at: acc.at + w, p: [...acc.p, [acc.at, y], [acc.at + w, y]] } }, { at: 0, p: [] })
  const area = pts.p.length ? `M0,${CURVE.base} L${pts.p.map((p) => p.join(",")).join(" L")} L${pts.at},${CURVE.base}Z` : ""
  const line = pts.p.length ? `M${pts.p.map((p) => p.join(",")).join(" L")}` : ""
  const goal = (minutes / span) * CURVE.w
  const mins = ORDER.map((k) => xs.filter((x) => x.cat === k).reduce((a, x) => a + x.dur, 0))
  const mx = Math.max(1, ...mins)
  const pt = (i: number, v: number): string => { const a = (i / ORDER.length) * TAU - Math.PI / HALF; return `${Math.cos(a) * RADAR.r * v},${Math.sin(a) * RADAR.r * v}` }
  const starts = xs.reduce<number[]>((acc, _x, i) => [...acc, i ? acc[i - 1] + xs[i - 1].dur : 0], [])
  return (
    <aside className="glass build">
      <h2>3 · الوحدة التدريبية <span className="en">Session</span></h2>
      <div className="meta"><div><b>{total}</b><span>من {minutes} دقيقة</span></div><div><b>{xs.length}</b><span>تمارين</span></div><div><b>{load}</b><span>الحِمل (د × RPE)</span></div></div>
      <div className="curve"><svg viewBox={`0 0 ${CURVE.w} ${CURVE.h}`}>
        <defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1FB5A8" stopOpacity=".45" /><stop offset="1" stopColor="#1FB5A8" stopOpacity="0" /></linearGradient></defs>
        <line x1="0" x2={CURVE.w} y1={CURVE.base} y2={CURVE.base} stroke="var(--ln)" />
        <line x1={CURVE.w - goal} x2={CURVE.w - goal} y1="0" y2={CURVE.h} stroke="var(--mu)" strokeDasharray="3 4" />
        <g transform={`translate(${CURVE.w},0) scale(-1,1)`}><path d={area} fill="url(#lg)" /><path d={line} fill="none" stroke="#1FB5A8" strokeWidth="2.5" /></g>
        <text x="0" y="10" fontSize="9" fill="var(--mu)">منحنى الشدة عبر الوحدة · الخط المتقطع = {minutes}′</text></svg></div>
      <div className="blocks">{xs.map((x, i) => (
        <div key={x.id} className="blk" style={{ "--c": DRILL_CAT[x.cat].color } as React.CSSProperties}><span className="tm">{starts[i]}′</span>
          <span><b>{x.ar.name}</b><small>{DRILL_CAT[x.cat].ar} · RPE {x.rpe} · {x.ar.eq || "بدون أدوات"}</small></span>
          <button className="d" onClick={() => remove(x.id)} title="إزالة من الوحدة">{x.dur}د ✕</button></div>))}
        {!xs.length && <p className="sub">اضغط «ابنِ الوحدة تلقائيًا»، أو أضف التمارين بزر + من كل جزء.</p>}</div>
      <div className="radar"><svg viewBox={`${-RADAR.box} ${-RADAR.box} ${RADAR.box * HALF} ${RADAR.box * HALF}`}>
        {RADAR.levels.map((v) => <polygon key={v} points={ORDER.map((_, i) => pt(i, v)).join(" ")} fill="none" stroke="var(--ln)" />)}
        <polygon points={mins.map((m, i) => pt(i, RADAR.floor + (1 - RADAR.floor) * (m / mx))).join(" ")} fill="#1FB5A833" stroke="#1FB5A8" strokeWidth="2" /></svg>
        <ul>{ORDER.map((k, i) => <li key={k} style={{ "--c": DRILL_CAT[k].color } as React.CSSProperties}><i />{DRILL_CAT[k].ar}<b>{mins[i]} د</b></li>)}</ul></div>
      <div className="warn">{fitNote(total, minutes)}</div>
      <div className="go"><a className="p" href="#/program">احفظها في البرنامج اليومي ↗</a><CapButton cap="print" onClick={() => printWith("print")}>اطبع</CapButton></div>
    </aside>
  )
}
