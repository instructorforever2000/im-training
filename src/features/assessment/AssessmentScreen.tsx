// التقييم والحالة البدنية (Assessment & availability) — per team: who is ready today, the five physical tests
// with each player's profile against the team, and skill ratings (1–5) from the platform's skills list.
import { useMemo, useState } from "react"
import "@fontsource/outfit/500.css"
import { Dock } from "@/components/ui/Dock"
import tests from "@/content/legacy-v28/fitness-tests.json"
import skills from "@/content/legacy-v28/skills.json"
import cfg from "@/features/squad/squad-config.json"
import { useSquadData, type Player, type PlayerStatus, type Team } from "@/features/squad/data"
import { addFitness, addRating, latestBy, setStatus, useAData, type AData } from "./data"
import "./assessment.css"

interface Test { k: string; name: { ar: string; en: string }; unit: { ar: string; en: string }; lower: boolean; dp: number }
interface Skill { id: string; sp: string; cat: string; lvl: number; age: number; ar: { n: string; w: string } }
type Tab = "status" | "fitness" | "skills"

const TESTS = tests as Test[]
const SKILLS = skills as unknown as Skill[]
const ST = cfg.status as Record<PlayerStatus, { ar: string; en: string; color: string }>
const STATUS_KEYS = Object.keys(ST) as PlayerStatus[]
const TABS: Record<Tab, { ar: string; en: string }> = {
  status: { ar: "الحالة البدنية للاعبين", en: "Availability" }, fitness: { ar: "الاختبارات البدنية", en: "Fitness tests" }, skills: { ar: "المهارات", en: "Skills" },
}
/** Short radar labels — what each test measures. */
const MEASURES: Record<string, string> = { sp30: "السرعة", yoyo: "التحمّل", cmj: "القوة الانفجارية", ttest: "الرشاقة", lj: "قوة الرجلين" }
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
  const ids = new Set(players.map((p) => p.id))
  const rows = data.fitness.filter((r) => ids.has(r.player_id))
  const last = latestBy(rows, (r) => `${r.player_id}|${r.test_key}`)
  const teamVals = (t: string): number[] => players.map((p) => last.get(`${p.id}|${t}`)?.value).filter((v): v is number => v !== undefined)
  const best = (t: Test): number | null => {
    const v = teamVals(t.k)
    if (!v.length) return null
    return t.lower ? Math.min(...v) : Math.max(...v)
  }
  const save = async (): Promise<void> => {
    if (!edit || val.trim() === "" || Number.isNaN(Number(val))) { setErr("اكتب رقم صحيح."); return }
    const r = await addFitness(team.org_id, edit.p, edit.t, Number(val), on)
    if (r) setErr(r); else { setErr(null); setEdit(null); setVal(""); after() }
  }
  const sp = players.find((p) => p.id === sel)
  const prof = sp ? TESTS.map((t) => { const v = last.get(`${sp.id}|${t.k}`)?.value; return v === undefined ? 0 : standing(v, teamVals(t.k), t.lower) }) : []
  return (
    <div className="ft">
      <div className="mx">
        <table>
          <thead><tr><th className="pn">اللاعب</th>{TESTS.map((t) => <th key={t.k}>{t.name.ar}<small>{t.unit.ar} · {t.lower ? "الأقل أفضل" : "الأعلى أفضل"}</small></th>)}</tr></thead>
          <tbody>{players.map((p) => (
            <tr key={p.id} className={p.id === sel ? "on" : ""} onClick={() => setSel(p.id)}>
              <td className="pn"><b>{p.shirt_number ?? "–"}</b>{p.full_name}</td>
              {TESTS.map((t) => {
                const r = last.get(`${p.id}|${t.k}`), b = best(t)
                const lvl = r ? standing(r.value, teamVals(t.k), t.lower) : null
                return (
                  <td key={t.k} className={`cell ${r && b === r.value ? "top" : ""}`} onClick={(e) => { e.stopPropagation(); setSel(p.id); setEdit({ p: p.id, t: t.k }); setVal("") }}>
                    {r ? <><b>{fmt(r.value, t.dp)}</b><i style={{ width: `${Math.round((lvl ?? 0) * PCT)}%` }} /></> : <span className="add">+</span>}
                  </td>
                )
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <aside className="prof">
        {sp ? (
          <>
            <h4>{sp.full_name}</h4>
            <p className="mut">مكانه بين زمايله في كل اختبار (الأبعد = الأفضل في الفريق)</p>
            <Radar vals={prof} labels={TESTS.map((t) => MEASURES[t.k] ?? t.name.ar)} />
            {TESTS.map((t) => {
              const hist = rows.filter((r) => r.player_id === sp.id && r.test_key === t.k)
              return <div key={t.k} className="hist"><span>{t.name.ar}</span><b>{hist.map((h) => fmt(h.value, t.dp)).join(" ← ") || "—"}</b></div>
            })}
          </>
        ) : <p className="mut">اختار لاعب.</p>}
        {edit && (
          <div className="ed">
            <h5>نتيجة جديدة: {TESTS.find((t) => t.k === edit.t)?.name.ar}</h5>
            <div className="r"><input autoFocus inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} placeholder={TESTS.find((t) => t.k === edit.t)?.unit.ar} /><input type="date" value={on} onChange={(e) => setOn(e.target.value)} /></div>
            <div className="r"><button className="btn" onClick={() => setEdit(null)}>إلغاء</button><button className="btn p" onClick={() => void save()}>حفظ</button></div>
            {err && <p className="err">{err}</p>}
          </div>
        )}
      </aside>
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
  if (!list.length) return <p className="mut pad">لسه مفيش قائمة مهارات للعبة دي. المهارات متاحة حاليًا لكرة القدم والصالات والسلة والطائرة واليد.</p>
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
    if (sq.error || a.error === "other") return <div className="card msg"><p>حصلت مشكلة في تحميل البيانات.</p><button className="btn" onClick={reload}>إعادة المحاولة</button></div>
    if (!sq.data) return <p className="mut pad">بيحمّل…</p>
    if (!team) return <div className="card msg"><p>مفيش فرق لسه. أضف فريق ولاعبين من «الفرق واللاعبين» الأول.</p><a className="btn p" href="#/squad">الفرق واللاعبين</a></div>
    if (!players.length) return <div className="card msg"><p>الفريق ده مفيهوش لاعبين لسه.</p><a className="btn p" href="#/squad">أضف لاعبين</a></div>
    if (tab === "status") return <Availability players={players} after={reload} />
    if (a.error === "missing" || !a.data) return <div className="card msg"><p>جداول الاختبارات والتقييم لسه ما اتضافتش في قاعدة البيانات. بعد موافقة المالك، القسم ده هيشتغل على طول.</p></div>
    return tab === "fitness" ? <Fitness key={team.id} players={players} data={a.data} team={team} after={reload} /> : <Skills key={team.id} players={players} data={a.data} team={team} after={reload} />
  }

  return (
    <div className="as">
      <Dock active="assessment" />
      <main>
        <div className="head">
          <div><h1>التقييم والحالة البدنية <span className="en">Assessment</span></h1><p>{TESTS.length} اختبارات بدنية · {SKILLS.length} مهارة · كل نتيجة بتاريخها عشان التطوّر يبان</p></div>
        </div>
        {teams.length > 0 && <div className="teams">{teams.map((t) => <button key={t.id} className={t.id === team?.id ? "on" : ""} onClick={() => setTeamId(t.id)} style={{ "--c": t.color } as React.CSSProperties}><b>{t.name}</b><span>{orgName(t.org_id)}</span></button>)}</div>}
        <div className="tabs">{(Object.keys(TABS) as Tab[]).map((k) => <button key={k} className={k === tab ? "on" : ""} onClick={() => setTab(k)}>{TABS[k].ar} <span className="en">{TABS[k].en}</span></button>)}</div>
        {body()}
        <p className="sig">Instructor: Mohamed Ayad</p>
      </main>
    </div>
  )
}
