// Derived numbers for لوحة المدير. Pure functions over AdminData — no fetching here.
import cfg from "./sections.json"
import { CONTENT_TOTAL, DAY_MS, MIGRATED_AT, inviteLive, type AdminData, type Member, type Org } from "./data"

const R = cfg.rules
const PCT = 100
const HOURS_PER_DAY = 24
const HOUR_MS = DAY_MS / HOURS_PER_DAY
const COACH_ROLES = new Set(["coach", "fitness_coach", "technical_director"])

export type TileStatus = "w" | "p" | "d" | "b"
export const TILES = cfg.tiles as { ar: string; to: string; st: TileStatus }[]
export const READY_SECTIONS = TILES.filter((t) => t.st === "d" || t.st === "b").length

const dayEnd = (iso: string): number => Date.parse(`${iso}T23:59:59`)
const before = (ts: number) => (row: { created_at: string }): boolean => Date.parse(row.created_at) <= ts

/** What the system looked like at the end of a given day (time machine). */
export interface Snapshot { orgs: Org[]; members: Member[]; migrated: number; ready: number; events: number }
export function snapshotAt(d: AdminData, isoDay: string): Snapshot {
  const ts = dayEnd(isoDay)
  const migrated = ts >= dayEnd(MIGRATED_AT) ? CONTENT_TOTAL : 0
  return {
    orgs: d.orgs.filter(before(ts)),
    members: d.members.filter(before(ts)),
    migrated,
    ready: migrated ? READY_SECTIONS : 0,
    events: d.audit.filter(before(ts)).length,
  }
}

const pad = (n: number): string => String(n).padStart("00".length, "0")
/** YYYY-MM-DD in the viewer's own time zone. */
export const localDay = (t: Date): string => `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`

/** Every day from the first record (or the migration) to today, as YYYY-MM-DD. */
export function timeline(d: AdminData): string[] {
  const firsts = [...d.orgs, ...d.members, ...d.invites, ...d.audit].map((r) => localDay(new Date(r.created_at)))
  const first = [MIGRATED_AT, ...firsts].sort()[0]
  const today = localDay(new Date())
  const start = Date.parse(`${first}T12:00:00`)
  const count = Math.round((Date.parse(`${today}T12:00:00`) - start) / DAY_MS)
  return Array.from({ length: Math.max(0, count) + 1 }, (_, i) => localDay(new Date(start + i * DAY_MS)))
}

export interface Health { score: number; parts: { label: string; value: number; color: string }[] }
export function orgHealth(d: AdminData, org: Org): Health {
  const mine = d.members.filter((m) => m.org_id === org.id && m.status === "approved")
  const coaches = mine.filter((m) => COACH_ROLES.has(m.role)).length
  const weekAgo = Date.now() - R.activeWeekDays * DAY_MS
  const events = d.audit.filter((a) => Date.parse(a.created_at) > weekAgo && JSON.stringify(a.details ?? {}).includes(org.id)).length
  const liveInvites = d.invites.some((i) => i.org_id === org.id && inviteLive(i))
  const pct = (v: number, target: number): number => Math.min(PCT, Math.round((v / target) * PCT))
  const parts = [
    { label: "مدربين", value: pct(coaches, R.coachTarget), color: "#1FB5A8" },
    { label: "أعضاء", value: pct(mine.length, R.memberTarget), color: "#5b6fe0" },
    { label: "نشاط الأسبوع", value: pct(events, R.eventsForFullActivity), color: "#f0a92b" },
    { label: "رمز دعوة نشط", value: liveInvites ? PCT : 0, color: "#3ccf8e" },
  ]
  return { score: Math.round(parts.reduce((a, p) => a + p.value, 0) / parts.length), parts }
}

export interface Alert { tone: "r" | "a" | "i"; icon: string; title: string; note: string; action: string; to: "inv" | "app" | "map" }
export function smartAlerts(d: AdminData): Alert[] {
  const now = Date.now()
  const noCoach: Alert[] = d.orgs.filter((o) => o.is_active && now - Date.parse(o.created_at) > R.noCoachDays * DAY_MS
    && !d.members.some((m) => m.org_id === o.id && m.status === "approved" && COACH_ROLES.has(m.role)))
    .map((o) => ({ tone: "r", icon: "!", title: `${o.name_ar ?? o.name_en ?? ""} ما فيهاش ولا مدرب`, note: `مسجّلة من ${o.created_at.slice(0, "YYYY-MM-DD".length)} · قاعدة: جهة بلا مدرب أكتر من ${R.noCoachDays} أيام`, action: "رمز مدرب", to: "inv" }))
  const pending = d.members.filter((m) => m.status === "pending")
  const pendingAlert: Alert[] = pending.length ? [{ tone: "a", icon: "⏳", title: `${pending.length} طلب انضمام بانتظار موافقتك`, note: "Pending approvals", action: "راجع", to: "app" }] : []
  const live = d.invites.filter((i) => inviteLive(i, now))
  const expiring: Alert[] = live.filter((i) => i.expires_at && Date.parse(i.expires_at) - now < R.expiringHours * HOUR_MS)
    .map((i) => ({ tone: "a", icon: "⌛", title: `الرمز ${i.code} هينتهي قريب`, note: `ينتهي ${new Date(i.expires_at ?? "").toLocaleString("ar")}`, action: "رمز جديد", to: "inv" }))
  const noInvites: Alert[] = live.length ? [] : [{ tone: "a", icon: "⏳", title: "مفيش رموز دعوة نشطة", note: "محدش يقدر ينضم دلوقتي · أول رمز بيفتح رحلة العضو", action: "إصدار", to: "inv" }]
  const left = TILES.length - TILES.filter((t) => t.st === "b").length
  const build: Alert[] = [{ tone: "i", icon: "◔", title: `${left} قسم من ${TILES.length} لسه ما اتبناش`, note: "الأولوية حسب خريطة النقل: الفرق واللاعبين ← الوحدة التدريبية", action: "الخريطة", to: "map" }]
  return [...noCoach, ...pendingAlert, ...expiring, ...noInvites, ...build].slice(0, R.alertsMax)
}

export function journey(d: AdminData): { issued: number; signed: number; pending: number; active: number; suspended: number } {
  const count = (s: Member["status"]): number => d.members.filter((m) => m.status === s).length
  return { issued: d.invites.length, signed: d.members.length, pending: count("pending"), active: count("approved"), suspended: count("suspended") }
}

export function greeting(): string {
  const NOON = 12
  return new Date().getHours() < NOON ? "صباح الخير" : "مساء الخير"
}

export function briefing(d: AdminData, name: string): string {
  const j = journey(d)
  const orgs = d.orgs.filter((o) => o.is_active)
  const alerts = smartAlerts(d).filter((a) => a.tone !== "i")
  const orgLine = orgs.length ? `المنظومة فيها ${orgs.length} جهة نشطة: ${orgs.map((o) => o.name_ar).join("، ")}.` : "لسه مفيش جهات مسجّلة."
  const memLine = `الأعضاء النشطين ${j.active}، وبانتظار الموافقة ${j.pending}.`
  const content = `اتنقل ${CONTENT_TOTAL} عنصر من المنصة القديمة، و${READY_SECTIONS} أقسام من ${TILES.length} بياناتها جاهزة.`
  const al = alerts.length ? `فيه تنبيه مهم: ${alerts[0].title}.` : "مفيش تنبيهات مهمة."
  return `${greeting()} يا كابتن ${name}. ${orgLine} ${memLine} ${content} ${al}`
}

export const pct100 = PCT
