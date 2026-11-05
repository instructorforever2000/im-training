// الأحمال ومراحل الإعداد (Loads & training phases) — the five progressive phases (stabilization → strength → power)
// with the acute variables of every component, the program-design continuum, and a 1RM calculator that turns one
// set into working loads for the chosen phase. Source: NASM Essentials (2012), tables 14.1, 14.6–14.11.
import { useState } from "react"
import data from "./load-phases.json"
import "./load.css"

interface Row { ar: string; reps: string; sets: string; tempo: string; int: string; rest: string; freq: string }
interface Phase { n: number; lv: string; ar: string; en: string; weeks: string; aim: string; prog: string; rows: Row[]; note: string }
interface Band { ar: string; reps: string; sets: string; int: string; tempo: string; rest: string; lo: number; hi: number }
const PHASES = data.phases as Phase[]
const LEVELS = data.levels
const LV = Object.fromEntries(LEVELS.map((l) => [l.k, l]))
const BANDS = data.continuum as Band[]
const RM = data.oneRm
const EPLEY_DIV = 30
const BRZ_A = 36
const BRZ_B = 37
const HALF = 2
const PCT = 100
const COLS: readonly { k: keyof Row; ar: string }[] = [
  { k: "ar", ar: "المكوّن" }, { k: "reps", ar: "التكرارات" }, { k: "sets", ar: "المجموعات" }, { k: "tempo", ar: "الإيقاع" }, { k: "int", ar: "الشدة" }, { k: "rest", ar: "الراحة" }, { k: "freq", ar: "التكرار الأسبوعي" },
]
const roundTo = (v: number, step: number): number => Math.round(v / step) * step

/** 1RM from one set: mean of Epley and Brzycki (valid up to 10 repetitions). */
function oneRm(w: number, reps: number): number | null {
  if (!(w > 0) || !(reps >= 1) || reps > RM.maxReps) return null
  if (reps === 1) return w
  const epley = w * (1 + reps / EPLEY_DIV)
  const brzycki = (w * BRZ_A) / (BRZ_B - reps)
  return (epley + brzycki) / HALF
}

export function LoadLab(): React.JSX.Element {
  const [ph, setPh] = useState(1)
  const [w, setW] = useState("")
  const [reps, setReps] = useState("")
  const [band, setBand] = useState(0)
  const p = PHASES.find((x) => x.n === ph) ?? PHASES[0]
  const rm = oneRm(Number(w), Number(reps))
  const b = BANDS[band]
  return (
    <div className="cmdv"><div className="ll">
      <section className="glass stairs">
        <h2>مراحل الإعداد البدني <span className="en">Training phases</span></h2>
        <p className="sub">سُلّم من خمس مراحل: يبدأ بالثبات، ثم القوة، ثم القدرة. يصعد اللاعب ويهبط عليه حسب هدف الفترة وحالته.</p>
        <div className="steps">{PHASES.map((x) => (
          <button key={x.n} className={x.n === ph ? "on" : ""} style={{ "--c": LV[x.lv].color, "--h": `${x.n * (PCT / PHASES.length)}%` } as React.CSSProperties} onClick={() => setPh(x.n)}>
            <i>{x.n}</i><b>{x.ar}</b><span className="en">{x.en}</span><small>{LV[x.lv].ar}</small></button>
        ))}</div>
      </section>
      <section className="glass phase" style={{ "--c": LV[p.lv].color } as React.CSSProperties}>
        <header><span className="lvl">المستوى: {LV[p.lv].ar} <span className="en">{LV[p.lv].en}</span></span><h3>المرحلة {p.n}: {p.ar} <span className="en">{p.en}</span></h3>
          <div className="tags"><span>المدة {p.weeks}</span><span>{p.prog}</span></div></header>
        <p className="aim">{p.aim}</p>
        <div className="tbl"><table><thead><tr>{COLS.map((c) => <th key={c.k}>{c.ar}</th>)}</tr></thead>
          <tbody>{p.rows.map((r) => <tr key={r.ar}>{COLS.map((c) => <td key={c.k}>{r[c.k]}</td>)}</tr>)}</tbody></table></div>
        <p className="note">💡 {p.note}</p>
        <p className="mut">{data.tempoNote}</p>
      </section>
      <section className="glass rmcalc">
        <h2>حاسبة الحِمل من أقصى تكرار <span className="en">1RM & working loads</span></h2>
        <p className="sub">أدخل وزنًا رفعه اللاعب وعدد التكرارات الصحيحة حتى التعب (10 أو أقل)، فتظهر قيمة 1RM التقديرية والأحمال المناسبة لكل هدف.</p>
        <div className="ins"><label>الوزن المرفوع (كجم)<input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} /></label>
          <label>عدد التكرارات<input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} /></label>
          <div className="out"><span>1RM التقديري</span><b>{rm ? roundTo(rm, RM.round) : "—"}</b><small>كجم</small></div></div>
        <div className="bands">{BANDS.map((x, i) => <button key={x.ar} className={i === band ? "on" : ""} onClick={() => setBand(i)}>{x.ar}</button>)}</div>
        <div className="presc"><div><span>التكرارات</span><b>{b.reps}</b></div><div><span>المجموعات</span><b>{b.sets}</b></div><div><span>الشدة</span><b>{b.int}</b></div><div><span>الإيقاع</span><b>{b.tempo}</b></div><div><span>الراحة</span><b>{b.rest}</b></div>
          <div className="ld"><span>الحِمل المقترح</span><b dir="ltr">{rm ? `${roundTo((rm * b.lo) / PCT, RM.round)}–${roundTo((rm * b.hi) / PCT, RM.round)}` : "—"}</b><small>كجم</small></div></div>
        <div className="pgrid">{RM.pcts.map((q) => {
          const inBand = q >= b.lo && q <= b.hi
          return <div key={q} className={inBand ? "in" : ""}><span>{q}%</span><b>{rm ? roundTo((rm * q) / PCT, RM.round) : "—"}</b></div>
        })}</div>
        <p className="mut">{RM.src} الأحمال مقرّبة لأقرب {RM.round} كجم.</p>
      </section>
      <p className="src">المصدر: {data.src}</p>
    </div></div>
  )
}
