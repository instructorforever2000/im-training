// مركز التعلّم (Learning centre) — rules and knowledge quizzes from the platform question bank,
// one question at a time with the answer explained, a result ring, a review of mistakes and a printable result card.
import { useMemo, useState } from "react"
import { Dock } from "@/components/ui/Dock"
import bank from "@/content/legacy-v28/quiz-bank.json"
import "@fontsource/outfit/500.css"
import "./learning.css"
import "./paths.css"
import { Paths, TOTAL_QS } from "./Paths"

type Lang = "ar" | "en"
interface Q { sp: string; ref: string; ar: string[]; en: string[] }
interface Asked { q: Q; opts: number[]; picked: number | null }
type Mode = "home" | "quiz" | "cards" | "result"

const BANK = bank as Q[]
const CORRECT = 1
const EXPLAIN = 5
const OPTIONS = 4
const OPTION_IDX = Array.from({ length: OPTIONS }, (_, k) => k + CORRECT)
const QUIZ_LEN = 10
const PCT = 100
const RING_R = 52
const TAU = Math.PI + Math.PI
const PASS = 70
const EXCELLENT = 90
const BEST_KEY = "im-learn-best"
const LETTERS = ["أ", "ب", "ج", "د"]
const SP: Record<string, { ar: string; en: string; c: string }> = {
  all: { ar: "الكل", en: "All", c: "#0f8f84" },
  football: { ar: "كرة القدم", en: "Football", c: "#2fa36b" },
  futsal: { ar: "كرة الصالات", en: "Futsal", c: "#1FB5A8" },
  basketball: { ar: "كرة السلة", en: "Basketball", c: "#e0701e" },
  volleyball: { ar: "الكرة الطائرة", en: "Volleyball", c: "#d6a21c" },
  handball: { ar: "كرة اليد", en: "Handball", c: "#5b6fe0" },
  comp: { ar: "البطولات والمسابقات", en: "Competitions", c: "#a77bf3" },
}
const SPORT_KEYS = Object.keys(SP)

/** How an answer button looks once the question is answered. */
function optionState(k: number, picked: number | null): string {
  if (picked === null) return ""
  if (k === CORRECT) return "ok"
  return k === picked ? "no" : "dim"
}
const shuffle = <T,>(a: readonly T[]): T[] => a.map((v) => ({ v, r: Math.random() })).sort((x, y) => x.r - y.r).map((x) => x.v)
const pctOf = (n: number, of: number): number => (of ? Math.round((n / of) * PCT) : 0)

function readBest(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}") as Record<string, number> } catch { return {} }
}
function writeBest(v: Record<string, number>): void {
  try { localStorage.setItem(BEST_KEY, JSON.stringify(v)) } catch { /* private mode: keep it for this visit only */ }
}

const VERDICT: readonly { min: number; ar: string; en: string }[] = [
  { min: EXCELLENT, ar: "ممتاز — فهمٌ متمكّن للقانون", en: "Excellent" },
  { min: PASS, ar: "ناجح — تبقى تفاصيل يسيرة", en: "Pass" },
  { min: 0, ar: "يحتاج إلى مراجعة — راجع الإجابات أدناه", en: "Needs review" },
]

function LawsBank({ lang }: { lang: Lang }): React.JSX.Element {
  const [sport, setSport] = useState("all")
  const [mode, setMode] = useState<Mode>("home")
  const [asked, setAsked] = useState<Asked[]>([])
  const [i, setI] = useState(0)
  const [flip, setFlip] = useState(false)
  const [best, setBest] = useState(readBest)
  const pool = useMemo(() => BANK.filter((q) => sport === "all" || q.sp === sport), [sport])
  const T = (q: Q): string[] => q[lang]

  const start = (m: "quiz" | "cards"): void => {
    setAsked(shuffle(pool).slice(0, m === "quiz" ? QUIZ_LEN : pool.length).map((q) => ({ q, opts: shuffle(OPTION_IDX), picked: null })))
    setI(0); setFlip(false); setMode(m)
  }
  const pick = (k: number): void => {
    if (asked[i].picked !== null) return
    setAsked(asked.map((a, j) => (j === i ? { ...a, picked: k } : a)))
  }
  const right = asked.filter((a) => a.picked === CORRECT).length
  const finish = (): void => {
    const p = pctOf(right, asked.length)
    if (p > (best[sport] ?? 0)) { const nb = { ...best, [sport]: p }; setBest(nb); writeBest(nb) }
    setMode("result")
  }
  const cur = asked[i]
  const score = pctOf(right, asked.length)
  const verdict = VERDICT.find((v) => score >= v.min) ?? VERDICT[VERDICT.length - 1]

  return (
      <>
        {mode === "home" && (
          <>
            <div className="sports">{SPORT_KEYS.map((k) => {
              const n = k === "all" ? BANK.length : BANK.filter((q) => q.sp === k).length
              const b = best[k]
              return (
                <button key={k} className={k === sport ? "on" : ""} style={{ "--c": SP[k].c } as React.CSSProperties} onClick={() => setSport(k)}>
                  <b>{SP[k].ar}</b><span className="en">{SP[k].en}</span><i>{n} سؤال</i>
                  {b !== undefined && <em className="best">أفضل نتيجة {b}%</em>}
                </button>
              )
            })}</div>
            <div className="modes">
              <button className="mode quiz" onClick={() => start("quiz")}>
                <i>✓</i><b>اختبار سريع <span className="en">Quick quiz</span></b>
                <p>{Math.min(QUIZ_LEN, pool.length)} أسئلة عشوائية من «{SP[sport].ar}». تُشرح كل إجابة فورًا، وفي النهاية تظهر نتيجتك ومراجعة أخطائك.</p>
              </button>
              <button className="mode cards" onClick={() => start("cards")}>
                <i>⇆</i><b>بطاقات المراجعة <span className="en">Flashcards</span></b>
                <p>السؤال على وجه البطاقة، والإجابة والشرح على ظهرها. مناسبة للمراجعة قبل الاختبار أو لشرح القانون للاعبين.</p>
              </button>
            </div>
          </>
        )}

        {mode === "quiz" && cur && (
          <section className="qz">
            <div className="prog"><span>{i + 1} / {asked.length}</span><i><em style={{ width: `${pctOf(i + (cur.picked === null ? 0 : 1), asked.length)}%` }} /></i><span className="tag" style={{ "--c": SP[cur.q.sp].c } as React.CSSProperties}>{SP[cur.q.sp].ar}</span></div>
            <h2>{T(cur.q)[0]}</h2>
            <div className="opts">{cur.opts.map((k, n) => {
              const state = optionState(k, cur.picked)
              return <button key={k} className={state} onClick={() => pick(k)}><b>{LETTERS[n]}</b>{T(cur.q)[k]}</button>
            })}</div>
            {cur.picked !== null && (
              <div className={`exp ${cur.picked === CORRECT ? "ok" : "no"}`}>
                <b>{cur.picked === CORRECT ? "إجابة صحيحة ✓" : "إجابة غير صحيحة — الإجابة الصحيحة مظلّلة بالأخضر"}</b>
                <p>{T(cur.q)[EXPLAIN]}</p>
              </div>
            )}
            <div className="nav">
              <button className="btn" onClick={() => setMode("home")}>خروج</button>
              {cur.picked !== null && (i + 1 < asked.length
                ? <button className="btn p" onClick={() => setI(i + 1)}>السؤال التالي ←</button>
                : <button className="btn p" onClick={finish}>عرض النتيجة</button>)}
            </div>
          </section>
        )}

        {mode === "cards" && cur && (
          <section className="fc">
            <div className="prog"><span>{i + 1} / {asked.length}</span><i><em style={{ width: `${pctOf(i + 1, asked.length)}%` }} /></i></div>
            <button className={`card3 ${flip ? "flip" : ""}`} onClick={() => setFlip(!flip)}>
              <div className="face front"><span className="tag" style={{ "--c": SP[cur.q.sp].c } as React.CSSProperties}>{SP[cur.q.sp].ar}</span><h2>{T(cur.q)[0]}</h2><small>اضغط لقلب البطاقة</small></div>
              <div className="face back"><b>{T(cur.q)[CORRECT]}</b><p>{T(cur.q)[EXPLAIN]}</p></div>
            </button>
            <div className="nav">
              <button className="btn" onClick={() => setMode("home")}>خروج</button>
              <button className="btn" disabled={i === 0} onClick={() => { setI(i - 1); setFlip(false) }}>→ السابقة</button>
              <button className="btn p" disabled={i + 1 >= asked.length} onClick={() => { setI(i + 1); setFlip(false) }}>التالية ←</button>
            </div>
          </section>
        )}

        {mode === "result" && (
          <section className="res">
            <div className="rc printable">
              <div className="lring">
                <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r={RING_R} className="bg" /><circle cx="60" cy="60" r={RING_R} className="fg" strokeDasharray={RING_R * TAU} strokeDashoffset={RING_R * TAU * (1 - score / PCT)} /></svg>
                <div><b>{score}%</b><span>{right} من {asked.length}</span></div>
              </div>
              <h2>{verdict.ar}</h2>
              <p className="mut">{SP[sport].ar} · {new Date().toLocaleDateString("ar-EG")}</p>
              <p className="sig">Instructor: Mohamed Ayad · IM Training</p>
            </div>
            <div className="rev">
              <h3>مراجعة الإجابات <span className="en">Review</span></h3>
              {asked.map((a, n) => (
                <div key={n} className={a.picked === CORRECT ? "ok" : "no"}>
                  <b>{n + 1}. {T(a.q)[0]}</b>
                  {a.picked !== CORRECT && a.picked !== null && <span className="wrong">إجابتك: {T(a.q)[a.picked]}</span>}
                  <span className="right">الصح: {T(a.q)[CORRECT]}</span>
                  <p>{T(a.q)[EXPLAIN]}</p>
                </div>
              ))}
            </div>
            <div className="nav">
              <button className="btn" onClick={() => setMode("home")}>رجوع</button>
              <button className="btn" onClick={() => window.print()}>🖨 طباعة النتيجة</button>
              <button className="btn p" onClick={() => start("quiz")}>اختبار جديد</button>
            </div>
          </section>
        )}
      </>
  )
}

type Tab = "paths" | "bank"
export function LearningScreen(): React.JSX.Element {
  const [lang, setLang] = useState<Lang>("ar")
  const [tab, setTab] = useState<Tab>("paths")
  return (
    <div className="lc" dir={lang === "ar" ? "rtl" : "ltr"}>
      <Dock active="learning" />
      <main>
        <header className="top">
          <div><h1>مركز التعلّم <span className="en">Learning centre</span></h1>
            <p>مسارات تعلّم حسب الدور بمستويات متدرجة، وحالات تطبيقية على الملعب ثلاثي الأبعاد، وشهادة لكل مستوى · {TOTAL_QS} سؤالًا بإجابات مشروحة</p></div>
          <div className="seg"><button className={tab === "paths" ? "on" : ""} onClick={() => setTab("paths")}>المسارات</button><button className={tab === "bank" ? "on" : ""} onClick={() => setTab("bank")}>بنك القوانين</button></div>
          <div className="seg"><button className={lang === "ar" ? "on" : ""} onClick={() => setLang("ar")}>ع</button><button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button></div>
        </header>
        {tab === "paths" ? <Paths /> : <LawsBank lang={lang} />}
      </main>
    </div>
  )
}
