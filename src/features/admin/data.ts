// Live data for لوحة المدير (Admin command center): everything comes from the shared parent
// Supabase project (RLS lets the owner read all rows) plus the migrated v28 content files.
import { useCallback, useEffect, useState } from "react"
import { PLATFORM_ID, supabase } from "@/lib/supabase"
import skills from "@/content/legacy-v28/skills.json"
import drills from "@/content/legacy-v28/drills.json"
import plays from "@/content/legacy-v28/plays.json"
import games from "@/content/legacy-v28/games.json"
import roles from "@/content/legacy-v28/roles.json"
import quiz from "@/content/legacy-v28/quiz-bank.json"
import fitness from "@/content/legacy-v28/fitness-tests.json"
import tourn from "@/content/legacy-v28/tournament-systems.json"
import sportCounts from "./sport-counts.json"

export type OrgType = "club" | "academy" | "school" | "university" | "center"
export type MemberRole = "org_admin" | "technical_director" | "coach" | "fitness_coach" | "supervisor" | "player" | "parent"
export type MemberStatus = "pending" | "approved" | "suspended"

export interface Org { id: string; name_ar: string | null; name_en: string | null; org_type: OrgType; country: string | null; city: string | null; is_active: boolean; created_at: string }
export interface Member { id: string; user_id: string; org_id: string; role: MemberRole; status: MemberStatus; created_at: string; approved_at: string | null }
export interface Invite { id: string; code: string; org_id: string; default_role: MemberRole; expires_at: string | null; max_uses: number | null; uses: number; is_active: boolean; created_at: string }
export interface AuditRow { id: number; action: string; target_table: string | null; details: Record<string, unknown> | null; created_at: string }
export interface Profile { id: string; full_name: string | null }

export interface AdminData {
  orgs: Org[]
  members: Member[]
  invites: Invite[]
  audit: AuditRow[]
  names: Record<string, string>
  me: { name: string; isOwner: boolean }
}

export const ORG_TYPES: Record<OrgType, string> = { club: "نادي", academy: "أكاديمية", school: "مدرسة", university: "جامعة", center: "مركز رياضي" }
export const ROLE_AR: Record<MemberRole, string> = {
  org_admin: "مدير جهة", technical_director: "مدير فني", coach: "مدرب", fitness_coach: "مدرب إعداد بدني",
  supervisor: "مشرف", player: "لاعب", parent: "ولي أمر",
}
/** Country codes as stored in organizations.country (ISO 3166-1 alpha-2) → Arabic label. */
export const COUNTRIES: Readonly<Record<string, string>> = { SA: "السعودية", AE: "الإمارات", QA: "قطر", KW: "الكويت", BH: "البحرين", OM: "عُمان", EG: "مصر" }
export const countryAr = (c: string | null): string => (c ? COUNTRIES[c] ?? c : "")

/** Migrated v28 content — real counts from src/content/legacy-v28 (date of migration: 2026-10-25). */
export const MIGRATED_AT = "2026-10-25"
export const CONTENT_TOTAL = drills.length + plays.length + skills.length + games.length + tourn.length + roles.length + fitness.length + quiz.length

const SPORT_ORDER = [["football", "كرة القدم"], ["basketball", "السلة"], ["handball", "اليد"], ["volleyball", "الطائرة"], ["futsal", "الصالات"]] as const
export const SPORT_LABELS = SPORT_ORDER.map((s) => s[1])
const bySport = (rows: { sp?: unknown }[]): number[] => SPORT_ORDER.map(([id]) => rows.filter((r) => r.sp === id).length)
/** Plays and roles per sport: counted in docs/MIGRATION-MAP.md (their JSON has no single sport field). */
export const CONTENT_BY_SPORT: Readonly<Record<"skills" | "plays" | "roles", readonly number[]>> = {
  skills: bySport(skills as { sp?: unknown }[]),
  plays: sportCounts.plays,
  roles: sportCounts.roles,
}

const AUDIT_LIMIT = 60
const LIVE_TABLES = ["organizations", "memberships", "invite_codes", "audit_log"] as const

async function load(): Promise<AdminData> {
  const { data: u } = await supabase.auth.getUser()
  const uid = u.user?.id
  const [o, m, i, a, p] = await Promise.all([
    supabase.from("organizations").select("id,name_ar,name_en,org_type,country,city,is_active,created_at").order("created_at"),
    supabase.from("memberships").select("id,user_id,org_id,role,status,created_at,approved_at").eq("platform_id", PLATFORM_ID).order("created_at"),
    supabase.from("invite_codes").select("id,code,org_id,default_role,expires_at,max_uses,uses,is_active,created_at").eq("platform_id", PLATFORM_ID).order("created_at", { ascending: false }),
    supabase.from("audit_log").select("id,action,target_table,details,created_at").order("created_at", { ascending: false }).limit(AUDIT_LIMIT),
    supabase.from("profiles").select("id,full_name,role"),
  ])
  const failed = [o, m, i].find((r) => r.error)
  if (failed?.error) throw failed.error
  const profiles = (p.data ?? []) as (Profile & { role: string })[]
  const names: Record<string, string> = {}
  profiles.forEach((x) => { names[x.id] = x.full_name ?? "—" })
  const mine = profiles.find((x) => x.id === uid)
  return {
    orgs: (o.data ?? []) as Org[], members: (m.data ?? []) as Member[], invites: (i.data ?? []) as Invite[],
    audit: (a.data ?? []) as AuditRow[], names,
    me: { name: mine?.full_name ?? u.user?.user_metadata?.full_name ?? "", isOwner: mine?.role === "owner" },
  }
}

export function useAdminData(): { data: AdminData | null; error: boolean; reload: () => void } {
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => {
      try { const d = await load(); if (alive) { setData(d); setError(false) } } catch { if (alive) setError(true) }
    }
    void run()
    return () => { alive = false }
  }, [tick])
  // Live: any change to the shared core refreshes the board.
  useEffect(() => {
    const ch = supabase.channel("admin-live")
    LIVE_TABLES.forEach((t) => {
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => setTick((n) => n + 1))
    })
    ch.subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [])
  return { data, error, reload: useCallback(() => setTick((n) => n + 1), []) }
}

// ---------- actions (each is a real write, protected by RLS) ----------
export async function createOrg(v: { name_ar: string; name_en: string; org_type: OrgType; country: string; city: string }): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser()
  const { error } = await supabase.from("organizations").insert({ ...v, name_en: v.name_en || null, city: v.city || null, is_active: true, created_by: u.user?.id })
  return error ? error.message : null
}

export interface OrgFields { name_ar: string; name_en: string; org_type: OrgType; country: string; city: string }

/** Edit an organization — owner only (or a person the owner delegated 'org_edit' to). */
export async function updateOrg(id: string, v: OrgFields): Promise<string | null> {
  const { error } = await supabase.from("organizations").update({ ...v, name_en: v.name_en || null, city: v.city || null }).eq("id", id)
  return error ? error.message : null
}

/** Suspend or re-activate — the platform never deletes an organization, so its history stays. */
export async function setOrgActive(id: string, active: boolean): Promise<string | null> {
  const { error } = await supabase.from("organizations").update({ is_active: active }).eq("id", id)
  return error ? error.message : null
}

const CODE_LEN = 8
export const DAY_MS = 86_400_000
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export function newCode(): string {
  const r = crypto.getRandomValues(new Uint32Array(CODE_LEN))
  const s = Array.from(r, (n) => ALPHA[n % ALPHA.length]).join("")
  return s // same format the login screen accepts: 8 letters/digits
}

export async function createInvite(v: { org_id: string; role: MemberRole; days: number; max_uses: number }): Promise<{ code?: string; error?: string }> {
  const { data: u } = await supabase.auth.getUser()
  const code = newCode()
  const expires = new Date(Date.now() + v.days * DAY_MS).toISOString()
  const { error } = await supabase.from("invite_codes").insert({
    code, org_id: v.org_id, platform_id: PLATFORM_ID, default_role: v.role, expires_at: expires, max_uses: v.max_uses, uses: 0, is_active: true, created_by: u.user?.id,
  })
  return error ? { error: error.message } : { code }
}

export async function setMemberStatus(id: string, status: MemberStatus): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser()
  const patch = status === "approved" ? { status, approved_by: u.user?.id, approved_at: new Date().toISOString() } : { status }
  const { error } = await supabase.from("memberships").update(patch).eq("id", id)
  return error ? error.message : null
}

export async function deactivateInvite(id: string): Promise<string | null> {
  const { error } = await supabase.from("invite_codes").update({ is_active: false }).eq("id", id)
  return error ? error.message : null
}

export const inviteLive = (i: Invite, now = Date.now()): boolean =>
  i.is_active && (!i.expires_at || Date.parse(i.expires_at) > now) && (i.max_uses == null || i.uses < i.max_uses)
