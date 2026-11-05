// بنك القوانين (Laws bank) — every rules question of the platform, organised by sport and by law/chapter:
// a timed-free quiz of any length, flip cards for revision, and a study view that lists every question with its explanation.
import { useMemo, useState } from "react"
import legacy from "@/content/legacy-v28/quiz-bank.json"
import cur from "./curriculum.json"
import football from "./laws/football.json"
import futsal from "./laws/futsal.json"
import basketball from "./laws/basketball.json"
import handball from "./laws/handball.json"
import volleyball from "./laws/volleyball.json"
import comp from "./laws/comp.json"
import { CapButton } from "@/components/ui/CapButton"
import { printWith } from "@/features/auth/caps"

type Row = readonly [string, string, string, string, string, string]
export interface LawQ { readonly sp: string; readonly ch: string; readonly row: Row }
type Mode = "home" | "quiz" | "cards" | "study" | "result"

const GENERAL = "أسئلة عامة"
const MIXED = "مواقف متنوعة"
const FILES: Record<string, readonly { ch: string; q: Row }[]> = { football, futsal, basketball, handball, volleyball, comp } as unknown as Record<string, readonly { ch: string; q: Row }[]>
export const LAW_BANK: readonly LawQ[] = [
  ...(legacy as unknown as readonly { sp: string; ar: Row }[]).map((x) => ({ sp: x.sp, ch: GENERAL, row: x.ar })),
  ...Object.entries(cur.lawBank as unknown as Record<string, readonly Row[]>).flatMap(([sp, rows]) => rows.map((row) => ({ sp, ch: MIXED, row }))),
  ...Object.entries(FILES).flatMap(([sp, rows]) => rows.map((r) => ({ sp, ch: r.ch, row: r.q }))),
]
const SP: Record<string, { ar: string; en: string; c: string }> = {
  football: { ar: "كرة القدم", en: "Football · IFAB", c: "#2fa36b" },
  futsal: { ar: "كرة الصالات", en: "Futsal · FIFA", c: "#1FB5A8" },
  basketball: { ar: "كرة السلة", en: "Basketball · FIBA", c: "#e0701e" },
  handball: { ar: "كرة اليد", en: "Handball · IHF", c: "#5b6fe0" },
  volleyball: { ar: "الكرة الطائرة", en: "Volleyball · FIVB", c: "#d6a21c" },
  comp: { ar: "البطولات والمسابقات", en: "Competitions", c: "#a77bf3" },
}
const ALL = "all"
const STEP = 10
const LENGTHS = [STEP, STEP + STEP, STEP + STEP + STEP] as const
const LETTERS = ["أ", "ب", "ج", "د"] as const
const PCT = 100
const PASS = 70
const EXCELLENT = 90
const RING_R = 52
const VERDICTS = [{ min: EXCELLENT, ar: "ممتاز — فهمٌ متمكّن للقانون" }, { min: PASS, ar: "ناجح — تبقى تفاصيل يسيرة" }, { min: 0, ar: "يحتاج إلى مراجعة — راجع الإجابات أدناه" }] as const
const HALF_TURNS = 2
const TAU = Math.PI * HALF_TURNS

interface Asked { readonly q: LawQ; readonly opts: readonly string[] }
const shuffle = <T,>(a: readonly T[]): T[] => a.map((v) => ({ v, r: Math.random() })).sort((x, y) => x.r - y.r).map((x) => x.v)
const ask = (q: LawQ): Asked => ({ q, opts: shuffle([q.row[1], q.row[2], q.row[3], q.row[4]]) })
function optClass(o: string, pick: string | undefined, right: string): string {
  if (!pick) return ""
  if (o === right) return "ok"
  return o === pick ? "no" : "dim"
}
// Law number inside a chapter title: "القانون 12 · الأخطاء" → "12"; "الملعب والكرة" → no match.
// https://regex101.com/?flavor=javascript&regex=%5Cd%2B&testString=%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86%2012
const NUM_RE = /\d+/
/** Numbered laws first (1, 2 … 17), then named chapters, then general and mixed questions. */
function chOrder(ch: string): number {
  const n = NUM_RE.exec(ch)
  if (n) return Number(n[0])
  return ch === GENERAL || ch === MIXED ? PCT + 1 : PCT
}

export function LawBank(): React.JSX.Element {
  const [sp, setSp] = useState<string>("football")
  const [ch, setCh] = useState<string>(ALL)
  const [mode, setMode] = useState<Mode>("home")
  const [len, setLen] = useState<number>(LENGTHS[0])
  const [qs, setQs] = useState<Asked[]>([])
  const [i, setI] = useState(0)
  const [picks, setPicks] = useState<string[]>([])
  const [flip, setFlip] = useState(false)
  const pool = useMemo(() => LAW_BANK.filter((q) => q.sp === sp && (ch === ALL || q.ch === ch)), [sp, ch])
  const chapters = useMemo(() => [...new Set(LAW_BANK.filter((q) => q.sp === sp).map((q) => q.ch))].sort((a, b) => chOrder(a) - chOrder(b)), [sp])
  const start = (m: Mode): void => { setQs(shuffle(pool).slice(0, m === "quiz" ? len : pool.length).map(ask)); setI(0); setPicks([]); setFlip(false); setMode(m) }
  const home = (): void => setMode("home")
  const score = picks.filter((p, k) => p === qs[k]?.q.row[1]).length
  const pct = qs.length ? Math.round((score / qs.length) * PCT) : 0
  const c = SP[sp].c

  if (mode === "home") return (
    <div className="lb">
      <div className="lbsports">{Object.entries(SP).map(([k, v]) => (
        <button key={k} className={k === sp ? "on" : ""} style={{ "--c": v.c } as React.CSSProperties} onClick={() => { setSp(k); setCh(ALL) }}>
          <b>{v.ar}</b><span className="en">{v.en}</span><i>{LAW_BANK.filter((q) => q.sp === k).length} سؤالًا</i></button>))}</div>
      <section className="lbpanel" style={{ "--c": c } as React.CSSProperties}>
        <div className="lbch"><span className="lbl">مواد القانون <span className="en">Law chapters</span></span>
          <div className="chips"><button className={`chip${ch === ALL ? " on" : ""}`} onClick={() => setCh(ALL)}>كل المواد <small>{LAW_BANK.filter((q) => q.sp === sp).length}</small></button>
            {chapters.map((x) => <button key={x} className={`chip${ch === x ? " on" : ""}`} onClick={() => setCh(x)}>{x} <small>{LAW_BANK.filter((q) => q.sp === sp && q.ch === x).length}</small></button>)}</div></div>
        <div className="lbmodes">
          <div className="lbmode q"><i>✓</i><b>اختبار</b><p>أسئلة عشوائية من المادة المختارة، مع شرح كل إجابة فورًا ونتيجة قابلة للطباعة.</p>
            <div className="seg">{LENGTHS.map((n) => <button key={n} className={len === n ? "on" : ""} onClick={() => setLen(n)}>{n}</button>)}<button className={len === pool.length ? "on" : ""} onClick={() => setLen(pool.length)}>الكل</button></div>
            <button className="btn p" disabled={!pool.length} onClick={() => start("quiz")}>ابدأ الاختبار ({Math.min(len, pool.length)} سؤالًا) ←</button></div>
          <div className="lbmode c"><i>⇋</i><b>بطاقات المراجعة</b><p>السؤال على وجه البطاقة، والإجابة والشرح على ظهرها. مناسبة للمراجعة السريعة وشرح القانون للاعبين.</p>
            <button className="btn p" disabled={!pool.length} onClick={() => start("cards")}>ابدأ المراجعة ←</button></div>
          <div className="lbmode s"><i>☰</i><b>تصفّح ودراسة</b><p>كل أسئلة المادة بإجاباتها الصحيحة وشروحها، مرتبة حسب مواد القانون.</p>
            <button className="btn p" disabled={!pool.length} onClick={() => setMode("study")}>افتح قائمة الدراسة ←</button></div>
        </div>
      </section>
    </div>
  )

  const bar = (
    <div className="lbbar"><button className="btn" onClick={home}>→ رجوع إلى البنك</button>
      <span className="tag" style={{ "--c": c } as React.CSSProperties}>{SP[sp].ar} · {ch === ALL ? "كل المواد" : ch}</span></div>
  )

  if (mode === "study") {
    const groups = [...new Set(pool.map((q) => q.ch))].sort((a, b) => chOrder(a) - chOrder(b))
    return (
      <div className="lb">{bar}
        {groups.map((g) => (
          <section key={g} className="lbstudy"><h3>{g} <small>{pool.filter((q) => q.ch === g).length}</small></h3>
            {pool.filter((q) => q.ch === g).map((q) => (
              <details key={q.row[0]}><summary>{q.row[0]}</summary><p className="right">✓ {q.row[1]}</p><p>{q.row[5]}</p></details>))}
          </section>))}
      </div>
    )
  }

  if (mode === "cards") {
    const cq = qs[i]
    return (
      <div className="lb">{bar}
        <div className="fc">
          <div className="prog"><span>{i + 1} / {qs.length}</span><i><em style={{ width: `${((i + 1) / qs.length) * PCT}%` }} /></i></div>
          <button className={`card3${flip ? " flip" : ""}`} onClick={() => setFlip(!flip)}>
            <div className="face front"><span className="tag" style={{ "--c": c } as React.CSSProperties}>{cq?.q.ch}</span><h2>{cq?.q.row[0]}</h2><small>اضغط لقلب البطاقة</small></div>
            <div className="face back"><b>{cq?.q.row[1]}</b><p>{cq?.q.row[5]}</p></div>
          </button>
          <div className="nav"><button className="btn" disabled={i === 0} onClick={() => { setFlip(false); setI(i - 1) }}>→ السابقة</button>
            <button className="btn p" onClick={() => { setFlip(false); if (i + 1 < qs.length) setI(i + 1); else home() }}>{i + 1 < qs.length ? "التالية ←" : "إنهاء المراجعة"}</button></div>
        </div>
      </div>
    )
  }

  if (mode === "quiz") {
    const cq = qs[i], picked = picks[i]
    return (
      <div className="lb">{bar}
        <section className="qz">
          <div className="prog"><span>{i + 1} / {qs.length}</span><i><em style={{ width: `${((i + 1) / qs.length) * PCT}%` }} /></i></div>
          <span className="tag" style={{ "--c": c } as React.CSSProperties}>{cq.q.ch}</span>
          <h2>{cq.q.row[0]}</h2>
          <div className="opts">{cq.opts.map((o, k) => <button key={o} className={optClass(o, picked, cq.q.row[1])} disabled={Boolean(picked)} onClick={() => setPicks([...picks.slice(0, i), o])}><b>{LETTERS[k]}</b>{o}</button>)}</div>
          {picked && <div className={`exp ${picked === cq.q.row[1] ? "ok" : "no"}`}><b>{picked === cq.q.row[1] ? "إجابة صحيحة ✓" : "إجابة غير صحيحة — الصحيحة مظلّلة بالأخضر"}</b><p>{cq.q.row[5]}</p></div>}
          <div className="nav"><button className="btn p" disabled={!picked} onClick={() => { if (i + 1 < qs.length) setI(i + 1); else setMode("result") }}>{i + 1 < qs.length ? "السؤال التالي ←" : "عرض النتيجة"}</button></div>
        </section>
      </div>
    )
  }

  const len2 = TAU * RING_R
  const verdict = VERDICTS.find((v) => pct >= v.min)?.ar ?? VERDICTS[VERDICTS.length - 1].ar
  return (
    <div className="lb">{bar}
      <section className="res">
        <div className="rc">
          <div className="lring"><svg viewBox="0 0 120 120"><circle className="bg" cx="60" cy="60" r={RING_R} /><circle className="fg" cx="60" cy="60" r={RING_R} strokeDasharray={len2} strokeDashoffset={len2 * (1 - pct / PCT)} /></svg>
            <div><b>{pct}%</b><span>{score} من {qs.length}</span></div></div>
          <h3>{verdict}</h3><p className="mut">{SP[sp].ar} · {ch === ALL ? "كل المواد" : ch}</p>
          <div className="nav"><CapButton cap="print" className="btn" onClick={() => printWith("print")}>🖨 طباعة النتيجة</CapButton><button className="btn p" onClick={() => start("quiz")}>اختبار جديد</button></div>
        </div>
        <div className="rev"><h3>مراجعة الإجابات</h3>
          {qs.map((q, k) => { const ok = picks[k] === q.q.row[1]; return (
            <div key={q.q.row[0]} className={ok ? "" : "no"}><b>{k + 1}. {q.q.row[0]}</b>
              {!ok && <span className="wrong">إجابتك: {picks[k]}</span>}<span className="right">الصحيحة: {q.q.row[1]}</span><p>{q.q.row[5]}</p></div>) })}</div>
      </section>
    </div>
  )
}
