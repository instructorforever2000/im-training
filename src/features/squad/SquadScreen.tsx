// الفرق واللاعبين (Teams & Players) — built on the approved design squad-concept-v1 (26 Oct 2026).
// Three columns on one screen: teams & coaches · the selected team · the player's file beside the list.
import { useMemo, useState } from "react"
import "./squad.css"
import cfg from "./squad-config.json"
import { SPORTS } from "@/features/sports/registry"
import {
  addPlayers, ageOf, parseRoster, positionsFor, savePlayer, saveTeam, setPlayerActive, setTeamActive, useSquadData,
  type Foot, type Gender, type Player, type PlayerInput, type PlayerStatus, type SquadData, type Team, type TeamInput,
} from "./data"

const ST = cfg.status as Record<PlayerStatus, { ar: string; en: string; color: string }>
const STATUS_KEYS = Object.keys(ST) as PlayerStatus[]
const GENDER = cfg.gender as Record<Gender, string>
const SPORT_LIST = [...SPORTS.map((s) => ({ id: s.id, ar: s.nameAr })), { id: "futsal", ar: "كرة الصالات" }]
const sportAr = (id: string): string => SPORT_LIST.find((s) => s.id === id)?.ar ?? id
const RING_R = 31
const TAU = Math.PI * 2
const BADGE_CHARS = 2
const FULL = 100
const logo = `${import.meta.env.BASE_URL}icon-192.png`

type Modal = { k: "team"; team?: Team } | { k: "bulk" } | null

const RAIL: readonly { ar: string; href?: string; on?: boolean; d: string }[] = [
  { ar: "لوحة المدير", href: "#/", d: "M3 11l9-7 9 7v9H3z" },
  { ar: "اللاعبون", on: true, d: "M9 4.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.5c2 .7 3.2 2.6 3.5 5.5" },
]

function teamLabel(t: Team): string {
  const grades = t.grade_from ? `الصف ${t.grade_from}${t.grade_to && t.grade_to !== t.grade_from ? `–${t.grade_to}` : ""}` : ""
  return [GENDER[t.gender], t.age_group ?? "", grades].filter(Boolean).join(" · ")
}

// ---------------- team form ----------------
function TeamForm({ orgId, team, close }: { orgId: string; team?: Team; close: () => void }): React.JSX.Element {
  const [f, setF] = useState<TeamInput>({
    org_id: team?.org_id ?? orgId, name: team?.name ?? "", sport: team?.sport ?? "", gender: team?.gender ?? "m",
    age_group: team?.age_group ?? null, grade_from: team?.grade_from ?? null, grade_to: team?.grade_to ?? null,
    play_format: team?.play_format ?? null, color: team?.color ?? cfg.colors[0],
  })
  const [err, setErr] = useState<string | null>(null)
  const num = (v: string): number | null => (v ? Number(v) : null)
  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!f.name.trim() || !f.sport) { setErr("اكتب اسم الفريق واختار اللعبة."); return }
    const r = await saveTeam({ ...f, name: f.name.trim() }, team?.id)
    if (r) setErr(`ما اتحفظش: ${r}`); else close()
  }
  const toggle = async (): Promise<void> => {
    if (!team) return
    const r = await setTeamActive(team.id, !team.is_active)
    if (r) setErr(r); else close()
  }
  return (
    <form className="card" onSubmit={(e) => void submit(e)}>
      <h3>{team ? "تعديل الفريق" : "فريق جديد"} <span className="en">{team ? "Edit team" : "New team"}</span></h3>
      <label className="fld">اسم الفريق <span className="en">Team name</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="مثال: منتخب المتوسطة لكرة القدم" /></label>
      <div className="row2">
        <label className="fld">اللعبة <span className="en">Sport</span>
          <select value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value })}><option value="">— اختار —</option>{SPORT_LIST.map((s) => <option key={s.id} value={s.id}>{s.ar}</option>)}</select></label>
        <label className="fld">الجنس <span className="en">Gender</span>
          <select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value as Gender })}>{(Object.keys(GENDER) as Gender[]).map((g) => <option key={g} value={g}>{GENDER[g]}</option>)}</select></label>
      </div>
      <div className="row3">
        <label className="fld">الفئة العمرية <span className="en">Age group</span>
          <select value={f.age_group ?? ""} onChange={(e) => setF({ ...f, age_group: e.target.value || null })}><option value="">—</option>{cfg.ageGroups.map((a) => <option key={a}>{a}</option>)}</select></label>
        <label className="fld">من الصف <span className="en">Grade from</span><input type="number" min="1" max="12" value={f.grade_from ?? ""} onChange={(e) => setF({ ...f, grade_from: num(e.target.value) })} /></label>
        <label className="fld">إلى الصف <span className="en">to</span><input type="number" min="1" max="12" value={f.grade_to ?? ""} onChange={(e) => setF({ ...f, grade_to: num(e.target.value) })} /></label>
      </div>
      <label className="fld">طريقة اللعب <span className="en">Format</span><input value={f.play_format ?? ""} onChange={(e) => setF({ ...f, play_format: e.target.value || null })} placeholder="مثال: 11 ضد 11" /></label>
      <p className="fld">اللون <span className="en">Colour</span></p>
      <div className="colors">{cfg.colors.map((c) => <button type="button" key={c} className={f.color === c ? "on" : ""} style={{ background: c }} onClick={() => setF({ ...f, color: c })} aria-label={c} />)}</div>
      {err && <p className="err">{err}</p>}
      <div className="formacts">
        <button className="btn p">{team ? "حفظ التعديل" : "إنشاء الفريق"}</button>
        <button type="button" className="btn" onClick={close}>إلغاء</button>
        {team && <button type="button" className="btn" onClick={() => void toggle()}>{team.is_active ? "إيقاف الفريق" : "إعادة تفعيل"}</button>}
      </div>
    </form>
  )
}

// ---------------- bulk paste ----------------
function BulkForm({ team, close }: { team: Team; close: () => void }): React.JSX.Element {
  const [text, setText] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const rows = parseRoster(text, team.sport)
  const submit = async (): Promise<void> => {
    if (!rows.length) { setErr("مفيش أسماء."); return }
    const payload: PlayerInput[] = rows.map((r) => ({
      ...r, org_id: team.org_id, team_id: team.id, strong_foot: null, height_cm: null, weight_kg: null, status: "ready", guardian_consent_on: null, coach_notes: null,
    }))
    const e = await addPlayers(payload)
    if (e) setErr(`ما اتضافوش: ${e}`); else close()
  }
  const codes = positionsFor(team.sport)
  return (
    <div className="card bulkbox">
      <h3>لصق قائمة لاعبين <span className="en">Paste roster</span> — {team.name}</h3>
      <p className="muted" style={{ marginTop: "6px" }}>انسخ الأعمدة من Excel والصقها: سطر لكل لاعب — الاسم · الرقم · المركز · تاريخ الميلاد (YYYY-MM-DD). الأعمدة بعد الاسم اختيارية.</p>
      {codes.length > 0 && <p className="muted">رموز المراكز: {codes.map((c) => `${c.code} (${c.ar})`).join("، ")}</p>}
      <label className="fld"><textarea value={text} onChange={(e) => setText(e.target.value)} /></label>
      <p className="muted">{rows.length ? `هيتضاف ${rows.length} لاعب` : ""}</p>
      {err && <p className="err">{err}</p>}
      <div className="formacts"><button className="btn p" onClick={() => void submit()}>إضافة اللاعبين</button><button className="btn" onClick={close}>إلغاء</button></div>
    </div>
  )
}

// ---------------- player file (beside the list) ----------------
function PlayerFile({ team, player, close }: { team: Team; player: Player | "new"; close: () => void }): React.JSX.Element {
  const isNew = player === "new"
  const p = isNew ? null : player
  const [f, setF] = useState<PlayerInput>({
    org_id: team.org_id, team_id: team.id, full_name: p?.full_name ?? "", shirt_number: p?.shirt_number ?? null, position: p?.position ?? null,
    birth_date: p?.birth_date ?? null, strong_foot: p?.strong_foot ?? null, height_cm: p?.height_cm ?? null, weight_kg: p?.weight_kg ?? null,
    status: p?.status ?? "ready", guardian_consent_on: p?.guardian_consent_on ?? null, coach_notes: p?.coach_notes ?? null,
  })
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const num = (v: string): number | null => (v ? Number(v) : null)
  const codes = positionsFor(team.sport)
  const age = ageOf(f.birth_date)
  const save = async (): Promise<void> => {
    setOk(false)
    if (!f.full_name.trim()) { setErr("اكتب اسم اللاعب."); return }
    const r = await savePlayer({ ...f, full_name: f.full_name.trim() }, p?.id)
    if (r) setErr(`ما اتحفظش: ${r}`); else { setErr(null); setOk(true); close() }
  }
  const toggle = async (): Promise<void> => { if (p) { const r = await setPlayerActive(p.id, !p.is_active); if (r) setErr(r); else close() } }
  const pos = codes.find((c) => c.code === f.position)
  return (
    <aside className="card prof" style={{ "--tc": team.color } as React.CSSProperties}>
      <div className="sub" style={{ display: "flex", justifyContent: "space-between" }}><span>{isNew ? "لاعب جديد" : "ملف اللاعب"} <span className="en">{isNew ? "New player" : "Player profile"}</span></span><button className="x" onClick={close} aria-label="إغلاق">✕</button></div>
      <div className="hero" style={{ marginTop: "12px" }}><span className="big">{f.shirt_number ?? "–"}</span>
        <div><h2>{f.full_name || "—"}</h2><div className="meta">
          {pos && <span className="chip">{pos.ar} · {pos.code}</span>}{age !== null && <span className="chip">{age} سنة</span>}
          {age !== null && age < cfg.limits.adultAge && <span className="chip">{f.guardian_consent_on ? "موافقة ولي الأمر ✓" : "بانتظار موافقة ولي الأمر"}</span>}</div></div></div>
      <div className="sec"><h4>الحالة اليوم <span className="en">Status</span></h4>
        <div className="status">{STATUS_KEYS.map((s) => <button key={s} className={f.status === s ? "on" : ""} style={f.status === s ? { borderColor: ST[s].color, color: ST[s].color } : undefined} onClick={() => setF({ ...f, status: s })}>{ST[s].ar}</button>)}</div></div>
      <label className="fld">الاسم <span className="en">Full name</span><input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></label>
      <div className="row2">
        <label className="fld">رقم القميص <span className="en">No.</span><input type="number" min="0" max={cfg.limits.shirtMax} value={f.shirt_number ?? ""} onChange={(e) => setF({ ...f, shirt_number: num(e.target.value) })} /></label>
        <label className="fld">المركز <span className="en">Position</span>
          {codes.length ? <select value={f.position ?? ""} onChange={(e) => setF({ ...f, position: e.target.value || null })}><option value="">—</option>{codes.map((c) => <option key={c.code} value={c.code}>{c.ar} · {c.code}</option>)}</select>
            : <input value={f.position ?? ""} onChange={(e) => setF({ ...f, position: e.target.value || null })} />}</label>
      </div>
      <div className="row2">
        <label className="fld">تاريخ الميلاد <span className="en">Birth date</span><input type="date" value={f.birth_date ?? ""} onChange={(e) => setF({ ...f, birth_date: e.target.value || null })} /></label>
        <label className="fld">القدم / اليد <span className="en">Strong side</span>
          <select value={f.strong_foot ?? ""} onChange={(e) => setF({ ...f, strong_foot: (e.target.value || null) as Foot | null })}><option value="">—</option><option value="R">يمنى</option><option value="L">يسرى</option><option value="B">الاتنين</option></select></label>
      </div>
      <div className="row2">
        <label className="fld">الطول (سم) <span className="en">Height</span><input type="number" value={f.height_cm ?? ""} onChange={(e) => setF({ ...f, height_cm: num(e.target.value) })} /></label>
        <label className="fld">الوزن (كجم) <span className="en">Weight</span><input type="number" value={f.weight_kg ?? ""} onChange={(e) => setF({ ...f, weight_kg: num(e.target.value) })} /></label>
      </div>
      <label className="fld">موافقة ولي الأمر — التاريخ <span className="en">Guardian consent</span><input type="date" value={f.guardian_consent_on ?? ""} onChange={(e) => setF({ ...f, guardian_consent_on: e.target.value || null })} /></label>
      <label className="fld">ملاحظة المدرب <span className="en">Coach note</span><textarea value={f.coach_notes ?? ""} onChange={(e) => setF({ ...f, coach_notes: e.target.value || null })} /></label>
      <div className="sec"><h4>آخر تقييم <span className="en">Last evaluation</span></h4><div className="empty">قسم «التقييم» لسه قيد البناء — أول ما يتبني هيظهر هنا رسم آخر تقييم.</div></div>
      {err && <p className="err">{err}</p>}{ok && <p className="muted" style={{ color: "var(--green)" }}>اتحفظ ✓</p>}
      <div className="formacts"><button className="btn p" onClick={() => void save()}>{isNew ? "إضافة اللاعب" : "حفظ"}</button>
        {p && <button className="btn" onClick={() => void toggle()}>{p.is_active ? "إيقاف اللاعب" : "إعادة تفعيل"}</button>}</div>
    </aside>
  )
}

// ---------------- the team in the centre ----------------
function Ring({ p }: { p: Player }): React.JSX.Element {
  const c = TAU * RING_R
  const st = ST[p.status]
  return (
    <div className="pring"><svg viewBox="0 0 74 74"><circle cx="37" cy="37" r={RING_R} fill="none" stroke="#eef3f7" strokeWidth="6" />
      <circle cx="37" cy="37" r={RING_R} fill="none" stroke={st.color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c} ${c}`} /></svg>
      <span className="num">{p.shirt_number ?? "–"}</span></div>
  )
}

function TeamPanel({ team, players, selected, onPick, onNew, onEdit, onBulk }: {
  team: Team; players: Player[]; selected: string | null; onPick: (p: Player) => void; onNew: () => void; onEdit: () => void; onBulk: () => void
}): React.JSX.Element {
  const [pos, setPos] = useState<string>("")
  const [mode, setMode] = useState<"cards" | "table">("cards")
  const codes = positionsFor(team.sport)
  const active = players.filter((p) => p.is_active)
  const shown = players.filter((p) => !pos || p.position === pos)
  const count = (s: PlayerStatus): number => active.filter((p) => p.status === s).length
  const byPos = codes.map((c) => ({ ...c, n: active.filter((p) => p.position === c.code).length }))
  const maxPos = Math.max(1, ...byPos.map((b) => b.n))
  const ages = active.map((p) => ageOf(p.birth_date)).filter((a): a is number => a !== null)
  const ageBins = [...new Set(ages)].sort((a, b) => a - b).map((a) => ({ a, n: ages.filter((x) => x === a).length }))
  const maxAge = Math.max(1, ...ageBins.map((b) => b.n))
  return (
    <section className="card" style={{ "--tc": team.color } as React.CSSProperties}>
      <div className="tbar"><span className="badge">{team.age_group ?? sportAr(team.sport).slice(0, BADGE_CHARS)}</span>
        <div><h2>{team.name}</h2><div className="meta"><span className="chip">{sportAr(team.sport)}</span>{teamLabel(team) && <span className="chip">{teamLabel(team)}</span>}{team.play_format && <span className="chip">{team.play_format}</span>}{!team.is_active && <span className="chip">موقوف</span>}</div></div>
        <span className="sp" /><button className="btn" onClick={onEdit}>✎ تعديل الفريق</button></div>
      <div className="stats">
        <div className="st"><b>{active.length}</b><span>في القائمة</span></div>
        <div className="st g"><b>{count("ready")}</b><span>جاهز</span></div>
        <div className="st a"><b>{count("limited")}</b><span>مشاركة محدودة</span></div>
        <div className="st r"><b>{count("injured")}</b><span>مصاب</span></div>
      </div>
      <div className="tools">
        {codes.length > 0 && <div className="seg"><button className={pos ? "" : "on"} onClick={() => setPos("")}>الكل</button>{codes.map((c) => <button key={c.code} className={pos === c.code ? "on" : ""} onClick={() => setPos(c.code)}>{c.ar}</button>)}</div>}
        <span className="sp" />
        <div className="view"><button className={mode === "cards" ? "on" : ""} onClick={() => setMode("cards")}>بطاقات</button><button className={mode === "table" ? "on" : ""} onClick={() => setMode("table")}>جدول</button></div>
        <button className="btn p" style={{ height: "36px" }} onClick={onNew}>+ لاعب</button>
      </div>
      {!players.length && <div className="empty">لسه مفيش لاعبين في الفريق ده.<br />ضيفهم واحد واحد بزر «+ لاعب»، أو الصق القائمة كلها من Excel مرة واحدة.</div>}
      {players.length > 0 && mode === "cards" && (
        <div className="grid">
          {shown.map((p) => (
            <button key={p.id} className={`pl${selected === p.id ? " sel" : ""}${p.is_active ? "" : " off"}`} onClick={() => onPick(p)}>
              <span className="flag" style={{ background: ST[p.status].color }} /><Ring p={p} />
              <b>{p.full_name}</b>{p.position && <span className="pos">{p.position}</span>}<br />
              <small>{ST[p.status].ar}{ageOf(p.birth_date) !== null ? ` · ${ageOf(p.birth_date)} سنة` : ""}</small>
            </button>
          ))}
          <button className="addp" onClick={onNew}><span><i>+</i>لاعب جديد</span></button>
        </div>
      )}
      {players.length > 0 && mode === "table" && (
        <table className="tbl"><thead><tr><th>#</th><th>الاسم</th><th>المركز</th><th>العمر</th><th>الحالة</th><th>موافقة ولي الأمر</th></tr></thead>
          <tbody>{shown.map((p) => <tr key={p.id} onClick={() => onPick(p)}><td>{p.shirt_number ?? "–"}</td><td>{p.full_name}</td><td>{p.position ?? "—"}</td><td>{ageOf(p.birth_date) ?? "—"}</td>
            <td><span className="dot" style={{ background: ST[p.status].color }} />{ST[p.status].ar}</td><td>{p.guardian_consent_on ?? "—"}</td></tr>)}</tbody></table>
      )}
      {active.length > 0 && (
        <div className="comp">
          <div><h3 style={{ fontSize: "14px" }}>توزيع المراكز <span className="en">Positions</span></h3>
            <div className="bars">{byPos.map((b) => <div className="r" key={b.code}><span>{b.ar}</span><div className="t"><i style={{ width: `${(b.n / maxPos) * FULL}%` }} /></div><b>{b.n}</b></div>)}</div></div>
          <div><h3 style={{ fontSize: "14px" }}>الأعمار <span className="en">Age spread</span></h3>
            {ageBins.length ? <div className="ages">{ageBins.map((b) => <div key={b.a} style={{ height: `${(b.n / maxAge) * FULL}%` }}><span>{b.a} سنة</span></div>)}</div> : <p className="muted" style={{ marginTop: "10px" }}>أضف تواريخ الميلاد علشان يظهر توزيع الأعمار.</p>}</div>
        </div>
      )}
      <div className="bulk"><p><b>عندك القائمة في Excel؟</b> انسخ الأعمدة (الاسم · الرقم · المركز · تاريخ الميلاد) والصقها مرة واحدة.</p><button className="btn p" onClick={onBulk}>لصق القائمة</button></div>
    </section>
  )
}

// ---------------- screen ----------------
export function Squad({ data, reload }: { data: SquadData; reload: () => void }): React.JSX.Element {
  const [orgId, setOrgId] = useState(data.orgs[0]?.id ?? "")
  const [sport, setSport] = useState("")
  const [q, setQ] = useState("")
  const [teamId, setTeamId] = useState<string | null>(null)
  const [pick, setPick] = useState<Player | "new" | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const teams = useMemo(() => data.teams.filter((t) => t.org_id === orgId && (!sport || t.sport === sport)), [data.teams, orgId, sport])
  const team = teams.find((t) => t.id === teamId) ?? teams.find((t) => t.is_active) ?? teams[0]
  const roster = data.players.filter((p) => p.team_id === team?.id && (!q || p.full_name.includes(q) || String(p.shirt_number ?? "") === q))
  const playersIn = (t: Team): number => data.players.filter((p) => p.team_id === t.id && p.is_active).length
  const orgPlayers = data.players.filter((p) => p.org_id === orgId && p.is_active).length
  const sportsHere = [...new Set(data.teams.filter((t) => t.org_id === orgId).map((t) => t.sport))]
  const choose = (t: Team): void => { setTeamId(t.id); setPick(null) }

  if (!data.orgs.length) return <div className="loading">سجّل جهة الأول من لوحة المدير — كل فريق بيتبع جهة.</div>
  return (
    <div className="app">
      <nav className="rail"><img src={logo} alt="IM Training" />
        {RAIL.map((r) => <a key={r.ar} className={r.on ? "on" : ""} href={r.href}><svg viewBox="0 0 24 24"><path d={r.d} /></svg>{r.ar}</a>)}</nav>
      <main>
        <div className="top">
          <div className="pill" style={{ borderColor: "var(--teal)" }}>● <select value={sport} onChange={(e) => setSport(e.target.value)} aria-label="اللعبة"><option value="">كل الألعاب</option>{sportsHere.map((s) => <option key={s} value={s}>{sportAr(s)}</option>)}</select></div>
          <div className="pill">الجهة: <select value={orgId} onChange={(e) => { setOrgId(e.target.value); setTeamId(null); setPick(null) }} aria-label="الجهة">{data.orgs.map((o) => <option key={o.id} value={o.id}>{o.name_ar}</option>)}</select></div>
          <div className="pill search"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن لاعب بالاسم أو الرقم…" /></div>
          <a className="pill" href="#/">← لوحة المدير</a>
        </div>
        <div className="head">
          <div><h1>الفرق واللاعبين<span className="en">Teams &amp; Players</span></h1>
            <p>كل فريق بفئته ولعبته · اضغط على لاعب يفتح ملفه جنب القائمة من غير ما تسيب الصفحة</p></div>
          <div className="acts">{team && <button className="btn" onClick={() => setModal({ k: "bulk" })}>⇪ لصق قائمة من Excel</button>}<button className="btn p" onClick={() => setModal({ k: "team" })}>+ فريق جديد</button></div>
        </div>
        <div className="lay">
          <section className="card">
            <h3>الفرق <span className="en">Teams</span></h3><div className="sub" style={{ marginTop: "4px" }}>{teams.filter((t) => t.is_active).length} فرق · {orgPlayers} لاعب</div>
            <div className="teams">
              {teams.map((t) => (
                <button key={t.id} className={`team${t.id === team?.id ? " on" : ""}${t.is_active ? "" : " off"}`} style={{ "--tc": t.color } as React.CSSProperties} onClick={() => choose(t)}>
                  <span className="sw">{t.age_group ?? sportAr(t.sport).slice(0, BADGE_CHARS)}</span><div><b>{t.name}</b><small>{sportAr(t.sport)}{teamLabel(t) ? ` · ${teamLabel(t)}` : ""}</small></div>
                  <span className="n">{playersIn(t)}<small>لاعب</small></span></button>
              ))}
              <button className="addt" onClick={() => setModal({ k: "team" })}>+ فريق جديد — بأي لعبة</button>
            </div>
            <div className="coaches"><h3>المدربون <span className="en">Coaches</span></h3>
              <p className="muted" style={{ marginTop: "8px" }}>المدربين بينضموا برمز دعوة بدور «مدرب» من لوحة المدير، وبيظهروا هنا أول ما توافق عليهم.</p></div>
          </section>
          {team ? <TeamPanel key={team.id} team={team} players={roster} selected={pick && pick !== "new" ? pick.id : null} onPick={setPick} onNew={() => setPick("new")} onEdit={() => setModal({ k: "team", team })} onBulk={() => setModal({ k: "bulk" })} />
            : <section className="card"><div className="empty">لسه مفيش فرق للجهة دي.<br />اضغط «+ فريق جديد» واختار اللعبة والفئة.</div></section>}
          {team && pick && <PlayerFile key={pick === "new" ? "new" : pick.id} team={team} player={pick} close={() => { setPick(null); reload() }} />}
        </div>
        <div className="foot"><span>IM Training · الفرق واللاعبين — كل البيانات حقيقية من قاعدة البيانات</span><span className="en">Instructor: Mohamed Ayad</span></div>
      </main>
      {modal && <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>
        {modal.k === "team" ? <TeamForm orgId={orgId} team={modal.team} close={() => { setModal(null); reload() }} /> : team && <BulkForm team={team} close={() => { setModal(null); reload() }} />}</div>}
    </div>
  )
}

export function SquadScreen(): React.JSX.Element {
  const { data, error, reload } = useSquadData()
  const wrap = (c: React.ReactNode): React.JSX.Element => <div className="sq" dir="rtl" lang="ar">{c}</div>
  if (error === "schema") return wrap(<div className="loading"><p><b>قسم الفرق واللاعبين محتاج خطوة تفعيل واحدة في Supabase</b><br />(إظهار درج training للمنصة — Exposed schemas). بعدها اضغط إعادة المحاولة.</p><button className="btn p" onClick={reload}>إعادة المحاولة</button></div>)
  if (error) return wrap(<div className="loading"><p>تعذّر تحميل الفرق.</p><button className="btn" onClick={reload}>إعادة المحاولة</button></div>)
  if (!data) return wrap(<div className="loading">جارٍ تحميل الفرق… <span className="en">Loading</span></div>)
  return wrap(<Squad data={data} reload={reload} />)
}
