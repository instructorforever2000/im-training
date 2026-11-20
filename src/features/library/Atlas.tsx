// أطلس الحركة (Movement Atlas) — the 16 illustrated exercise cards, organised by movement pattern
// the way a strength & conditioning coach thinks (squat · hinge · push · pull …), not as a picture gallery.
// Content source: library/exercises/*/source/*-card.html → atlas-cards.json (one entry per card family).
import { useEffect, useMemo, useState } from "react"
import "./atlas.css"
import RAW from "./atlas-cards.json"
import PROGS from "./atlas-programs.json"

type Role = "r" | "b" | "g"
type Mus = { readonly n: string; readonly r: Role | string; readonly en?: string }
type Variant = { readonly img: string; readonly no: string; readonly lv: string; readonly ar: string; readonly en: string; readonly mus: readonly Mus[]; readonly cue: string }
type Family = {
  readonly id: string; readonly pattern: string; readonly ar: string; readonly en: string; readonly goal: string
  readonly kind: string; readonly vars: readonly Variant[]; readonly muscles?: readonly Mus[]
  readonly ladder: readonly string[]; readonly rules: readonly string[]; readonly breath: string
  readonly dose: readonly { readonly v: string; readonly l: string }[]
  readonly errors: readonly { readonly x: string; readonly fix: string }[]; readonly ref: string
}
const FAMILIES = RAW as readonly Family[]
interface ProgItem { readonly f: string; readonly v: number; readonly dose: string; readonly next?: string }
interface Program {
  readonly id: string; readonly ar: string; readonly en: string; readonly aud: string; readonly age: string
  readonly weeks: number; readonly perWeek: number; readonly min: number; readonly goal: string; readonly equip: string
  readonly phases: readonly { readonly w: string; readonly ar: string; readonly note: string }[]
  readonly blocks: readonly { readonly ar: string; readonly en: string; readonly min: number; readonly items: readonly ProgItem[] }[]
  readonly rules: readonly string[]; readonly ref: string
}
const PROGRAMS = PROGS as readonly Program[]
const AUD_C: Record<string, string> = { "ناشئين": "#2fa36b", "مدارس": "#5b6fe0", "أندية": "#e0661c" }
const famOf = (id: string): Family | undefined => FAMILIES.find((f) => f.id === id)
const BASE = `${import.meta.env.BASE_URL}atlas/`
const src = (f: string, img: string): string => `${BASE}${f}/${img}.webp`

const PATTERNS: readonly { k: string; ar: string; en: string; c: string }[] = [
  { k: "prep", ar: "الإعداد والحركية", en: "Prep & mobility", c: "#e09a1c" },
  { k: "squat", ar: "القرفصاء", en: "Squat", c: "#1FB5A8" },
  { k: "hinge", ar: "مفصلة الورك", en: "Hinge", c: "#0f8f84" },
  { k: "lunge", ar: "الطعن", en: "Lunge", c: "#2fa36b" },
  { k: "push", ar: "الدفع", en: "Push", c: "#5b6fe0" },
  { k: "pull", ar: "السحب", en: "Pull", c: "#7c5be0" },
  { k: "core", ar: "ثبات الجذع", en: "Core", c: "#d9483b" },
  { k: "carry", ar: "الحمل", en: "Carry", c: "#b0623a" },
  { k: "power", ar: "القدرة الانفجارية", en: "Power", c: "#e0661c" },
  { k: "speed", ar: "السرعة والرشاقة", en: "Speed & agility", c: "#c23a8a" },
]
const PC = new Map(PATTERNS.map((p) => [p.k, p]))
const LEVELS = ["الأساس", "مبتدئ", "متوسط", "متقدم"] as const
const STAGGER_MS = 30
const MAX_STRIP = 6
const PLURAL_FROM = 2
const ROLE: Record<string, string> = { r: "مستهدفة", b: "مساعدة", g: "مثبِّتة" }

/** Ladder step state relative to the selected variation. */
function stepClass(j: number, i: number): string {
  if (j === i) return "on"
  return j < i ? "done" : ""
}

/** All muscles named on a family (multi cards: per variation; single cards: one legend). */
function musclesOf(f: Family): string[] {
  const all = f.muscles ?? f.vars.flatMap((v) => v.mus)
  return [...new Set(all.map((m) => m.n))]
}

export function Atlas({ dark }: { readonly dark: boolean }): React.JSX.Element {
  const [pat, setPat] = useState<string>("all")
  const [lv, setLv] = useState<string>("all")
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<{ f: string; v: number } | null>(null)
  const [view, setView] = useState<"atlas" | "programs">("atlas")
  const [prog, setProg] = useState<string | null>(null)

  const hits = useMemo((): Family[] => {
    const s = q.trim().toLowerCase()
    return FAMILIES.filter((f) =>
      (pat === "all" || f.pattern === pat) &&
      (lv === "all" || f.vars.some((v) => v.lv === lv)) &&
      (!s || [f.ar, f.en, f.goal, ...musclesOf(f), ...f.vars.flatMap((v) => [v.ar, v.en, v.cue])].join(" ").toLowerCase().includes(s)))
  }, [pat, lv, q])
  const varCount = FAMILIES.reduce((n, f) => n + f.vars.length, 0)

  if (open) {
    const f = FAMILIES.find((x) => x.id === open.f)
    if (f) return <FamilyView f={f} start={open.v} dark={dark} back={() => setOpen(null)} />
  }
  const sw = (
    <div className="a-sw" role="tablist">
      <button role="tab" aria-selected={view === "atlas"} className={view === "atlas" ? "on" : ""} onClick={() => setView("atlas")}>العائلات الحركية <span className="en">Families</span></button>
      <button role="tab" aria-selected={view === "programs"} className={view === "programs" ? "on" : ""} onClick={() => { setView("programs"); setProg(null) }}>البرامج الجاهزة <span className="en">Programs · {PROGRAMS.length}</span></button>
    </div>
  )
  if (view === "programs") {
    const pr = PROGRAMS.find((x) => x.id === prog)
    return <div className="a-pv">{sw}{pr ? <ProgramView p={pr} back={() => setProg(null)} openEx={(f, v) => setOpen({ f, v })} /> : (
      <div className="a-pgrid">{PROGRAMS.map((p) => (
        <button key={p.id} className="a-pcard" style={{ "--c": AUD_C[p.aud] ?? "var(--teal)" } as React.CSSProperties} onClick={() => setProg(p.id)}>
          <span className="a-aud">{p.aud} · {p.age}</span>
          <b>{p.ar}</b><span className="en a-e2">{p.en}</span>
          <small>{p.goal}</small>
          <div className="a-pmeta"><div><b>{p.weeks}</b><span>أسابيع</span></div><div><b>{p.perWeek}×</b><span>في الأسبوع</span></div><div><b>{p.min}</b><span>دقيقة</span></div><div><b>{p.blocks.reduce((n, bl) => n + bl.items.length, 0)}</b><span>تمرين</span></div></div>
          <div className="a-pth">{p.blocks.flatMap((bl) => bl.items).slice(0, 6).map((it, i) => { const fm = famOf(it.f); const vv = fm?.vars[it.v]; return vv ? <img key={i} loading="lazy" src={src(it.f, vv.img)} alt="" /> : null })}</div>
        </button>))}</div>
    )}</div>
  }
  return (
    <>{sw}<div className="atl">
      <aside className="rail">
        <label className="search"><span>⌕</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="تمرين، عضلة، أداة… Search" /></label>
        <div>
          <h3>النمط الحركي <span className="en">Movement pattern</span></h3>
          <div className="goals">
            <button className={`goal ${pat === "all" ? "on" : ""}`} style={{ "--c": "var(--ink)" } as React.CSSProperties} onClick={() => setPat("all")}><i />الكل<small>{FAMILIES.length}</small></button>
            {PATTERNS.map((p) => {
              const n = FAMILIES.filter((f) => f.pattern === p.k).length
              return n > 0 && <button key={p.k} className={`goal ${pat === p.k ? "on" : ""}`} style={{ "--c": p.c } as React.CSSProperties} onClick={() => setPat(p.k)}><i />{p.ar}<span className="en">{p.en}</span><small>{n}</small></button>
            })}
          </div>
        </div>
        <div>
          <h3>المستوى <span className="en">Level</span></h3>
          <div className="chips">
            <button className={`chip ${lv === "all" ? "on" : ""}`} onClick={() => setLv("all")}>الكل</button>
            {LEVELS.map((l) => <button key={l} className={`chip ${lv === l ? "on" : ""}`} onClick={() => setLv(l)}>{l}</button>)}
          </div>
        </div>
        <p className="hint">{FAMILIES.length} عائلة حركية · {varCount} تشكيلًا مرسومًا · مرجع علمي لكل كارت</p>
      </aside>

      <section className="results">
        <div className="rhead"><h2><b>{hits.length}</b> عائلة حركية</h2><span className="mu">اضغط على أي تشكيل لفتحه مباشرة</span></div>
        {hits.length === 0 && <div className="empty">مفيش نتائج — جرّب كلمة تانية أو امسح الفلاتر</div>}
        <div className="a-fams">
          {hits.map((f, i) => {
            const p = PC.get(f.pattern)
            return (
              <article key={f.id} className="a-fam" style={{ "--c": p?.c ?? "var(--teal)", animationDelay: `${i * STAGGER_MS}ms` } as React.CSSProperties}>
                <button className="a-fhead" onClick={() => setOpen({ f: f.id, v: 0 })}>
                  <span className="a-pt">{p?.ar}<span className="en">{p?.en}</span></span>
                  <b>{f.ar}</b><span className="en a-e2">{f.en}</span>
                  <small>{f.goal}</small>
                </button>
                <div className={`a-strip n${Math.min(f.vars.length, MAX_STRIP)}`}>
                  {f.vars.map((v, j) => (
                    <button key={v.img} className="a-vthumb" onClick={() => setOpen({ f: f.id, v: j })} title={`${v.ar} · ${v.en}`}>
                      <img loading="lazy" src={src(f.id, v.img)} alt={v.ar} />
                      <span>{v.ar}</span>
                    </button>
                  ))}
                </div>
                <div className="a-ffoot">
                  <span>{f.vars.length} {f.vars.length > PLURAL_FROM ? "تشكيلات" : "تشكيل"}</span>
                  {f.ladder.length > 0 && <span className="mu">تدرّج {f.ladder.length} مراحل</span>}
                  <button className="a-open" onClick={() => setOpen({ f: f.id, v: 0 })}>افتح ←</button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div></>
  )
}

function ProgramView({ p, back, openEx }: { readonly p: Program; readonly back: () => void; readonly openEx: (f: string, v: number) => void }): React.JSX.Element {
  const total = p.blocks.reduce((n, b) => n + b.min, 0)
  return (
    <div className="a-prog" style={{ "--c": AUD_C[p.aud] ?? "var(--teal)" } as React.CSSProperties}>
      <header className="a-fvh glass">
        <button className="chip" onClick={back}>→ البرامج</button>
        <div className="ttl"><span className="a-pt">{p.aud} · {p.age}</span><h2>{p.ar} <span className="en">{p.en}</span></h2></div>
        <div className="a-pmeta"><div><b>{p.weeks}</b><span>أسابيع</span></div><div><b>{p.perWeek}×</b><span>أسبوعيًا</span></div><div><b>{total}</b><span>دقيقة</span></div></div>
      </header>
      <section className="glass a-pad"><h4>الهدف <span className="en">Goal</span></h4><p>{p.goal}</p><p className="mu">الأدوات: {p.equip}</p></section>
      <section className="glass a-pad">
        <h4>مراحل البرنامج <span className="en">Phases</span></h4>
        <ol className="a-phases">{p.phases.map((ph) => <li key={ph.w}><b>{ph.w}</b><div><strong>{ph.ar}</strong><span>{ph.note}</span></div></li>)}</ol>
      </section>
      <section className="glass a-pad">
        <h4>الحصة التدريبية <span className="en">Session</span></h4>
        <div className="a-tline">{p.blocks.map((b) => <i key={b.ar} style={{ flex: b.min }} title={`${b.ar} · ${b.min} د`}><span>{b.ar} · {b.min}د</span></i>)}</div>
        {p.blocks.map((b) => (
          <div key={b.ar} className="a-blk">
            <h5>{b.ar} <span className="en">{b.en}</span><small>{b.min} دقيقة</small></h5>
            <div className="a-exs">{b.items.map((it, i) => {
              const fm = famOf(it.f), vv = fm?.vars[it.v]; if (!fm || !vv) return null
              const [nf, nv] = (it.next ?? "").split(":"), nx = it.next ? famOf(nf)?.vars[Number(nv)] : undefined
              return (
                <button key={i} className="a-ex" onClick={() => openEx(it.f, it.v)}>
                  <img loading="lazy" src={src(it.f, vv.img)} alt="" />
                  <div><b>{vv.ar}</b><small>{fm.ar}</small><span className="a-dose">{it.dose}</span>{nx && <span className="a-nx">التطور ← {nx.ar}</span>}</div>
                </button>
              )
            })}</div>
          </div>
        ))}
      </section>
      <section className="glass a-pad">
        <h4>قواعد البرنامج <span className="en">Rules</span></h4>
        <ol className="a-rules">{p.rules.map((r) => <li key={r}>{r}</li>)}</ol>
        <p className="a-ref">المراجع: <span dir="ltr">{p.ref}</span></p>
      </section>
    </div>
  )
}

function FamilyView({ f, start, dark, back }: { readonly f: Family; readonly start: number; readonly dark: boolean; readonly back: () => void }): React.JSX.Element {
  const [i, setI] = useState(start)
  const [card, setCard] = useState(false)
  const [zoom, setZoom] = useState(false)
  useEffect(() => {
    if (!card) return
    const onKey = (e: KeyboardEvent): void => { if (e.key === "Escape") { setCard(false); setZoom(false) } }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [card])
  const v = f.vars[i] ?? f.vars[0]
  const p = PC.get(f.pattern)
  const mus = v.mus.length > 0 ? v.mus : (f.muscles ?? [])
  return (
    <div className="a-fv" style={{ "--c": p?.c ?? "var(--teal)" } as React.CSSProperties} data-dark={dark || undefined}>
      <header className="a-fvh glass">
        <button className="chip" onClick={back}>→ الأطلس</button>
        <div className="ttl"><span className="a-pt">{p?.ar} <span className="en">{p?.en}</span></span><h2>{f.ar} <span className="en">{f.en}</span></h2></div>
        <button className="chip on" onClick={() => setCard(true)}>الكارت الكامل <span className="en">Full card</span></button>
      </header>

      <div className="a-fvb">
        <section className="a-stage glass">
          <div className="a-big" key={v.img}><img src={src(f.id, v.img)} alt={v.ar} /></div>
          <div className="a-vbar" role="tablist" aria-label="التشكيلات">
            {f.vars.map((x, j) => (
              <button key={x.img} role="tab" aria-selected={j === i} className={j === i ? "on" : ""} onClick={() => setI(j)}>
                <img src={src(f.id, x.img)} alt="" /><b>{x.no}</b><span>{x.ar}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="a-insp glass">
          <div className="a-vt">
            {v.lv && <span className={`a-lv l${LEVELS.indexOf(v.lv as typeof LEVELS[number])}`}>{v.lv}</span>}
            <h3>{v.ar}</h3><div className="en a-e2">{v.en}</div>
            {v.cue && <p className="a-cue">{v.cue}</p>}
          </div>
          <div className="a-blk2">
            <h4>العضلات <span className="en">Muscles</span></h4>
            <div className="a-mus">{mus.map((m) => <span key={m.n} className={`a-m ${m.r}`} title={ROLE[m.r] ?? ""}>{m.n}{m.en && <small>{m.en}</small>}</span>)}</div>
            <div className="a-mkey"><span className="a-m r">مستهدفة</span><span className="a-m b">مساعدة</span><span className="a-m g">مثبِّتة</span></div>
          </div>
          {f.ladder.length > 0 && (
            <div className="a-blk2">
              <h4>سُلَّم التدرّج <span className="en">Progression</span></h4>
              <ol className="a-ladder">{f.ladder.map((s, j) => <li key={s} className={stepClass(j, i)}><button onClick={() => j < f.vars.length && setI(j)}>{s}</button></li>)}</ol>
            </div>
          )}
          <div className="a-blk2">
            <h4>الجرعة <span className="en">Dosage</span></h4>
            <div className="a-dose">{f.dose.map((d) => <div key={d.l}><b>{d.v}</b><span>{d.l}</span></div>)}</div>
          </div>
        </aside>
      </div>

      <div className="a-fvl">
        <section className="glass a-pad">
          <h4>الهدف التدريبي <span className="en">Training goal</span></h4><p>{f.goal}</p>
          <h4>نقاط الأداء <span className="en">Key points</span></h4>
          <ol className="a-rules">{f.rules.map((r) => <li key={r}>{r}</li>)}</ol>
          {f.breath && <p className="a-breath">{f.breath}</p>}
        </section>
        <section className="glass a-pad">
          <h4>أخطاء شائعة وتصحيحها <span className="en">Errors → fixes</span></h4>
          {f.errors.map((e) => <div key={e.x} className="a-err"><b>✕ {e.x}</b><span>✓ {e.fix}</span></div>)}
          {f.ref && <p className="a-ref">المرجع: <span dir="ltr">{f.ref}</span></p>}
        </section>
      </div>

      {card && (
        <div className="a-lbx" onClick={() => { setCard(false); setZoom(false) }} role="dialog" aria-label="الكارت الكامل">
          <div className={`a-lbi ${zoom ? "z" : ""}`} onClick={(e) => { e.stopPropagation(); setZoom((z) => !z) }}>
            <img src={src(f.id, "card")} alt={`كارت ${f.ar}`} />
          </div>
          <div className="a-lbt" onClick={(e) => e.stopPropagation()}>
            <span>اضغط على الكارت للتكبير</span>
            <a className="chip" href={src(f.id, "card")} download={`IM-${f.id}-card.webp`}>تنزيل <span className="en">Download</span></a>
            <button className="chip" onClick={() => setCard(false)}>إغلاق ✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
