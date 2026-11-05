// مركز التعلّم — role learning paths (Coach · Player · Referee · PE teacher · Fitness coach), graded levels, applied cases on the 3D pitch, certificates.
// Approved direction (Nov 2026): the curriculum reads like a professional coaching manual (C) with mastery rings (B).
import { useEffect, useMemo, useState } from "react"
import { pushName, pushUnit, syncProgress } from "./progressCloud"
import cur from "./curriculum.json"
import lessonsA from "./lessons-a.json"
import lessonsB from "./lessons-b.json"
import lessonsC from "./lessons-c.json"
import { LAW_BANK } from "./LawBank"
import { DRILLS } from "@/features/library/content"
import { DrillImage } from "@/features/library/DrillImage"
import { PASS_PCT, certCode, loadProgress, passed, recordUnit, setName, type Progress } from "./progress"
import { CapButton } from "@/components/ui/CapButton"
import { printWith } from "@/features/auth/caps"

type QRow = readonly [string, string, string, string, string, string]
interface Case { readonly drill?: string; readonly roles?: boolean; readonly ar: string; readonly q: QRow }
interface Unit { readonly ar: string; readonly en: string; readonly topic: string; readonly pts: readonly string[]; readonly qs?: readonly QRow[]; readonly bank?: readonly string[]; readonly case?: Case }
interface Level { readonly ar: string; readonly en: string; readonly units: readonly string[] }
interface Path { readonly key: string; readonly ar: string; readonly en: string; readonly icon: string; readonly about: string; readonly levels: readonly Level[] }
interface Topic { readonly ar: string; readonly en: string; readonly c: string }

const TOPICS = cur.topics as Record<string, Topic>
const PATHS = cur.paths as readonly Path[]
const UNITS = cur.units as unknown as Record<string, Unit>
interface Lesson { readonly intro: string; readonly sections: readonly { h: string; p: string }[]; readonly refs?: readonly string[] }
const LESSONS = { ...lessonsA, ...lessonsB, ...lessonsC } as unknown as Record<string, Lesson>
/** A unit test draws at most this many questions (law units have dozens in the bank). */
const UNIT_QUIZ_MAX = 15
const PCT = 100
const RING_R = 26
const HALF_TURNS = 2
const TAU = Math.PI * HALF_TURNS
const LETTERS = ["أ", "ب", "ج", "د"] as const

type View = { v: "home" } | { v: "path" } | { v: "unit"; id: string } | { v: "cert"; path: string; level: number }

const unitQs = (u: Unit): readonly QRow[] => [...(u.qs ?? []), ...(u.bank ?? []).flatMap((sp) => LAW_BANK.filter((b) => b.sp === sp).map((b) => b.row))]
/** Every question across the pathways (unit questions + law banks + applied cases), shown in the header. */
export const TOTAL_QS = Object.values(UNITS).reduce((a, u) => a + unitQs(u).length + (u.case ? 1 : 0), 0)
const levelDone = (p: Progress, l: Level): boolean => l.units.every((id) => passed(p, id))
const pathPct = (p: Progress, path: Path): number => { const ids = path.levels.flatMap((l) => l.units); return Math.round((ids.filter((id) => passed(p, id)).length / ids.length) * PCT) }

/** Option state after answering: the right answer, the wrong pick, or the rest. */
function optClass(o: string, pick: string, right: string): string {
  if (!pick) return ""
  if (o === right) return "ok"
  return o === pick ? "no" : "dim"
}

function shuffle<T>(xs: readonly T[]): T[] {
  return xs.map((x) => ({ x, k: Math.random() })).sort((a, b) => a.k - b.k).map((o) => o.x)
}

function Ring({ pct, c }: { pct: number; c: string }): React.JSX.Element {
  const len = TAU * RING_R
  return (
    <span className="pring" style={{ "--c": c } as React.CSSProperties}>
      <svg viewBox="0 0 64 64"><circle cx="32" cy="32" r={RING_R} className="bg" /><circle cx="32" cy="32" r={RING_R} className="fg" strokeDasharray={`${(len * pct) / PCT} ${len}`} /></svg>
      <b>{pct}<small>%</small></b>
    </span>
  )
}

export function Paths(): React.JSX.Element {
  const [prog, setProg] = useState<Progress>(loadProgress)
  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => { const merged = await syncProgress(loadProgress()); if (alive && merged) setProg(merged) }
    void run()
    return () => { alive = false }
  }, [])
  const [pathKey, setPathKey] = useState<string>(PATHS[0].key)
  const [view, setView] = useState<View>({ v: "home" })
  const path = PATHS.find((p) => p.key === pathKey) ?? PATHS[0]
  if (view.v === "unit") return <UnitView id={view.id} prog={prog} done={(pct) => { setProg((p) => recordUnit(p, view.id, pct)); if (pct > (prog.units[view.id]?.best ?? -1)) void pushUnit(view.id, pct) }} back={() => setView({ v: "path" })} />
  if (view.v === "cert") return <Certificate path={PATHS.find((p) => p.key === view.path) ?? path} level={view.level} prog={prog} rename={(n) => { setProg((p) => setName(p, n)); void pushName(n) }} back={() => setView({ v: "path" })} />
  if (view.v === "home") return (
    <div className="lp">
      <p className="lpintro">اختر مسارك حسب دورك. كل مسار ثلاثة مستويات، وكل مستوى وحدتان؛ والوحدة درس مفصّل، ثم حالة تطبيقية على الملعب ثلاثي الأبعاد، ثم اختبار. وعند اجتياز وحدتي المستوى تحصل على شهادة.</p>
      <div className="roles4 big">
        {PATHS.map((p) => (
          <button key={p.key} onClick={() => { setPathKey(p.key); setView({ v: "path" }) }}>
            <Ring pct={pathPct(prog, p)} c="var(--teal)" />
            <span><i>{p.icon}</i><b>{p.ar}</b><span className="en">{p.en}</span><small>{p.levels.length} مستويات · {p.levels.flatMap((l) => l.units).length} وحدات</small><em>{p.about}</em><strong>ادخل المسار ←</strong></span>
          </button>
        ))}
      </div>
    </div>
  )
  return (
    <div className="lp">
      <div className="pbar"><button className="btn" onClick={() => setView({ v: "home" })}>→ كل المسارات</button></div>
      <div className="roles4">
        {PATHS.map((p) => (
          <button key={p.key} className={p.key === pathKey ? "on" : ""} onClick={() => setPathKey(p.key)}>
            <Ring pct={pathPct(prog, p)} c="var(--teal)" />
            <span><i>{p.icon}</i><b>{p.ar}</b><span className="en">{p.en}</span><small>{p.levels.length} مستويات · {p.levels.flatMap((l) => l.units).length} وحدات</small></span>
          </button>
        ))}
      </div>
      <section className="manual">
        <header><div><span className="eyebrow">مسار {path.ar} <span className="en">{path.en} pathway</span></span><h2>{path.about}</h2></div>
          <span className="passnote">النجاح في الوحدة: {PASS_PCT}% فأكثر · الشهادة عند إتمام وحدات المستوى</span></header>
        {path.levels.map((l, li) => {
          const done = levelDone(prog, l)
          return (
            <div key={l.en} className={`lvl${done ? " done" : ""}`}>
              <div className="lh"><span className="no">{li + 1}</span><div><b>{l.ar}</b><span className="en">{l.en}</span></div>
                <button className="certbtn" disabled={!done} onClick={() => setView({ v: "cert", path: path.key, level: li })} title={done ? "" : "أتمّ وحدات المستوى لفتح الشهادة"}>{done ? "🏅 الشهادة" : "🔒 الشهادة"}</button></div>
              {l.units.map((id, ui) => {
                const u = UNITS[id], t = TOPICS[u.topic], best = prog.units[id]?.best
                return (
                  <button key={id} className="urow" onClick={() => setView({ v: "unit", id })} style={{ "--c": t.c } as React.CSSProperties}>
                    <span className="ref">{li + 1}.{ui + 1}</span>
                    <span className="ut"><b>{u.ar}</b><span className="en">{u.en}</span></span>
                    <span className="tp">{t.ar}</span>
                    <span className="meta">{u.pts.length} نقاط · {unitQs(u).length} سؤالًا{u.case ? " · حالة تطبيقية" : ""}</span>
                    <span className={`st${passed(prog, id) ? " ok" : ""}`}>{best === undefined ? "ابدأ ←" : `${best}%${passed(prog, id) ? " ✓" : ""}`}</span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </section>
    </div>
  )
}

// ---------------- One unit: lesson → applied case → quiz ----------------
type Step = "lesson" | "case" | "quiz" | "result"
interface Asked { readonly q: string; readonly opts: readonly string[]; readonly right: string; readonly exp: string }
const ask = (r: QRow): Asked => ({ q: r[0], right: r[1], exp: r[5], opts: shuffle([r[1], r[2], r[3], r[4]]) })

function UnitView({ id, prog, done, back }: { id: string; prog: Progress; done: (pct: number) => void; back: () => void }): React.JSX.Element {
  const u = UNITS[id], t = TOPICS[u.topic]
  const [step, setStep] = useState<Step>("lesson")
  const qs = useMemo(() => shuffle(unitQs(u)).slice(0, UNIT_QUIZ_MAX).map(ask), [u])
  const caseQ = useMemo(() => (u.case ? ask(u.case.q) : null), [u])
  const drill = u.case?.drill ? DRILLS.find((d) => d.id === u.case?.drill) : undefined
  const [i, setI] = useState(0)
  const [picks, setPicks] = useState<string[]>([])
  const [casePick, setCasePick] = useState("")
  const score = picks.filter((p, k) => p === qs[k]?.right).length
  const pct = qs.length ? Math.round((score / qs.length) * PCT) : 0
  const cur = qs[i], picked = picks[i]
  const next = (): void => { if (i + 1 < qs.length) { setI(i + 1); return } done(pct); setStep("result") }
  const steps: readonly [Step, string][] = [["lesson", "الدرس"], ...(u.case ? [["case", "حالة تطبيقية"] as [Step, string]] : []), ["quiz", "الاختبار"]]
  return (
    <div className="lp unit" style={{ "--c": t.c } as React.CSSProperties}>
      <div className="ubar"><button className="btn" onClick={back}>→ المسار</button>
        <div><span className="tag">{t.ar} · {t.en}</span><h2>{u.ar} <span className="en">{u.en}</span></h2></div>
        <ol className="steps">{steps.map(([k, label], n) => <li key={k} className={k === step || (step === "result" && k === "quiz") ? "on" : ""}><b>{n + 1}</b>{label}</li>)}</ol></div>

      {step === "lesson" && (
        <section className="lesson">
          {LESSONS[id] && <p className="lintro">{LESSONS[id].intro}</p>}
          {LESSONS[id]?.sections.map((x, k) => <article key={x.h} className="lsec"><h3><b>{k + 1}</b>{x.h}</h3><p>{x.p}</p></article>)}
          <div className="lsum"><h3>خلاصة النقاط الأساسية <span className="en">Key points</span></h3>
            <ol>{u.pts.map((p) => <li key={p}>{p}</li>)}</ol></div>
          {LESSONS[id]?.refs && <p className="lrefs">المراجع: {LESSONS[id].refs?.join(" · ")}</p>}
          <div className="nav"><button className="btn p" onClick={() => setStep(u.case ? "case" : "quiz")}>{u.case ? "الحالة التطبيقية ←" : "ابدأ الاختبار ←"}</button></div>
        </section>
      )}

      {step === "case" && u.case && caseQ && (
        <section className="case">
          <div className="cvis">
            {drill ? <DrillImage d={drill} dark={false} alt={drill.ar.name} /> : <a className="rolelink" href="#/roles">افتح المراكز والأدوار ثلاثية الأبعاد ↗</a>}
            {drill && <a className="dlink" href="#/library">{drill.ar.name} · افتحه في المكتبة ↗</a>}
          </div>
          <div className="cq">
            <span className="eyebrow">الموقف <span className="en">Scenario</span></span>
            <p className="sc">{u.case.ar}</p>
            <h3>{caseQ.q}</h3>
            <div className="opts">{caseQ.opts.map((o, k) => {
              const cls = optClass(o, casePick, caseQ.right)
              return <button key={o} className={cls} disabled={Boolean(casePick)} onClick={() => setCasePick(o)}><b>{LETTERS[k]}</b>{o}</button>
            })}</div>
            {casePick && <div className={`exp ${casePick === caseQ.right ? "ok" : "no"}`}><b>{casePick === caseQ.right ? "قرار صحيح ✓" : "القرار الأنسب مظلّل بالأخضر"}</b><p>{caseQ.exp}</p></div>}
            <div className="nav"><button className="btn p" disabled={!casePick} onClick={() => setStep("quiz")}>ابدأ الاختبار ←</button></div>
          </div>
        </section>
      )}

      {step === "quiz" && cur && (
        <section className="qz">
          <div className="prog"><span>{i + 1} / {qs.length}</span><i><em style={{ width: `${((i + 1) / qs.length) * PCT}%` }} /></i></div>
          <h2>{cur.q}</h2>
          <div className="opts">{cur.opts.map((o, k) => {
            const cls = optClass(o, picked ?? "", cur.right)
            return <button key={o} className={cls} disabled={Boolean(picked)} onClick={() => setPicks([...picks.slice(0, i), o])}><b>{LETTERS[k]}</b>{o}</button>
          })}</div>
          {picked && <div className={`exp ${picked === cur.right ? "ok" : "no"}`}><b>{picked === cur.right ? "إجابة صحيحة ✓" : "إجابة غير صحيحة — الصحيحة مظلّلة بالأخضر"}</b><p>{cur.exp}</p></div>}
          <div className="nav"><button className="btn p" disabled={!picked} onClick={next}>{i + 1 < qs.length ? "السؤال التالي ←" : "عرض النتيجة"}</button></div>
        </section>
      )}

      {step === "result" && (
        <section className="rc">
          <Ring pct={pct} c={pct >= PASS_PCT ? "var(--green)" : "var(--red)"} />
          <h3>{pct >= PASS_PCT ? "اجتزت الوحدة ✓" : `تحتاج إلى ${PASS_PCT}% لاجتياز الوحدة`}</h3>
          <p className="mut">{score} إجابات صحيحة من {qs.length} · أفضل نتيجة محفوظة: {Math.max(pct, prog.units[id]?.best ?? 0)}%</p>
          <div className="nav"><button className="btn" onClick={() => { setI(0); setPicks([]); setCasePick(""); setStep("lesson") }}>أعد الوحدة</button><button className="btn p" onClick={back}>العودة إلى المسار</button></div>
        </section>
      )}
    </div>
  )
}

// ---------------- Certificate ----------------
function Certificate({ path, level, prog, rename, back }: { path: Path; level: number; prog: Progress; rename: (n: string) => void; back: () => void }): React.JSX.Element {
  const l = path.levels[level]
  const dates = l.units.map((id) => prog.units[id]?.at ?? "").sort()
  const date = (dates[dates.length - 1] ?? new Date().toISOString()).slice(0, "YYYY-MM-DD".length)
  const name = prog.name.trim()
  const code = certCode(name, `${path.key}-${level}`, date)
  const avg = Math.round(l.units.reduce((a, id) => a + (prog.units[id]?.best ?? 0), 0) / l.units.length)
  return (
    <div className="lp certv">
      <div className="nav noprint"><button className="btn" onClick={back}>→ المسار</button>
        <label className="nm">اسم صاحب الشهادة<input value={prog.name} onChange={(e) => rename(e.target.value)} placeholder="اكتب الاسم كما يظهر في الشهادة" /></label>
        <CapButton cap="certificates" className="btn p" disabled={!name} onClick={() => printWith("certificates")}>🖨 طباعة / حفظ PDF</CapButton></div>
      <article className="cert">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="Instructor Motion" />
        <span className="eyebrow">شهادة إتمام مستوى <span className="en">Certificate of completion</span></span>
        <h1>{name || "—"}</h1>
        <p>أتمّ بنجاح <b>{l.ar}</b> في مسار <b>{path.ar}</b> بمنصة IM Training، بمتوسط {avg}%.</p>
        <p className="en">has successfully completed {l.en} of the {path.en} pathway on IM Training.</p>
        <ul>{l.units.map((id) => <li key={id}>{UNITS[id].ar} <span className="en">{UNITS[id].en}</span> · {prog.units[id]?.best ?? 0}%</li>)}</ul>
        <footer><div><b>Instructor: Mohamed Ayad</b><span>مشرف التربية البدنية</span></div><div><b>{date}</b><span>رمز التحقق {code}</span></div></footer>
      </article>
    </div>
  )
}
