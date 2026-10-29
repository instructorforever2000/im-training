// المراكز والأدوار — content model: roles (platform content) + sports/formations/phases (roles-config.json).
import rolesJson from "@/content/legacy-v28/roles.json"
import drillsJson from "@/content/legacy-v28/drills.json"
import cfg from "./roles-config.json"

export type RoleSport = "fb" | "fs" | "bb" | "hb" | "vb"
export type PhaseKey = "att" | "td" | "def" | "ta"
export interface Txt { readonly ar: string; readonly en: string }
interface List { readonly ar: readonly string[]; readonly en: readonly string[] }
export interface Role {
  readonly id: string; readonly rs: RoleSport; readonly fam: string; readonly name: Txt; readonly desc: Txt
  readonly ph: Partial<Record<PhaseKey, List>>; readonly sp?: List; readonly kpi?: List; readonly drills: readonly string[]
  readonly z?: { readonly wb: readonly number[]; readonly nb: readonly number[] }
  readonly mv?: Partial<Record<PhaseKey, readonly (number | null)[]>>
}
/** [position code, shirt number, x along length, y across width] */
export type Slot = readonly [string, number, number, number]
export interface Phase { readonly k: PhaseKey; readonly ar: string; readonly en: string; readonly c: string }
interface DrillRow { readonly id: string; readonly ar: { readonly name: string }; readonly en: { readonly name: string } }

export const CFG = cfg
export const ROLES = rolesJson as unknown as readonly Role[]
export const SPORTS = cfg.sports as Record<RoleSport, { ar: string; en: string; L: number; W: number; wood: boolean }>
export const FORMATIONS = cfg.formations as unknown as Record<RoleSport, Record<string, readonly Slot[]>>
export const PHASES = cfg.phases as readonly Phase[]
const FAMILY = cfg.family as Partial<Record<RoleSport, Record<string, string>>>
const DRILL_NAME = new Map((drillsJson as unknown as readonly DrillRow[]).map((d) => [d.id, d]))

export function drillName(id: string): Txt | null {
  const d = DRILL_NAME.get(id)
  return d ? { ar: d.ar.name, en: d.en.name } : null
}
export function familyOf(rs: RoleSport, code: string): string {
  return FAMILY[rs]?.[code] ?? code
}
export function rolesFor(rs: RoleSport, fam: string): readonly Role[] {
  return ROLES.filter((r) => r.rs === rs && r.fam === fam)
}
