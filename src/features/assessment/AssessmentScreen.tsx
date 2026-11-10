// التقييم والحالة البدنية (Assessment & availability) — per team: who is ready today, the five physical tests
// with each player's profile against the team, and skill ratings (1–5) from the platform's skills list.
import { useMemo, useState } from "react"
import "@fontsource/outfit/500.css"
import { Dock } from "@/components/ui/Dock"
import skills from "@/content/legacy-v28/skills.json"
import cfg from "@/features/squad/squad-config.json"
import { useSquadData, type Player, type PlayerStatus, type Team } from "@/features/squad/data"
import { addFitness, addRating, latestBy, setStatus, useAData, type AData } from "./data"
import "./assessment.css"
import { CapButton } from "@/components/ui/CapButton"
import { printWith } from "@/features/auth/caps"
import { TestsBank } from "@/features/tests/TestsBank"
import { LoadWatch } from "./LoadWatch"
import { COMP, TEST, TESTS as BANK, TONE_COLOR, ageOn, derived, rate, type Sex, type Test as BankTest } from "@/features/tests/norms"

interface Skill { id: string; sp: string; cat: string; lvl: number; age: number; ar: { n: string; w: string } }
type Tab = "status" | "fitness" | "load" | "skills" | "bank"

type Test = BankTest
/** The team's test battery (which bank tests appear in the matrix) and the norms' sex, kept on this device. */
const DEFAULT_BATTERY: readonly string[] = ["sp30", "yoyo", "cmj", "ttest", "lj"]
const store = { get: (k: string): string | null => { try { return localStorage.getItem(k) } catch { return null } }, set: (k: string, v: string): void => { try { localStorage.setItem(k, v) } catch { /* private mode */ } } }
function useTeamPref<T>(key: string, init: T): [T, (v: T) => void] {
  const raw = store.get(key)
  const [v, setV] = useState<T>(raw ? (JSON.parse(raw) as T) : init)
  return [v, (n: T): void => { setV(n); store.set(key, JSON.stringify(n)) }]
}
const SKILLS = skills as unknown as Skill[]
const ST = cfg.status as Record<PlayerStatus, { ar: string; en: string; color: string }>
const STATUS_KEYS = Object.keys(ST) as PlayerStatus[]
const TABS: Record<Tab, { ar: string; en: string }> = {
  status: { ar: "الحالة البدنية للاعبين", en: "Availability" }, fitness: { ar: "الاختبارات البدنية", en: "Fitness tests" }, load: { ar: "مراقبة الحِمل", en: "Load monitoring" }, skills: { ar: "المهارات", en: "Skills" }, bank: { ar: "بنك الاختبارات والمعايير", en: "Tests & norms" },
}
const CAT: Record<string, string> = { tech: "مهارات فنية", tact: "مهارات خططية", gk: "حراسة المرمى" }
const SPORT_OF: Record<string, string> = { football: "football", futsal: "futsal", basketball: "basketball", volleyball: "volleyball", handball: "handball" }
const MAX_STAR = 5
const STARS = Array.from({ length: MAX_STAR }, (_, i) => i + 1)
const PCT = 100
const RING_R = 44
const TAU = Math.PI + Math.PI
const RADAR_R = 80
const RADAR_C = 100
const MIN_FOR_RANK = 2
const RINGS = [0.25, 0.5, 0.75, 1]
const MIN_SHAPE = 0.04
const LABEL_GAP = 14
const QUARTER_TURN = Math.PI / MIN_FOR_RANK
const today = (): string => new Date().toISOString().slice(0, "yyyy-mm-dd".length)
const fmt = (v: number, dp: number): string => v.toFixed(dp)

/** 0..1 position of a value among the team's latest values (1 = best in the team). */
function standing(v: number, all: readonly number[], lower: boolean): number {
  if (all.length < MIN_FOR_RANK) return 1
  const better = all.filter((x) => (lower ? x > v : x < v)).length
  return better / (all.length - 1)
}

function Radar({ vals, labels }: { vals: number[]; labels: string[] }): React.JSX.Element {
  const pt = (i: number, r: number): string => {
    const a = (i / vals.length) * TAU - QUARTER_TURN
    return `${RADAR_C + Math.cos(a) * r},${RADAR_C + Math.sin(a) * r}`
  }
  return (
    <svg viewBox="-44 -6 288 212" className="radar">
      {RINGS.map((k) => <polygon key={k} points={vals.map((_, i) => pt(i, RADAR_R * k)).join(" ")} className="grid" />)}
      {vals.map((_, i) => <line key={i} x1={RADAR_C} y1={RADAR_C} x2={pt(i, RADAR_R).split(",")[0]} y2={pt(i, RADAR_R).split(",")[1]} className="grid" />)}
      <polygon points={vals.map((v, i) => pt(i, RADAR_R * Math.max(MIN_SHAPE, v))).join(" ")} className="shape" />
      {labels.map((l, i) => { const [x, y] = pt(i, RADAR_R + LABEL_GAP).split(","); return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle">{l}</text> })}
    </svg>
  )
}

// ---------------- availability ----------------
function Availability({ players, after }: { players: Player[]; after: () => void }): React.JSX.Element {
  const [err, setErr] = useState<string | null>(null)
  const ready = players.filter((p) => p.status === "ready").length
  const pct = players.length ? Math.round((ready / players.length) * PCT) : 0
  const move = async (p: Player, s: PlayerStatus): Promise<void> => {
    const r = await setStatus(p.id, s)
    if (r) setErr(r); else { setErr(null); after() }
  }
  return (
    <div className="av">
      <div className="avring">
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r={RING_R} className="bg" /><circle cx="50" cy="50" r={RING_R} className="fg" strokeDasharray={RING_R * TAU} strokeDashoffset={RING_R * TAU * (1 - pct / PCT)} /></svg>
        <div><b>{pct}%</b><span>{ready} جاهز من {players.length}</span></div>
      </div>
      <div className="cols">{STATUS_KEYS.map((s) => {
        const list = players.filter((p) => p.status === s)
        return (
          <section key={s} style={{ "--c": ST[s].color } as React.CSSProperties}>
            <h5>{ST[s].ar} <span className="en">{ST[s].en}</span><i>{list.length}</i></h5>
            {list.map((p) => (
              <div key={p.id} className="pc">
                <b>{p.shirt_number ?? "–"}</b><span>{p.full_name}</span>
                <div className="mv">{STATUS_KEYS.filter((k) => k !== s).map((k) => <button key={k} title={ST[k].ar} style={{ "--c": ST[k].color } as React.CSSProperties} onClick={() => void move(p, k)}>{ST[k].ar}</button>)}</div>
              </div>
            ))}
          </section>
        )
      })}</div>
      {err && <p className="err">{err}</p>}
    </div>
  )
}

// ---------------- fitness ----------------
function Fitness({ players, data, team, after }: { players: Player[]; data: AData; team: Team; after: () => void }): React.JSX.Element {
  const [sel, setSel] = useState<string | null>(players[0]?.id ?? null)
  const [edit, setEdit] = useState<{ p: string; t: string } | null>(null)
  const [val, setVal] = useState("")
  const [on, setOn] = useState(today())
  const [err, setErr] = useState<string | null>(null)
  const [battery, setBattery] = useTeamPref<string[]>(`im-battery-${team.id}`, [...DEFAULT_BATTERY])
  const [sex, setSex] = useTeamPref<Sex>(`im-team-sex-${team.id}`, "m")
  const [pick, setPick] = useState(false)
  const [report, setReport] = useState(false)
  const TESTS = battery.map((k) => TEST[k]).filter((t): t is Test => !!t)
  const ids = new Set(players.map((p) => p.id))
  const rows = data.fitness.filter((r) => ids.has(r.player_id))
  const last = latestBy(rows, (r) => `${r.player_id}|${r.test_key}`)
  const teamVals = (t: string): number[] => players.map((p) => last.get(`${p.id}|${t}`)?.value).filter((v): v is number => v !== undefined)
  const best = (t: Test): number | null => {
    const v = teamVals(t.k)
    if (!v.length) return null
    return t.lower ? Math.min(...v) : Math.max(...v)
  }
  const ratingOf = (p: Player, t: Test, v: number, when: string): ReturnType<typeof rate> => rate(t, v, { age: ageOn(p.birth_date, new Date(when)), sex, mass: p.weight_kg })
  const save = async (): Promise<void> => {
    if (!edit || val.trim() === "" || Number.isNaN(Number(val))) { setErr("اكتب رقمًا صحيحًا."); return }
    const r = await addFitness(team.org_id, edit.p, edit.t, Number(val), on)
    if (r) setErr(r); else { setErr(null); setEdit(null); setVal(""); after() }
  }
  const toggle = (k: string): void => setBattery(battery.includes(k) ? battery.filter((x) => x !== k) : [...battery, k])
  const sp = players.find((p) => p.id === sel)
  const prof = sp ? TESTS.map((t) => { const v = last.get(`${sp.id}|${t.k}`)?.value; return v === undefined ? 0 : standing(v, teamVals(t.k), t.lower) }) : []
  return (
    <>
    <div className="fbar">
      <button className="btn" onClick={() => setPick(!pick)}>⚙ بطارية الاختبارات ({TESTS.length})</button>
      <div className="sx"><span>معايير:</span>{(["m", "f"] as Sex[]).map((k) => <button key={k} className={k === sex ? "on" : ""} onClick={() => setSex(k)}>{k === "m" ? "بنون / رجال" : "بنات / سيدات"}</button>)}</div>
      {sp && <CapButton cap="reports" className="btn p" onClick={() => setReport(true)}>📄 تقرير اللاعب</CapButton>}
    </div>
    {pick && <div className="bpick">{BANK.map((t) => <label key={t.k} className={battery.includes(t.k) ? "on" : ""} style={{ "--c": COMP[t.c].color } as React.CSSProperties}><input type="checkbox" checked={battery.includes(t.k)} onChange={() => toggle(t.k)} />{t.ar}<small>{COMP[t.c].ar}</small></label>)}</div>}
    <div className="ft">
      <div className="mx">
        <table>
          <thead><tr><th className="pn">اللاعب</th>{TESTS.map((t) => <th key={t.k}>{t.ar}<small>{t.unit} · {t.lower ? "الأقل أفضل" : "الأعلى أفضل"}</small></th>)}</tr></thead>
          <tbody>{players.map((p) => (
            <tr key={p.id} className={p.id === sel ? "on" : ""} onClick={() => setSel(p.id)}>
              <td className="pn"><b>{p.shirt_number ?? "–"}</b>{p.full_name}</td>
              {TESTS.map((t) => {
                const r = last.get(`${p.id}|${t.k}`), b = best(t)
                const lvl = r ? standing(r.value, teamVals(t.k), t.lower) : null
                const nr = r ? ratingOf(p, t, r.value, r.measured_on) : null
                return (
                  <td key={t.k} className={`cell ${r && b === r.value ? "top" : ""}`} title={nr ? `${nr.label} · ${nr.group}` : undefined} onClick={(e) => { e.stopPropagation(); setSel(p.id); setEdit({ p: p.id, t: t.k }); setVal("") }}>
                    {r ? <><b>{fmt(r.value, t.dp)}</b>{nr && <em className="nd" style={{ background: TONE_COLOR[nr.tone] }} />}<i style={{ width: `${Math.round((lvl ?? 0) * PCT)}%` }} /></> : <span className="add">+</span>}
                  </td>
                )
              })}
            </tr>
          ))}</tbody>
        </table>
        <p className="mut legend">الشريط = ترتيب اللاعب داخل الفريق · النقطة الملوّنة = تقييمه وفق المعايير المنشورة (حسب عمره من تاريخ الميلاد)</p>
      </div>
      <aside className="prof">
        {sp ? (
          <>
            <h4>{sp.full_name}</h4>
            <p className="mut">ترتيبه بين زملائه في كل اختبار (الأبعد = الأفضل في الفريق)</p>
            {TESTS.length > MIN_FOR_RANK && <Radar vals={prof} labels={TESTS.map((t) => COMP[t.c].ar)} />}
            {TESTS.map((t) => {
              const hist = rows.filter((r) => r.player_id === sp.id && r.test_key === t.k)
              const lr = hist[hist.length - 1]
              const nr = lr ? ratingOf(sp, t, lr.value, lr.measured_on) : null
              return <div key={t.k} className="hist"><span>{t.ar}{nr && <em style={{ color: TONE_COLOR[nr.tone] }}> · {nr.label}</em>}</span><b>{hist.map((h) => fmt(h.value, t.dp)).join(" ← ") || "—"}</b></div>
            })}
          </>
        ) : <p className="mut">اختر لاعبًا.</p>}
        {edit && (
          <div className="ed">
            <h5>نتيجة جديدة: {TEST[edit.t]?.ar}</h5>
            <div className="r"><input autoFocus inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder={TEST[edit.t]?.unit} /><input type="date" value={on} onChange={(e) => setOn(e.target.value)} /></div>
            <div className="r"><button className="btn" onClick={() => setEdit(null)}>إلغاء</button><button className="btn p" onClick={() => void save()}>حفظ</button></div>
            <a className="mut" href="#/tests">بروتوكول الاختبار ومعاييره ↗</a>
            {err && <p className="err">{err}</p>}
          </div>
        )}
      </aside>
    </div>
    {report && sp && <PlayerReport p={sp} team={team} tests={TESTS} rows={rows.filter((r) => r.player_id === sp.id)} rateIt={ratingOf} close={() => setReport(false)} />}
    </>
  )
}

/** تقرير اللاعب — one printable page: latest result, norm rating and history for every test in the battery. */
function PlayerReport({ p, team, tests, rows, rateIt, close }: {
  p: Player; team: Team; tests: Test[]; rows: AData["fitness"]; close: () => void
  rateIt: (p: Player, t: Test, v: number, when: string) => ReturnType<typeof rate>
}): React.JSX.Element {
  const age = ageOn(p.birth_date)
  return (
    <div className="rep" role="dialog" aria-label="تقرير اللاعب">
      <div className="repc">
        <div className="noprint rbtn"><button className="btn" onClick={close}>✕ إغلاق</button><button className="btn p" onClick={() => printWith("reports")}>🖨 طباعة / حفظ PDF</button></div>
        <header><img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="Instructor Motion" /><div><h2>تقرير الاختبارات البدنية <span className="en">Fitness report</span></h2>
          <p>{p.full_name} · {team.name}{age ? ` · ${age} سنة` : ""}{p.position ? ` · ${p.position}` : ""} · {new Date().toLocaleDateString("ar")}</p></div></header>
        <table>
          <thead><tr><th>الاختبار</th><th>آخر نتيجة</th><th>التاريخ</th><th>التقييم وفق المعايير</th><th>قيمة محسوبة</th><th>التطوّر</th></tr></thead>
          <tbody>{tests.map((t) => {
            const h = rows.filter((r) => r.test_key === t.k)
            const lr = h[h.length - 1]
            const nr = lr ? rateIt(p, t, lr.value, lr.measured_on) : null
            const dv = lr ? derived(t, lr.value, { age, sex: "m", mass: p.weight_kg }) : null
            return (
              <tr key={t.k}><td><b>{t.ar}</b><small>{COMP[t.c].ar}</small></td><td className="num">{lr ? `${fmt(lr.value, t.dp)} ${t.unit}` : "—"}</td><td>{lr ? new Date(lr.measured_on).toLocaleDateString("ar") : "—"}</td>
                <td>{nr ? <span className="tag" style={{ background: TONE_COLOR[nr.tone] }}>{nr.label}{nr.pct !== undefined ? ` · المئين ${nr.pct}` : ""}</span> : "—"}{nr && <small>{nr.group}</small>}</td>
                <td>{dv !== null && t.derive ? `${dv} ${t.derive.unit}` : "—"}</td><td className="num">{h.map((x) => fmt(x.value, t.dp)).join(" ← ") || "—"}</td></tr>
            )
          })}</tbody>
        </table>
        <p className="mut">المعايير من مصادرها المنشورة المذكورة في بنك الاختبارات (NSCA's Guide to Tests and Assessments وغيره). التقييم يعتمد على العمر من تاريخ الميلاد.</p>
      </div>
    </div>
  )
}

// ---------------- skills ----------------
function Skills({ players, data, team, after }: { players: Player[]; data: AData; team: Team; after: () => void }): React.JSX.Element {
  const [sel, setSel] = useState<string | null>(players[0]?.id ?? null)
  const [err, setErr] = useState<string | null>(null)
  const list = SKILLS.filter((s) => s.sp === SPORT_OF[team.sport])
  const last = latestBy(data.ratings.filter((r) => r.player_id === sel), (r) => r.skill_id)
  const cats = [...new Set(list.map((s) => s.cat))]
  const rate = async (skill: string, n: number): Promise<void> => {
    if (!sel) return
    const r = await addRating(team.org_id, sel, skill, n)
    if (r) setErr(r); else { setErr(null); after() }
  }
  if (!list.length) return <p className="mut pad">لا توجد قائمة مهارات لهذه اللعبة بعد. المهارات متاحة حاليًا لكرة القدم وكرة الصالات وكرة السلة والكرة الطائرة وكرة اليد.</p>
  return (
    <div className="sk">
      <nav>{players.map((p) => {
        const n = latestBy(data.ratings.filter((r) => r.player_id === p.id), (r) => r.skill_id).size
        return <button key={p.id} className={p.id === sel ? "on" : ""} onClick={() => setSel(p.id)}><b>{p.shirt_number ?? "–"}</b>{p.full_name}<i>{n}/{list.length}</i></button>
      })}</nav>
      <div className="sl">
        <div className="avg">{cats.map((c) => {
          const rs = list.filter((s) => s.cat === c).map((s) => last.get(s.id)?.rating).filter((v): v is number => v !== undefined)
          const a = rs.length ? rs.reduce((x, y) => x + y, 0) / rs.length : 0
          return <div key={c}><span>{CAT[c] ?? c}</span><b>{rs.length ? a.toFixed(1) : "—"}</b><i><em style={{ width: `${(a / MAX_STAR) * PCT}%` }} /></i></div>
        })}</div>
        {cats.map((c) => (
          <section key={c}><h5>{CAT[c] ?? c}</h5>
            {list.filter((s) => s.cat === c).map((s) => {
              const cur = last.get(s.id)?.rating ?? 0
              return (
                <div key={s.id} className="srow">
                  <div><b>{s.ar.n}</b><span>المستوى {s.lvl} · من سن {s.age}</span></div>
                  <div className="stars">{STARS.map((n) => <button key={n} className={n <= cur ? "on" : ""} onClick={() => void rate(s.id, n)} aria-label={`${n} من 5`}>★</button>)}</div>
                </div>
              )
            })}
          </section>
        ))}
        {err && <p className="err">{err}</p>}
      </div>
    </div>
  )
}

// ---------------- screen ----------------
export function AssessmentScreen(): React.JSX.Element {
  const sq = useSquadData()
  const a = useAData()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("status")
  const teams = useMemo(() => (sq.data?.teams ?? []).filter((t) => t.is_active), [sq.data])
  const team = teams.find((t) => t.id === teamId) ?? teams[0]
  const players = (sq.data?.players ?? []).filter((p) => p.is_active && p.team_id === team?.id)
  const orgName = (id: string): string => sq.data?.orgs.find((o) => o.id === id)?.name_ar ?? ""
  const reload = (): void => { sq.reload(); a.reload() }

  const body = (): React.JSX.Element => {
    if (tab === "bank") return <TestsBank embedded />
    if (sq.error || a.error === "other") return <div className="card msg"><p>حدثت مشكلة في تحميل البيانات.</p><button className="btn" onClick={reload}>إعادة المحاولة</button></div>
    if (!sq.data) return <p className="mut pad">جارٍ التحميل…</p>
    if (!team) return <div className="card msg"><p>لا توجد فرق بعد. أضف فريقًا ولاعبين من «الفرق واللاعبون» أولًا.</p><a className="btn p" href="#/squad">الفرق واللاعبين</a></div>
    if (!players.length) return <div className="card msg"><p>لا يضم هذا الفريق لاعبين بعد.</p><a className="btn p" href="#/squad">أضف لاعبين</a></div>
    if (tab === "status") return <Availability players={players} after={reload} />
    if (tab === "load") return <LoadWatch key={team.id} team={team} players={players} />
    if (a.error === "missing" || !a.data) return <div className="card msg"><p>لم تُضف جداول الاختبارات والتقييم إلى قاعدة البيانات بعد. بعد موافقة المالك يعمل هذا القسم مباشرة.</p></div>
    return tab === "fitness" ? <Fitness key={team.id} players={players} data={a.data} team={team} after={reload} /> : <Skills key={team.id} players={players} data={a.data} team={team} after={reload} />
  }

  return (
    <div className="as">
      <Dock active="assessment" />
      <main>
        <div className="head">
          <div><h1>التقييم والحالة البدنية <span className="en">Assessment</span></h1><p>{BANK.length} اختبارًا في البنك · {SKILLS.length} مهارة · كل نتيجة بتاريخها ليتّضح التطوّر</p></div>
        </div>
        {teams.length > 0 && <div className="teams">{teams.map((t) => <button key={t.id} className={t.id === team?.id ? "on" : ""} onClick={() => setTeamId(t.id)} style={{ "--c": t.color } as React.CSSProperties}><b>{t.name}</b><span>{orgName(t.org_id)}</span></button>)}</div>}
        <div className="tabs">{(Object.keys(TABS) as Tab[]).map((k) => <button key={k} className={k === tab ? "on" : ""} onClick={() => setTab(k)}>{TABS[k].ar} <span className="en">{TABS[k].en}</span></button>)}</div>
        {body()}
      </main>
    </div>
  )
}
