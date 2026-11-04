// البطولات (Tournaments) — create a tournament for any of the 161 games, generate fixtures, enter results,
// and follow the table / bracket live. Systems: league · knockout · groups then knockout · ranking by result.
import { useMemo, useState } from "react"
import { Dock } from "@/components/ui/Dock"
import "@fontsource/outfit/500.css"
import "./tournaments.css"
import {
  CATS, GAMES, HEAD_SYSTEMS, MAX_GROUPS, MIN_ENTRIES, MIN_PER_GROUP, QUALIFY_PER_GROUP, SYSTEMS,
  allowsDraw, gameOf, isHeadToHead, systemRules,
} from "./config"
import {
  addMatches, createTournament, saveResult, saveScore, setTournamentActive, useTData,
  type EntryRow, type Legs, type MatchRow, type NewEntry, type NewTournament, type System, type TData, type Tournament,
} from "./data"
import {
  isPlayed, knockoutFirstRound, koRoundName, nextKnockoutRound, qualifiers, ranking, roundRobin, snakeGroups, standings, winner,
  type NewMatch, type Points,
} from "./logic"

type Tab = "fixtures" | "table" | "bracket" | "rules"
const TABS: Record<Tab, { ar: string; en: string }> = {
  fixtures: { ar: "المباريات", en: "Fixtures" }, table: { ar: "الترتيب", en: "Table" },
  bracket: { ar: "شجرة الإقصائيات", en: "Bracket" }, rules: { ar: "نظام البطولة", en: "Rules" },
}
const TABS_OF: Record<System, Tab[]> = {
  ranking: ["fixtures", "rules"], knockout: ["fixtures", "bracket", "rules"],
  mixed: ["fixtures", "table", "bracket", "rules"], league: ["fixtures", "table", "rules"],
}
const RING_R = 34
const TAU = Math.PI * 2
const PCT = 100
const FORM_LAST = 5
const NEXT_SHOWN = 4
const ONE_LEG: Legs = 1
const TWO_LEGS: Legs = 2
const DEFAULT_GROUPS = 2
const MEDALS = ["🥇", "🥈", "🥉"]
const GROUP_LETTERS = "أبجدهوزح"
const FIRST_ROUND = 1
const GAMES_SHOWN = 40
const DEFAULT_PTS = { win: 3, draw: 1, loss: 0 }
const GROUP_CHOICES = Array.from({ length: MAX_GROUPS - 1 }, (_, i) => i + DEFAULT_GROUPS)
/** Digits only — accepts "12", strips "1a2" to "12". https://regex101.com/?regex=%5CD&testString=1a2 */
const NOT_DIGIT = /\D/g
/** Decimal results — keeps "10.52", strips "10,5s" to "105". https://regex101.com/?regex=%5B%5E%5Cd.%5D&testString=10.5s */
const NOT_DECIMAL = /[^\d.]/g
const digits = (v: string): string => v.replace(NOT_DIGIT, "")
const FORM_CLS: Record<"w" | "d" | "l", string> = { w: "fw", d: "fd", l: "fl" }

const pointsOf = (t: Tournament): Points => ({ win: t.pts_win, draw: t.pts_draw, loss: t.pts_loss })
const groupName = (g: number): string => `المجموعة ${GROUP_LETTERS[g - 1] ?? g}`
const num = (v: string): number | null => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v))))

/** Fixtures for a freshly created tournament, from the entry ids in seed order. */
function buildFixtures(sys: System, legs: Legs, rows: EntryRow[]): NewMatch[] {
  const ids = rows.map((r) => r.id)
  if (sys === "league") return roundRobin(ids, legs)
  if (sys === "knockout") return knockoutFirstRound(ids, FIRST_ROUND)
  if (sys === "mixed") {
    const groups = [...new Set(rows.map((r) => r.grp))]
    return groups.flatMap((g) => roundRobin(rows.filter((r) => r.grp === g).map((r) => r.id), ONE_LEG, g, "group"))
  }
  return []
}

// ---------------- create wizard ----------------
function Wizard({ data, close, done }: { data: TData; close: () => void; done: (id: string) => void }): React.JSX.Element {
  const [orgId, setOrgId] = useState(data.orgs[0]?.id ?? "")
  const [name, setName] = useState("")
  const [q, setQ] = useState("")
  const [sport, setSport] = useState("")
  const game = gameOf(sport)
  const h2h = isHeadToHead(game)
  const [system, setSystem] = useState<System>("league")
  const [legs, setLegs] = useState<Legs>(ONE_LEG)
  const [groups, setGroups] = useState(DEFAULT_GROUPS)
  const [pts, setPts] = useState(DEFAULT_PTS)
  const [lowerBetter, setLowerBetter] = useState(true)
  const [unit, setUnit] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [extra, setExtra] = useState("")
  const [startsOn, setStartsOn] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pickGame = (k: string): void => {
    const g = gameOf(k)
    setSport(k); setQ("")
    if (!g) return
    const [w, d, l] = g.pts ?? []
    setPts({ win: w ?? 0, draw: d ?? 0, loss: l ?? 0 })
    setSystem(isHeadToHead(g) ? "league" : "ranking")
  }
  const found = useMemo(() => {
    const t = q.trim().toLowerCase()
    const list = t ? GAMES.filter((g) => `${g.ar} ${g.en} ${g.k}`.toLowerCase().includes(t)) : GAMES
    return list.slice(0, GAMES_SHOWN)
  }, [q])
  const orgTeams = data.teams.filter((t) => t.org_id === orgId && t.is_active)
  const externals = extra.split("\n").map((s) => s.trim()).filter(Boolean)
  const total = picked.length + externals.length

  const submit = async (): Promise<void> => {
    if (!orgId || name.trim().length < MIN_ENTRIES || !sport) { setErr("اكتب اسم البطولة واختار الجهة واللعبة."); return }
    if (total < MIN_ENTRIES) { setErr("لازم مشاركين اتنين على الأقل."); return }
    if (system === "mixed" && total < groups * MIN_PER_GROUP) { setErr(`محتاج ${groups * MIN_PER_GROUP} مشاركين على الأقل لـ${groups} مجموعات.`); return }
    const names = [...picked.map((id) => ({ team_id: id, name: orgTeams.find((t) => t.id === id)?.name ?? "" })), ...externals.map((n) => ({ team_id: null, name: n }))]
    const grp = system === "mixed" ? snakeGroups(names.map((n) => n.name), groups) : names.map(() => 1)
    const entries: NewEntry[] = names.map((n, i) => ({ ...n, grp: grp[i], seed: i + 1 }))
    const t: NewTournament = {
      org_id: orgId, name: name.trim(), sport, system, legs: system === "league" ? legs : ONE_LEG,
      pts_win: pts.win, pts_draw: pts.draw, pts_loss: pts.loss, groups_count: system === "mixed" ? groups : 1,
      lower_better: lowerBetter, unit: unit.trim() || null, starts_on: startsOn || null,
    }
    setBusy(true); setErr(null)
    const r = await createTournament(t, entries, (_ids, rows) => buildFixtures(system, t.legs, rows))
    setBusy(false)
    if (r.err) setErr(`ما اتحفظتش: ${r.err}`); else if (r.id) done(r.id)
  }

  return (
    <div className="tr-modal" onClick={close}>
      <div className="tr-sheet" onClick={(e) => e.stopPropagation()}>
        <header><h3>بطولة جديدة <span className="en">New tournament</span></h3><button className="x" onClick={close}>✕</button></header>
        <div className="tr-steps">
          <section>
            <div className="sn">1</div>
            <div className="sb">
              <h4>البيانات الأساسية <span className="en">Basics</span></h4>
              <div className="row2">
                <label className="fld">الجهة <span className="en">Organization</span>
                  <select value={orgId} onChange={(e) => { setOrgId(e.target.value); setPicked([]) }}>{data.orgs.map((o) => <option key={o.id} value={o.id}>{o.name_ar}</option>)}</select></label>
                <label className="fld">تاريخ البداية <span className="en">Starts</span><input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></label>
              </div>
              <label className="fld">اسم البطولة <span className="en">Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: دوري المدارس المتوسطة لكرة القدم" /></label>
            </div>
          </section>
          <section>
            <div className="sn">2</div>
            <div className="sb">
              <h4>اللعبة <span className="en">Game · {GAMES.length}</span></h4>
              {game ? (
                <div className="picked"><b>{game.ar}</b><span className="en">{game.en}</span><i>{CATS[game.cat]}</i><button onClick={() => setSport("")}>تغيير</button></div>
              ) : (
                <>
                  <input className="srch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث: كرة قدم، سباحة، شطرنج، Volleyball…" autoFocus />
                  <div className="games">{found.map((g) => <button key={g.k} onClick={() => pickGame(g.k)}><b>{g.ar}</b><span>{CATS[g.cat]}</span></button>)}</div>
                </>
              )}
            </div>
          </section>
          {game && (
            <section>
              <div className="sn">3</div>
              <div className="sb">
                <h4>نظام البطولة <span className="en">System</span></h4>
                {h2h ? (
                  <div className="systems">{HEAD_SYSTEMS.map((s) => (
                    <button key={s} className={s === system ? "on" : ""} onClick={() => setSystem(s)}><i>{SYSTEMS[s].icon}</i><b>{SYSTEMS[s].ar}</b><span>{SYSTEMS[s].note}</span></button>
                  ))}</div>
                ) : <p className="mut">اللعبة دي بتتحسب بالنتيجة، فالنظام هيكون <b>ترتيب بالنتيجة</b> (Ranking).</p>}
                <ul className="rules">{systemRules(system).map((r) => <li key={r}>{r}</li>)}</ul>
                {system === "league" && (
                  <div className="seg"><button className={legs === ONE_LEG ? "on" : ""} onClick={() => setLegs(ONE_LEG)}>دور واحد</button><button className={legs === TWO_LEGS ? "on" : ""} onClick={() => setLegs(TWO_LEGS)}>ذهاب وإياب</button></div>
                )}
                {system === "mixed" && (
                  <label className="fld sm">عدد المجموعات <span className="en">Groups</span>
                    <select value={groups} onChange={(e) => setGroups(Number(e.target.value))}>{GROUP_CHOICES.map((n) => <option key={n} value={n}>{n}</option>)}</select>
                    <small>يتأهل الأول والتاني من كل مجموعة.</small></label>
                )}
                {h2h && system !== "knockout" && (
                  <div className="pts">
                    <label>الفوز<input type="number" min={0} value={pts.win} onChange={(e) => setPts({ ...pts, win: num(e.target.value) ?? 0 })} /></label>
                    {allowsDraw(game) && <label>التعادل<input type="number" min={0} value={pts.draw} onChange={(e) => setPts({ ...pts, draw: num(e.target.value) ?? 0 })} /></label>}
                    <label>الخسارة<input type="number" min={0} value={pts.loss} onChange={(e) => setPts({ ...pts, loss: num(e.target.value) ?? 0 })} /></label>
                    <small>نقاط اللعبة من اللائحة، وتقدر تعدّلها.</small>
                  </div>
                )}
                {!h2h && (
                  <div className="row2">
                    <label className="fld">وحدة النتيجة <span className="en">Unit</span><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="ث · م · كجم · درجة" /></label>
                    <div className="seg"><button className={lowerBetter ? "on" : ""} onClick={() => setLowerBetter(true)}>الأقل أفضل (زمن)</button><button className={lowerBetter ? "" : "on"} onClick={() => setLowerBetter(false)}>الأعلى أفضل</button></div>
                  </div>
                )}
              </div>
            </section>
          )}
          {game && (
            <section>
              <div className="sn">4</div>
              <div className="sb">
                <h4>المشاركين <span className="en">Entries · {total}</span></h4>
                {orgTeams.length > 0 && <div className="teams">{orgTeams.map((t) => (
                  <label key={t.id} className={picked.includes(t.id) ? "on" : ""}><input type="checkbox" checked={picked.includes(t.id)} onChange={() => setPicked(picked.includes(t.id) ? picked.filter((x) => x !== t.id) : [...picked, t.id])} />{t.name}</label>
                ))}</div>}
                <label className="fld">مشاركين من برّه الجهة <span className="en">Other entries</span>
                  <textarea rows={4} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={h2h ? "اسم كل فريق في سطر — مدارس أو أندية تانية" : "اسم كل لاعب أو فريق في سطر"} /></label>
                <small className="mut">الترتيب هنا هو التصنيف (Seeding): الأول هو الأقوى، وده بيحدد المجموعات وشجرة الإقصائيات.</small>
              </div>
            </section>
          )}
        </div>
        {err && <p className="err">{err}</p>}
        <footer><button className="btn" onClick={close}>إلغاء</button><button className="btn p" disabled={busy || !game} onClick={() => void submit()}>{busy ? "بيتحفظ…" : `إنشاء البطولة وجدول المباريات`}</button></footer>
      </div>
    </div>
  )
}

// ---------------- one match ----------------
function MatchCard({ m, names, draws, after }: { m: MatchRow; names: Map<string, string>; draws: boolean; after: () => Promise<void> }): React.JSX.Element {
  const [h, setH] = useState(m.home_score?.toString() ?? "")
  const [a, setA] = useState(m.away_score?.toString() ?? "")
  const [hp, setHp] = useState(m.home_pen?.toString() ?? "")
  const [ap, setAp] = useState(m.away_pen?.toString() ?? "")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const bye = !m.home_id || !m.away_id
  const level = h !== "" && h === a
  const needPen = m.stage === "ko" && level
  const drawBad = !draws && m.stage !== "ko" && level
  const dirty = h !== (m.home_score?.toString() ?? "") || a !== (m.away_score?.toString() ?? "") || hp !== (m.home_pen?.toString() ?? "") || ap !== (m.away_pen?.toString() ?? "")
  const save = async (): Promise<void> => {
    if ((h === "") !== (a === "")) { setErr("اكتب النتيجتين."); return }
    if (drawBad) { setErr("اللعبة دي مفيهاش تعادل."); return }
    if (needPen && (hp === "" || ap === "" || hp === ap)) { setErr("التعادل في الإقصائيات محتاج ركلات ترجيح بفائز."); return }
    setBusy(true)
    const r = await saveScore(m.id, { home_score: num(h), away_score: num(a), home_pen: needPen ? num(hp) : null, away_pen: needPen ? num(ap) : null })
    setBusy(false)
    if (r) setErr(r); else { setErr(null); await after() }
  }
  const w = winner(m)
  if (bye) return <div className="mc bye"><span>{names.get(m.home_id ?? m.away_id ?? "") ?? "—"}</span><i>تأهل مباشر (راحة)</i></div>
  return (
    <div className={`mc ${isPlayed(m) ? "done" : ""}`}>
      <span className={`nm ${w === m.home_id ? "win" : ""}`}>{names.get(m.home_id as string)}</span>
      <div className="sc">
        <input inputMode="numeric" value={h} onChange={(e) => setH(digits(e.target.value))} aria-label="أهداف صاحب الأرض" />
        <b>–</b>
        <input inputMode="numeric" value={a} onChange={(e) => setA(digits(e.target.value))} aria-label="أهداف الضيف" />
      </div>
      <span className={`nm ${w === m.away_id ? "win" : ""}`}>{names.get(m.away_id as string)}</span>
      {needPen && <div className="pen">ترجيح <input value={hp} onChange={(e) => setHp(digits(e.target.value))} /> – <input value={ap} onChange={(e) => setAp(digits(e.target.value))} /></div>}
      {dirty && <button className="sv" disabled={busy} onClick={() => void save()}>{busy ? "…" : "حفظ"}</button>}
      {err && <p className="err">{err}</p>}
    </div>
  )
}

// ---------------- views ----------------
function Fixtures({ t, ms, names, after }: { t: Tournament; ms: MatchRow[]; names: Map<string, string>; after: () => Promise<void> }): React.JSX.Element {
  const draws = allowsDraw(gameOf(t.sport))
  const keyOf = (m: MatchRow): string => {
    if (m.stage === "ko") return koRoundName(ms.filter((x) => x.stage === "ko" && x.round === m.round).length).ar
    const grp = m.stage === "group" ? `${groupName(m.grp)} · ` : ""
    return `${grp}الجولة ${m.round}`
  }
  const blocks = ms.reduce((acc, m) => acc.set(keyOf(m), [...(acc.get(keyOf(m)) ?? []), m]), new Map<string, MatchRow[]>())
  if (!ms.length) return <p className="mut pad">مفيش مباريات لسه.</p>
  return (
    <div className="fx">{[...blocks.entries()].map(([k, list]) => {
      const done = list.filter(isPlayed).length
      return (
        <section key={k} className={done === list.length ? "full" : ""}>
          <h5>{k}<span>{done}/{list.length}</span></h5>
          {list.map((m) => <MatchCard key={`${m.id}-${m.home_score}-${m.away_score}`} m={m} names={names} draws={draws} after={after} />)}
        </section>
      )
    })}</div>
  )
}

function Table({ t, es, ms }: { t: Tournament; es: EntryRow[]; ms: MatchRow[] }): React.JSX.Element {
  const groups = t.system === "mixed" ? Array.from({ length: t.groups_count }, (_, i) => i + 1) : [undefined]
  return (
    <div className="tbls">{groups.map((g) => {
      const rows = standings(es, ms.filter((m) => m.stage !== "ko"), pointsOf(t), g)
      const cut = t.system === "mixed" ? QUALIFY_PER_GROUP : 0
      return (
        <table key={g ?? 0} className="tbl">
          {g && <caption>{groupName(g)}</caption>}
          <thead><tr><th>#</th><th className="tn">الفريق</th><th>لعب</th><th>ف</th><th>ت</th><th>خ</th><th>له</th><th>عليه</th><th>±</th><th>نقاط</th><th>آخر النتايج</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.id} className={i < cut ? "q" : ""}>
              <td>{i + 1}</td><td className="tn">{r.name}</td><td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gf}</td><td>{r.ga}</td>
              <td>{r.gf - r.ga}</td><td className="pt">{r.pts}</td>
              <td className="form">{r.form.slice(-FORM_LAST).map((f, k) => <i key={k} className={FORM_CLS[f]} />)}</td>
            </tr>
          ))}</tbody>
        </table>
      )
    })}</div>
  )
}

function Bracket({ ms, names }: { ms: MatchRow[]; names: Map<string, string> }): React.JSX.Element {
  const ko = ms.filter((m) => m.stage === "ko")
  const rounds = [...new Set(ko.map((m) => m.round))].sort((a, b) => a - b)
  if (!rounds.length) return <p className="mut pad">شجرة الإقصائيات بتظهر لما دور المجموعات يخلص.</p>
  const final = ko.find((m) => m.round === rounds[rounds.length - 1] && ko.filter((x) => x.round === m.round).length === 1)
  const champ = final ? winner(final) : null
  return (
    <div className="br">{rounds.map((r) => {
      const list = ko.filter((m) => m.round === r).sort((a, b) => a.slot - b.slot)
      return (
        <div key={r} className="col"><h5>{koRoundName(list.length).ar}</h5>
          {list.map((m) => {
            const w = winner(m)
            return (
              <div key={m.id} className="tie">
                {[m.home_id, m.away_id].map((id, k) => (
                  <div key={k} className={`sl ${w && w === id ? "win" : ""} ${w && id && w !== id ? "out" : ""}`}>
                    <span>{id ? names.get(id) : "راحة"}</span><b>{k === 0 ? m.home_score ?? "" : m.away_score ?? ""}</b>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )
    })}
    {champ && <div className="col champ"><h5>البطل</h5><div className="cup">🏆<b>{names.get(champ)}</b></div></div>}
    </div>
  )
}

function Ranking({ t, es, after }: { t: Tournament; es: EntryRow[]; after: () => Promise<void> }): React.JSX.Element {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const list = ranking(es, t.lower_better) as EntryRow[]
  const save = async (id: string): Promise<void> => {
    const v = vals[id]?.trim() ?? ""
    const r = await saveResult(id, v === "" ? null : Number(v))
    if (r) setErr(r); else { setErr(null); await after() }
  }
  return (
    <div className="rk">
      <p className="mut">{t.lower_better ? "الأقل أفضل" : "الأعلى أفضل"}{t.unit ? ` · الوحدة: ${t.unit}` : ""}</p>
      {list.map((e, i) => {
        const has = e.result !== null
        return (
          <div key={e.id} className={`rr ${has ? "" : "wait"}`}>
            <b className="pos">{has ? MEDALS[i] ?? i + 1 : "—"}</b><span className="nm">{e.name}</span>
            <input inputMode="decimal" value={vals[e.id] ?? e.result?.toString() ?? ""} onChange={(ev) => setVals({ ...vals, [e.id]: ev.target.value.replace(NOT_DECIMAL, "") })} placeholder="النتيجة" />
            <i>{t.unit}</i>
            {vals[e.id] !== undefined && vals[e.id] !== (e.result?.toString() ?? "") && <button className="sv" onClick={() => void save(e.id)}>حفظ</button>}
          </div>
        )
      })}
      {err && <p className="err">{err}</p>}
    </div>
  )
}

// ---------------- the pulse panel ----------------
function Pulse({ t, es, ms, names, after }: { t: Tournament; es: EntryRow[]; ms: MatchRow[]; names: Map<string, string>; after: () => Promise<void> }): React.JSX.Element {
  const real = ms.filter((m) => m.home_id && m.away_id)
  const done = real.filter(isPlayed).length
  const pct = real.length ? Math.round((done / real.length) * PCT) : 0
  const ranked = t.system === "ranking"
  const resultsIn = es.filter((e) => e.result !== null).length
  const ringPct = ranked ? Math.round((resultsIn / Math.max(1, es.length)) * PCT) : pct
  const goals = real.filter(isPlayed).reduce((s, m) => s + (m.home_score ?? 0) + (m.away_score ?? 0), 0)
  const next = real.filter((m) => !isPlayed(m)).slice(0, NEXT_SHOWN)
  const table = t.system === "league" ? standings(es, ms, pointsOf(t)) : []
  const groupMs = ms.filter((m) => m.stage === "group")
  const groupsDone = t.system === "mixed" && groupMs.length > 0 && groupMs.every(isPlayed) && !ms.some((m) => m.stage === "ko")
  const nextKo = nextKnockoutRound(ms)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const startKo = async (): Promise<void> => {
    setBusy(true)
    const seeded = qualifiers(es, groupMs, pointsOf(t), t.groups_count, QUALIFY_PER_GROUP)
    const r = await addMatches(t.id, t.org_id, knockoutFirstRound(seeded))
    setBusy(false)
    if (r) setErr(r); else await after()
  }
  const advance = async (): Promise<void> => {
    setBusy(true)
    const r = await addMatches(t.id, t.org_id, nextKo)
    setBusy(false)
    if (r) setErr(r); else await after()
  }
  const archive = async (): Promise<void> => { await setTournamentActive(t.id, !t.is_active); await after() }
  const off = RING_R * TAU * (1 - ringPct / PCT)
  return (
    <aside className="pulse">
      <div className="pring">
        <svg viewBox="0 0 80 80"><circle cx="40" cy="40" r={RING_R} className="bg" /><circle cx="40" cy="40" r={RING_R} className="fg" strokeDasharray={RING_R * TAU} strokeDashoffset={off} /></svg>
        <div><b>{ringPct}%</b><span>{ranked ? `${resultsIn}/${es.length} نتيجة` : `${done}/${real.length} مباراة`}</span></div>
      </div>
      {!ranked && <div className="kv"><span>الأهداف / النقاط المسجّلة</span><b>{goals}</b></div>}
      {!ranked && <div className="kv"><span>المتوسط في المباراة</span><b>{done ? (goals / done).toFixed(1) : "—"}</b></div>}
      {table[0] && table[0].p > 0 && <div className="lead"><small>المتصدّر</small><b>{table[0].name}</b><span>{table[0].pts} نقطة</span></div>}
      {groupsDone && <button className="btn p wide" disabled={busy} onClick={() => void startKo()}>دور المجموعات خلص — ابدأ الإقصائيات</button>}
      {nextKo.length > 0 && <button className="btn p wide" disabled={busy} onClick={() => void advance()}>{`إنشاء ${koRoundName(nextKo.length).ar}`}</button>}
      {err && <p className="err">{err}</p>}
      {next.length > 0 && (
        <div className="next"><h6>الجاي <span className="en">Up next</span></h6>
          {next.map((m) => <div key={m.id}><span>{names.get(m.home_id as string)}</span><i>ضد</i><span>{names.get(m.away_id as string)}</span></div>)}</div>
      )}
      <button className="link" onClick={() => void archive()}>{t.is_active ? "أرشفة البطولة" : "إرجاع من الأرشيف"}</button>
    </aside>
  )
}

// ---------------- screen ----------------
export function TournamentsScreen(): React.JSX.Element {
  const { data, error, reload } = useTData()
  const [sel, setSel] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("fixtures")
  const [wizard, setWizard] = useState(false)
  const [archived, setArchived] = useState(false)
  const after = async (): Promise<void> => { reload() }

  if (error) {
    const msg: Record<Exclude<typeof error, null>, string> = {
      missing: "جداول البطولات لسه ما اتضافتش في قاعدة البيانات. بعد موافقة المالك على إضافتها، الشاشة هتشتغل على طول.",
      schema: "مخطط training مش ظاهر في إعدادات Data API.",
      other: "حصلت مشكلة في تحميل البيانات. جرّب تاني بعد شوية.",
    }
    return <div className="tr"><Dock active="tournaments" /><main className="center"><div className="card msg"><h3>البطولات <span className="en">Tournaments</span></h3><p>{msg[error]}</p><button className="btn" onClick={reload}>إعادة المحاولة</button></div></main></div>
  }
  if (!data) return <div className="tr"><Dock active="tournaments" /><main className="center"><p className="mut">بيحمّل…</p></main></div>

  const list = data.tours.filter((t) => t.is_active !== archived)
  const t = data.tours.find((x) => x.id === sel) ?? list[0]
  const es = t ? data.entries.filter((e) => e.tournament_id === t.id) : []
  const ms = t ? data.matches.filter((m) => m.tournament_id === t.id) : []
  const names = new Map(es.map((e) => [e.id, e.name]))
  const tabs: Tab[] = t ? TABS_OF[t.system] : []
  const curTab = tabs.includes(tab) ? tab : "fixtures"
  const g = t ? gameOf(t.sport) : undefined

  return (
    <div className="tr">
      <Dock active="tournaments" />
      <main>
        <div className="head">
          <div><h1>البطولات <span className="en">Tournaments</span></h1><p>{GAMES.length} لعبة · 4 أنظمة · جدول المباريات والترتيب بيتحسبوا لوحدهم</p></div>
          <button className="btn p" onClick={() => setWizard(true)}>+ بطولة جديدة</button>
        </div>
        {!t ? (
          <div className="empty card">
            <h3>{archived ? "مفيش بطولات في الأرشيف" : "ابدأ أول بطولة"}</h3>
            <div className="systems big">{(Object.keys(SYSTEMS) as System[]).map((s) => <div key={s}><i>{SYSTEMS[s].icon}</i><b>{SYSTEMS[s].ar}</b><span className="en">{SYSTEMS[s].en}</span><p>{SYSTEMS[s].note}</p></div>)}</div>
            {archived ? <button className="btn" onClick={() => setArchived(false)}>رجوع للبطولات</button> : <button className="btn p" onClick={() => setWizard(true)}>+ بطولة جديدة</button>}
          </div>
        ) : (
          <div className="lay">
            <nav className="list">
              {list.map((x) => {
                const xm = data.matches.filter((m) => m.tournament_id === x.id && m.home_id && m.away_id)
                const p = xm.length ? Math.round((xm.filter(isPlayed).length / xm.length) * PCT) : 0
                return (
                  <button key={x.id} className={x.id === t.id ? "on" : ""} onClick={() => setSel(x.id)}>
                    <b>{x.name}</b><span>{gameOf(x.sport)?.ar} · {SYSTEMS[x.system].ar}</span>
                    {x.system !== "ranking" && <i className="bar"><em style={{ width: `${p}%` }} /></i>}
                  </button>
                )
              })}
              <button className="arch" onClick={() => { setArchived(!archived); setSel(null) }}>{archived ? "← البطولات الحالية" : "الأرشيف"}</button>
            </nav>
            <section className="stage card">
              <header>
                <div><h2>{t.name}</h2><p>{g?.ar} <span className="en">{g?.en}</span> · {SYSTEMS[t.system].ar}{t.system === "league" && t.legs === TWO_LEGS ? " · ذهاب وإياب" : ""} · {es.length} مشارك{t.starts_on ? ` · يبدأ ${t.starts_on}` : ""}</p></div>
              </header>
              <div className="tabs">{tabs.map((k) => <button key={k} className={k === curTab ? "on" : ""} onClick={() => setTab(k)}>{k === "fixtures" && t.system === "ranking" ? "النتائج والترتيب" : TABS[k].ar} <span className="en">{TABS[k].en}</span></button>)}</div>
              {curTab === "fixtures" && (t.system === "ranking" ? <Ranking t={t} es={es} after={after} /> : <Fixtures t={t} ms={ms} names={names} after={after} />)}
              {curTab === "table" && <Table t={t} es={es} ms={ms} />}
              {curTab === "bracket" && <Bracket ms={ms} names={names} />}
              {curTab === "rules" && <ul className="rules pad">{systemRules(t.system).map((r) => <li key={r}>{r}</li>)}{t.system !== "ranking" && <li>النقاط: فوز {t.pts_win} · تعادل {t.pts_draw} · خسارة {t.pts_loss}. والتساوي بيتحسم بفارق الأهداف، ثم الأهداف المسجّلة، ثم المواجهة المباشرة.</li>}</ul>}
            </section>
            <Pulse t={t} es={es} ms={ms} names={names} after={after} />
          </div>
        )}
        <p className="sig">Instructor: Mohamed Ayad</p>
      </main>
      {wizard && <Wizard data={data} close={() => setWizard(false)} done={(id) => { setWizard(false); setSel(id); setArchived(false); setTab("fixtures"); reload() }} />}
    </div>
  )
}
