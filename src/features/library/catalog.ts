// Drill catalogue — international classification for every drill: permanent reference number, LTAD age stage,
// drill format and training goal. Pure data helpers; the screens read from here.
import REFS from "./drill-refs.json"
import CFG from "./catalog-config.json"
import { DRILLS, type Drill, type Sport } from "./content"

export type StageKey = "s1" | "s2" | "s3" | "s4"
export type FormatKey = "solo" | "pairs" | "small" | "game" | "team"
export type GoalKey = string

interface Labelled { readonly ar: string; readonly en: string }
export const STAGES = CFG.stages as unknown as readonly (Labelled & { key: StageKey; from: number; to: number; ages: string })[]
export const FORMATS = CFG.formats as unknown as readonly (Labelled & { key: FormatKey })[]
export const GOALS = CFG.goals as unknown as Record<string, Labelled & { color: string }>
export const QUALITY = CFG.quality as unknown as Record<string, Labelled>

export const refOf = (d: Drill): string => (REFS as Record<string, string>)[d.id] ?? d.id
export const stageOf = (d: Drill): StageKey => (STAGES.find((s) => d.age <= s.to) ?? STAGES[STAGES.length - 1]).key

// A head-to-head drill: "Rondo 4v2", "6 defenders vs 6 attackers", "Two teams + 2 GKs" — not "Pairs".
// https://regex101.com/?flavor=javascript&regex=%5Cd%5Cs*v%5Cs*%5Cd%7C%5Cbvs%3F%5Cb%7Cteams%3F%7Cwaves&flags=i&testString=Rondo%204v2%0APairs
const VERSUS_RE = /\d\s*v\s*\d|\bvs?\b|teams?|waves/i
// Work in twos: "Pairs + GK", "One ball per pair", "Partner" — not "Groups of 3".
// https://regex101.com/?flavor=javascript&regex=%5Epairs%3F%7Cper%20pair%7Cpartner%7Cpairs%5Cb&flags=i&testString=Pairs%20%2B%20GK%0AGroups%20of%203
const PAIRS_RE = /^pairs?|per pair|partner|pairs\b/i
// Everyone on their own: "Individual — whole group", "One ball per player" — not "Pairs".
// https://regex101.com/?flavor=javascript&regex=%5Eindividual%7Cone%20ball%20(per%7Ceach)%7Cone%20player%20per%7Ca%20ball%20each%7C%5Eone%20ball&flags=i&testString=Individual%0APairs
const SOLO_RE = /^individual|one ball (per|each)|one player per|a ball each|^one ball/i
// The whole squad together: "Whole squad", "12 players", "8–12 players" — not "5 players".
// https://regex101.com/?flavor=javascript&regex=whole%20squad%7Cwhole%20group%7Csquad%20split%7C%5Cb1%5B0-9%5D%20players%7C%5Cb%5B89%5D%20players%7C8%E2%80%931%7C9%E2%80%931&flags=i&testString=12%20players%0A5%20players
const TEAM_RE = /whole squad|whole group|squad split|\b1[0-9] players|\b[89] players|8–1|9–1/i
// Splits a search into words: "ضغط عالي" → ["ضغط", "عالي"]; a single word stays whole.
// https://regex101.com/?flavor=javascript&regex=%5Cs%2B&testString=%D8%B6%D8%BA%D8%B7%20%D8%B9%D8%A7%D9%84%D9%8A
const WORDS_RE = /\s+/
const QUALITY_PREFIX = "q:"

export function formatOf(d: Drill): FormatKey {
  const n = d.en.n, name = d.en.name
  if (VERSUS_RE.test(name) || VERSUS_RE.test(n)) return "game"
  if (SOLO_RE.test(n)) return "solo"
  if (PAIRS_RE.test(n)) return "pairs"
  if (TEAM_RE.test(n)) return "team"
  return d.cat === "game" ? "game" : "small"
}
/** The goal a drill serves: its category, or for physical work its exact quality (strength, speed…). */
export function goalOf(d: Drill): GoalKey {
  return d.cat === "phys" && d.px ? `${QUALITY_PREFIX}${d.px.q}` : d.cat
}
export function goalLabel(k: GoalKey): Labelled & { color: string } {
  if (k.startsWith(QUALITY_PREFIX)) { const q = QUALITY[k.slice(QUALITY_PREFIX.length)]; return { ...(q ?? { ar: k, en: k }), color: GOALS.phys.color } }
  return GOALS[k] ?? { ar: k, en: k, color: "#7c8ea3" }
}
/** Training load of one bout: minutes × RPE (session-RPE method). */
export const loadOf = (d: Drill): number => d.dur * d.rpe

export interface Filters { sport: Sport | "all"; stage: StageKey | "all"; format: FormatKey | "all"; goal: GoalKey | "all"; q: string }
export const NO_FILTER: Filters = { sport: "all", stage: "all", format: "all", goal: "all", q: "" }

/** Futsal drills are filed under football in the source data; they belong to futsal. */
export const sportsOf = (d: Drill): readonly Sport[] => (d.id.startsWith("fs") || d.en.name.includes("Futsal") ? ["futsal"] : d.sp)
const sportOk = (d: Drill, s: Filters["sport"]): boolean => s === "all" || sportsOf(d).includes(s)
const stageOk = (d: Drill, s: Filters["stage"]): boolean => s === "all" || d.age <= (STAGES.find((x) => x.key === s)?.to ?? Infinity)
function textOk(d: Drill, q: string): boolean {
  const t = q.trim().toLowerCase()
  if (!t) return true
  const all = [d.ar.name, d.en.name, d.ar.obj, refOf(d), ...d.ar.pts].join(" ").toLowerCase()
  return t.split(WORDS_RE).every((w) => all.includes(w))
}
/** Default reading order of the catalogue: by sport, then the session flow (warm-up → technique → tactics → games → physical → cool-down). */
const SPORT_ORDER = ["FB", "FS", "BB", "HB", "VB", "GN"]
const CAT_ORDER = ["WU", "TE", "TA", "GM", "PH", "CD"]
const REF_PARTS = { sport: 1, cat: 2 }
function refRank(d: Drill): string {
  const p = refOf(d).split("-")
  return `${SPORT_ORDER.indexOf(p[REF_PARTS.sport])}${CAT_ORDER.indexOf(p[REF_PARTS.cat])}${refOf(d)}`
}
export function filterDrills(f: Filters): Drill[] {
  return DRILLS.filter((d) => sportOk(d, f.sport) && stageOk(d, f.stage) && (f.format === "all" || formatOf(d) === f.format) && (f.goal === "all" || goalOf(d) === f.goal) && textOk(d, f.q))
    .sort((a, b) => (f.stage === "all" ? 0 : b.age - a.age) || refRank(a).localeCompare(refRank(b)))
}
export function countBy<K extends string>(xs: readonly Drill[], key: (d: Drill) => K): Map<K, number> {
  return xs.reduce((m, d) => m.set(key(d), (m.get(key(d)) ?? 0) + 1), new Map<K, number>())
}
