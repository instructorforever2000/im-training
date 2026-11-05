// بنك الاختبارات البدنية (Tests & Norms) — every field test with its protocol, equipment, safety notes and the
// published norm tables of its source; an instant calculator rates any result against the table that fits the person.
// Open to visitors (reading + calculator); recording results for players lives in التقييم (members).
import { useMemo, useState } from "react"
import "@fontsource/outfit/500.css"
import { Dock } from "@/components/ui/Dock"
import { COMP, COMPS, TESTS, TONE_COLOR, derived, pickGroup, rate, type ClassNorm, type Norm, type PctNorm, type RefNorm, type Sex, type Test, type Who } from "./norms"
import "@/features/assessment/assessment.css"
import "./tests.css"

const ALL = "all"
const SPORT_AR: Record<string, string> = { football: "كرة القدم", futsal: "كرة الصالات", basketball: "كرة السلة", handball: "كرة اليد", volleyball: "الكرة الطائرة" }
const normCount = (n?: Norm): number => {
  if (!n) return 0
  return n.type === "multi" ? n.list.length : 1
}
const PCT_MAX = 100
const MID = 0.5
const PAD_LO = 0.95
const PAD_HI = 1.05

function PctView({ n, t, who, x, label, pick }: { n: PctNorm; t: Test; who: Who; x: number | null; label?: string; pick: (l: string) => void }): React.JSX.Element {
  const g = pickGroup(n.groups, who, label) ?? n.groups[0]
  const vals = (g.v ?? []).filter((v): v is number => v !== null)
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const pos = (v: number): number => {
    const r = hi === lo ? MID : (v - lo) / (hi - lo)
    return Math.round((t.lower ? 1 - r : r) * PCT_MAX)
  }
  const mark = x !== null && rate(t, x, who, g.label)
  return (
    <div className="nv">
      <label className="gsel">الفئة المرجعية<select value={g.label} onChange={(e) => pick(e.target.value)}>{n.groups.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}</select></label>
      <div className="pscale">
        {n.p.map((q, i) => { const v = g.v?.[i]; return v === null || v === undefined ? null : <span key={q} style={{ insetInlineStart: `${pos(v)}%` }}><b>{v}</b><i>{q}٪</i></span> })}
        {mark && x !== null && <em className="me" style={{ insetInlineStart: `${Math.max(0, Math.min(PCT_MAX, pos(x)))}%`, background: TONE_COLOR[mark.tone] }}>{x}</em>}
      </div>
      <p className="mut">{t.lower ? "الأقل زمنًا أفضل" : "الأعلى أفضل"} · المئين = نسبة من يتفوّق عليهم صاحب النتيجة في الفئة المرجعية</p>
    </div>
  )
}

function ClassView({ n, t, who, x, label, pick }: { n: ClassNorm; t: Test; who: Who; x: number | null; label?: string; pick: (l: string) => void }): React.JSX.Element {
  const g = pickGroup(n.groups, who, label) ?? n.groups[0]
  const valueOf = (v: number): number | null => (n.on ? derived(t, v, who) : v)
  const on = x === null ? null : valueOf(x)
  const cuts = g.cuts ?? []
  const level = (v: number): number => (n.lower ? cuts.filter((c) => v > c).length : cuts.filter((c) => v >= c).length)
  const idx = on === null ? -1 : level(on)
  const last = cuts[cuts.length - 1]
  const range = (i: number): string => {
    if (i === 0) return n.lower ? `≤ ${cuts[0]}` : `< ${cuts[0]}`
    if (i === cuts.length) return n.lower ? `> ${last}` : `≥ ${last}`
    return n.lower ? `${cuts[i - 1] + 1}–${cuts[i]}` : `${cuts[i - 1]}–${cuts[i]}`
  }
  return (
    <div className="nv">
      <label className="gsel">الفئة المرجعية<select value={g.label} onChange={(e) => pick(e.target.value)}>{n.groups.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}</select></label>
      <div className="cbands">{n.labels.map((l, i) => {
        const tone = n.lower ? n.labels.length - 1 - i : i
        const c = TONE_COLOR[Math.round((tone / (n.labels.length - 1)) * (TONE_COLOR.length - 1))]
        return <span key={l} className={i === idx ? "on" : ""} style={{ "--c": c } as React.CSSProperties}><b>{l}</b><i>{range(i)}</i></span>
      })}</div>
      {n.on && on !== null && <p className="mut">القيمة المصنَّفة: {on} {t.derive?.unit}</p>}
      {n.note && <p className="mut">{n.note}</p>}
    </div>
  )
}

function RefView({ n, t, x, sex }: { n: RefNorm; t: Test; x: number | null; sex: Sex }): React.JSX.Element {
  const items = n.items.filter((i) => i.sex === sex)
  const list = items.length ? items : n.items
  const all = [...list.map((i) => i.mean), ...(x === null ? [] : [x])]
  const lo = Math.min(...all) * PAD_LO, hi = Math.max(...all) * PAD_HI
  const pos = (v: number): number => Math.round(((v - lo) / (hi - lo)) * PCT_MAX)
  return (
    <div className="nv refs">
      {list.map((i) => (
        <div key={i.pop + i.sex} className="rrow"><span>{i.pop}<small>{i.sex === "m" ? "ذكور" : "إناث"}</small></span>
          <div className="rbar"><i style={{ insetInlineStart: `${pos(i.mean)}%` }} />{x !== null && <em style={{ insetInlineStart: `${pos(x)}%` }} />}</div>
          <b dir="ltr">{i.mean}{i.sd !== null ? ` ± ${i.sd}` : ""}</b></div>
      ))}
      <p className="mut">متوسطات مرجعية لفئات رياضية (± الانحراف المعياري) {t.lower ? "· الزمن الأقل أفضل" : ""}{x !== null ? " · العلامة الملوّنة = نتيجتك" : ""}</p>
    </div>
  )
}

function NormBlock({ n, t, who, x }: { n: Norm; t: Test; who: Who; x: number | null }): React.JSX.Element {
  const [label, setLabel] = useState<string | undefined>()
  if (n.type === "multi") return <>{n.list.map((m, i) => <NormBlock key={i} n={m} t={t} who={who} x={x} />)}</>
  const body: Record<string, () => React.JSX.Element> = {
    pct: () => <PctView n={n as PctNorm} t={t} who={who} x={x} label={label} pick={setLabel} />,
    class: () => <ClassView n={n as ClassNorm} t={t} who={who} x={x} label={label} pick={setLabel} />,
    ref: () => <RefView n={n as RefNorm} t={t} x={x} sex={who.sex} />,
  }
  return <div className="norm">{body[n.type]()}<p className="src">المصدر: {n.src}</p></div>
}

function TestPage({ t, back }: { t: Test; back: () => void }): React.JSX.Element {
  const c = COMP[t.c]
  const [val, setVal] = useState("")
  const [age, setAge] = useState("")
  const [sex, setSex] = useState<Sex>("m")
  const [mass, setMass] = useState("")
  const x = val.trim() === "" || Number.isNaN(Number(val)) ? null : Number(val)
  const who: Who = { age: age ? Number(age) : null, sex, mass: mass ? Number(mass) : null }
  const r = x === null ? null : rate(t, x, who)
  const d = x === null ? null : derived(t, x, who)
  const refs = t.norms?.type === "ref" ? t.norms.items.filter((i) => i.sex === sex) : []
  const refBeat = x !== null && refs.length ? { beat: refs.filter((i) => (t.lower ? x < i.mean : x > i.mean)).length, of: refs.length } : null
  return (
    <article className="tp" style={{ "--c": c.color } as React.CSSProperties}>
      <button className="back" onClick={back}>→ العودة إلى البنك</button>
      <header><span className="cmp">{c.ar} <span className="en">{c.en}</span></span><h2>{t.ar}</h2><p className="en">{t.en}</p>
        <div className="meta"><span>الوحدة: {t.unit}</span><span>{t.lower ? "الأقل أفضل" : "الأعلى أفضل"}</span><span>العمر: {t.ages}</span>{t.sp.map((s) => <span key={s}>{SPORT_AR[s]}</span>)}</div></header>
      <p className="why">{t.why}</p>
      <div className="cols2">
        <section><h4>الأدوات <span className="en">Equipment</span></h4><ul>{t.eq.map((e) => <li key={e}>{e}</li>)}</ul>
          <h4>التجهيز <span className="en">Setup</span></h4><p>{t.setup}</p>
          <h4>خطوات التطبيق <span className="en">Procedure</span></h4><ol>{t.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <h4>التسجيل <span className="en">Scoring</span></h4><p>{t.score}</p>
          <div className="safe"><b>⚠ السلامة</b> {t.safety}</div></section>
        <section className="calc">
          <h4>حاسبة التقييم <span className="en">Rate a result</span></h4>
          <div className="ins">
            <label>النتيجة ({t.unit})<input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} /></label>
            <label>العمر<input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="سنة" /></label>
            <div className="sx">{(["m", "f"] as Sex[]).map((s) => <button key={s} className={s === sex ? "on" : ""} onClick={() => setSex(s)}>{s === "m" ? "ذكر" : "أنثى"}</button>)}</div>
            {t.derive?.mass !== undefined && <label>الوزن (كجم)<input inputMode="decimal" value={mass} onChange={(e) => setMass(e.target.value)} /></label>}
          </div>
          {x !== null && (
            <div className="res">
              {!r && refBeat && <div className="chip refc"><b>أفضل من متوسط {refBeat.beat} من {refBeat.of} فئات مرجعية</b><small>قارن موقع نتيجتك (العلامة الملوّنة) بمتوسطات الرياضات أدناه</small></div>}
              {r ? <div className="chip" style={{ background: TONE_COLOR[r.tone] }}><b>{r.label}</b>{r.pct !== undefined && <span>المئين {r.pct}</span>}<small>{r.group}</small></div>
                : !refBeat && <div className="chip none"><b>لا يوجد جدول معايير مطابق</b><small>{t.norms ? "أدخل العمر والجنس، أو اختر الفئة المرجعية أدناه" : "سجّل النتيجة وتابع تطوّر اللاعب مقارنةً بنفسه وبزملائه"}</small></div>}
              {t.derive && <div className="dv">{t.derive.ar}: <b>{d ?? "—"}</b> {t.derive.unit}<small>المعادلة: {t.derive.src}</small></div>}
            </div>
          )}
          {t.norms ? <NormBlock n={t.norms} t={t} who={who} x={x} /> : <p className="mut">لا تتوفر لهذا الاختبار معايير منشورة موثوقة في مصادرنا الحالية؛ يُقارن اللاعب بنفسه وبفريقه داخل قسم التقييم.</p>}
        </section>
      </div>
    </article>
  )
}

export function TestsBank({ embedded }: { embedded?: boolean }): React.JSX.Element {
  const [comp, setComp] = useState<string>(ALL)
  const [open, setOpen] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const list = useMemo(() => TESTS.filter((t) => (comp === ALL || t.c === comp) && (!q || (t.ar + t.en).toLowerCase().includes(q.toLowerCase()))), [comp, q])
  const normed = TESTS.reduce((a, t) => a + normCount(t.norms), 0)
  const cur = TESTS.find((t) => t.k === open)
  const body = cur ? <TestPage t={cur} back={() => setOpen(null)} /> : (
    <>
      <div className="cmps">
        <button className={comp === ALL ? "on" : ""} onClick={() => setComp(ALL)}>الكل <i>{TESTS.length}</i></button>
        {COMPS.map((c) => <button key={c.k} className={comp === c.k ? "on" : ""} style={{ "--c": c.color } as React.CSSProperties} onClick={() => setComp(c.k)}>{c.ar} <i>{TESTS.filter((t) => t.c === c.k).length}</i></button>)}
        <input className="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن اختبار…" />
      </div>
      <div className="grid">{list.map((t) => (
        <button key={t.k} className="tc" style={{ "--c": COMP[t.c].color } as React.CSSProperties} onClick={() => setOpen(t.k)}>
          <span className="cmp">{COMP[t.c].ar}</span><b>{t.ar}</b><span className="en">{t.en}</span>
          <span className="ft"><i>{t.unit}</i><i>{t.lower ? "↓ أفضل" : "↑ أفضل"}</i>{t.norms && <i className="nm">{t.norms.type === "ref" ? "مراجع رياضية" : "معايير منشورة"}</i>}</span>
        </button>
      ))}</div>
    </>
  )
  if (embedded) return <div className="tb">{body}</div>
  return (
    <div className="tb as">
      <Dock active="tests" />
      <main>
        <div className="head"><div><h1>بنك الاختبارات البدنية <span className="en">Tests & Norms</span></h1>
          <p>{TESTS.length} اختبارًا ميدانيًا · {COMPS.length} عناصر لياقة · {normed} جدول معايير ومراجع منشورة · بروتوكول موحّد لكل اختبار</p></div></div>
        {body}
        <p className="sig">Instructor: Mohamed Ayad</p>
      </main>
    </div>
  )
}
