// فريقي — choose the team and the players available today, then place them on "فريقنا".
import { useState } from "react"
import type { Mode, RoleInfo } from "./engine"
import { STATUS_DOT } from "./engine"
import { teamsFor, availableByDefault, shortName } from "./team"
import { positionsFor, ageOf, type Player, type Position, type SquadData, type LoadError } from "@/features/squad/data"
import cfg from "@/features/squad/squad-config.json"

const STATUS = cfg.status as Record<string, { ar: string; en: string }>
const NO_NUMBER = 999
const FOOT_AR: Record<string, string> = { R: "اليمنى", L: "اليسرى", B: "الاتنين" }

interface PickerProps {
  readonly mode: Mode; readonly data: SquadData | null; readonly error: LoadError; readonly slots: number
  readonly linkedTeam?: string; readonly chosen: readonly Player[]; readonly bench: readonly Player[]
  readonly expNames: boolean; readonly onExpNames: (on: boolean) => void
  readonly onApply: (teamId: string, players: Player[]) => void; readonly onUnlink: () => void; readonly onClose: () => void
}

export function SquadPicker({ mode, data, error, slots, linkedTeam, chosen, bench, expNames, onExpNames, onApply, onUnlink, onClose }: PickerProps): React.JSX.Element {
  const teams = data ? teamsFor(mode, data.teams) : []
  const [teamId, setTeamId] = useState<string>(linkedTeam ?? teams[0]?.id ?? "")
  const roster = (data?.players ?? []).filter((p) => p.team_id === teamId && p.is_active)
  const start = (id: string): Set<string> => {
    const mine = chosen.filter((p) => p.team_id === id)
    return new Set((mine.length ? mine : roster.filter(availableByDefault)).map((p) => p.id))
  }
  const [pick, setPick] = useState<Set<string>>(() => start(teamId))
  const team = teams.find((t) => t.id === teamId)
  const pos = team ? positionsFor(team.sport) : []
  const toggle = (id: string): void => setPick((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const changeTeam = (id: string): void => { setTeamId(id); setPick(new Set((data?.players ?? []).filter((p) => p.team_id === id && availableByDefault(p)).map((p) => p.id))) }

  const body = ((): React.JSX.Element => {
    if (error) return <p className="mu">{error === "schema" ? "قاعدة اللاعبين لسه مش مفعّلة لهذا الحساب." : "سجّل الدخول علشان تظهر فرقك ولاعبيك."}</p>
    if (!data) return <p className="mu">جاري تحميل الفرق…</p>
    if (!teams.length) return <p className="mu">مفيش فريق مسجّل للعبة دي — ضيف الفريق ولاعبيه من شاشة «الفريق» الأول.</p>
    return (
      <>
        <select className="tsel" value={teamId} onChange={(e) => changeTeam(e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}{t.age_group ? ` · ${t.age_group}` : ""}</option>)}</select>
        <div className="hd"><b>قائمة الحصة / المباراة <span className="en">Squad selection</span></b><small className={pick.size > slots ? "over" : ""}>{pick.size} / {slots}</small></div>
        {!roster.length && <p className="mu">الفريق ده لسه مفيهوش لاعبين.</p>}
        <ul className="roster">{[...roster].sort((a, z) => (a.shirt_number ?? NO_NUMBER) - (z.shirt_number ?? NO_NUMBER)).map((p) => (
          <li key={p.id}><label className={pick.has(p.id) ? "on" : ""}>
            <input type="checkbox" checked={pick.has(p.id)} onChange={() => toggle(p.id)} />
            <span className="no">{p.shirt_number ?? "–"}</span><b>{p.full_name}</b>
            <small>{pos.find((x) => x.code === p.position)?.ar ?? "بدون مركز"}</small>
            <i className="st" style={{ background: STATUS_DOT[p.status] }} title={STATUS[p.status]?.ar}>{STATUS[p.status]?.ar}</i>
          </label></li>))}</ul>
        {pick.size > slots && <p className="mu">الزيادة ({pick.size - slots}) هتفضل على الدكة.</p>}
        <button className="go" disabled={!pick.size} onClick={() => onApply(teamId, roster.filter((p) => pick.has(p.id)))}>وزّع على الملعب <span className="en">Place on pitch</span></button>
        {linkedTeam && <button className="un" onClick={onUnlink}>فك ربط الفريق (أرقام فقط)</button>}
        {bench.length > 0 && <p className="mu">على الدكة: {bench.map((p) => `${p.shirt_number ?? ""} ${shortName(p.full_name)}`).join(" · ")}</p>}
        <label className="chk"><input type="checkbox" checked={expNames} onChange={(e) => onExpNames(e.target.checked)} />إظهار الأسماء في الصورة والفيديو <span className="en">Names in exports</span></label>
        <p className="mu">الأساسي: الصورة والفيديو بالأرقام بس — حماية لخصوصية اللاعبين.</p>
      </>
    )
  })()

  return (
    <aside className="b3lib b3sq glass" aria-label="فريقي">
      <div className="hd"><b>فريقي <span className="en">My team</span></b><button onClick={onClose}>✕</button></div>
      {body}
    </aside>
  )
}

export function PlayerCard({ p, pos, role, onClose }: { readonly p: Player; readonly pos?: Position; readonly role: RoleInfo & { num?: number }; readonly onClose: () => void }): React.JSX.Element {
  const age = ageOf(p.birth_date)
  return (
    <div className="b3role b3pc glass"><button className="x" onClick={onClose}>✕</button>
      <b>{p.shirt_number ?? role.num ?? ""} · {p.full_name}</b>
      <div className="facts">
        <span><i style={{ background: STATUS_DOT[p.status] }} />{STATUS[p.status]?.ar} <em className="en">{STATUS[p.status]?.en}</em></span>
        <span>المركز: {pos?.ar ?? "—"} {pos && <em className="en">{pos.en}</em>}</span>
        <span>الدور في الخطة: {role.ar} {role.en && <em className="en">{role.en}</em>}</span>
        {p.strong_foot && <span>القدم الأقوى: {FOOT_AR[p.strong_foot]}</span>}
        {p.height_cm && <span>الطول: {p.height_cm} سم</span>}
        {age != null && <span>السن: {age}</span>}
      </div>
      {role.desc && <p>{role.desc}</p>}
      <div className="lg"><span><i style={{ background: "#F4D03F" }} />منطقة التحرك بالكرة</span><span><i style={{ background: "#4FD1C5" }} />بدون كرة</span></div>
    </div>
  )
}
