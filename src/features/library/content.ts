// Library content — the platform's own coaching content (drills, skills, animated plays).
// Read-only here; editing and per-organization libraries come with the database step.
import drillsJson from "@/content/legacy-v28/drills.json"
import skillsJson from "@/content/legacy-v28/skills.json"
import playsJson from "@/content/legacy-v28/plays.json"

export type Sport = "football" | "futsal" | "basketball" | "handball" | "volleyball"
export type DrillCat = "warm" | "phys" | "tech" | "tact" | "game" | "cool"

export interface Drill {
  id: string; sp: Sport[]; cat: DrillCat; dur: number; int: number; rpe: number; age: number
  ar: { name: string; obj: string; n: string; area: string; eq: string; pts: string[]; prog: string; reg: string; note: string }
  en: { name: string }
}
export type Token = [string, string, number | string, number, number]
export interface Step { c: { ar: string; en: string }; m: Record<string, [number, number]>; b?: string }
export interface Play {
  id: string; mode: string; cat: string
  name: { ar: string; en: string }; desc: { ar: string; en: string }
  tokens: Token[]; ball0: string; steps: Step[]
}
export interface Skill {
  id: string; sp: Sport; cat: "tech" | "tact" | "gk"; lvl: number; age: number
  ar: { n: string; w: string; pts: string[]; err: [string, string][]; prog: string }
  en: { n: string }
  anim?: Play
  links?: { d?: string[]; p?: string[] }
}

export const DRILLS = drillsJson as unknown as Drill[]
export const SKILLS = skillsJson as unknown as Skill[]
export const PLAYS = playsJson as unknown as Play[]

export const SPORTS: Record<Sport, { ar: string; en: string; short: string }> = {
  football: { ar: "كرة القدم", en: "Football", short: "FB" },
  futsal: { ar: "كرة الصالات", en: "Futsal", short: "FS" },
  basketball: { ar: "كرة السلة", en: "Basketball", short: "BB" },
  handball: { ar: "كرة اليد", en: "Handball", short: "HB" },
  volleyball: { ar: "الكرة الطائرة", en: "Volleyball", short: "VB" },
}

export const DRILL_CAT: Record<DrillCat, { ar: string; en: string; color: string }> = {
  warm: { ar: "إحماء", en: "Warm-up", color: "#e09a1c" },
  phys: { ar: "إعداد بدني", en: "Physical", color: "#d9483b" },
  tech: { ar: "مهارة", en: "Technical", color: "#1FB5A8" },
  tact: { ar: "خططي", en: "Tactical", color: "#5b6fe0" },
  game: { ar: "لعب", en: "Game", color: "#2fa36b" },
  cool: { ar: "تهدئة", en: "Cool-down", color: "#7c8ea3" },
}
export const SKILL_CAT: Record<string, { ar: string; en: string }> = {
  tech: { ar: "فنية", en: "Technical" }, tact: { ar: "خططية", en: "Tactical" }, gk: { ar: "حراسة مرمى", en: "Goalkeeping" },
}
export const PLAY_CAT: Record<string, { ar: string; en: string; color: string }> = {
  att: { ar: "هجوم منظم", en: "Attack", color: "#1FB5A8" },
  def: { ar: "دفاع", en: "Defence", color: "#5b6fe0" },
  counter: { ar: "هجوم مرتد", en: "Counter", color: "#d9483b" },
  press: { ar: "ضغط", en: "Press", color: "#e09a1c" },
  build: { ar: "بناء من الخلف", en: "Build-up", color: "#2fa36b" },
  sp: { ar: "كرات ثابتة", en: "Set pieces", color: "#9a6be0" },
  drill: { ar: "أنشطة عامة", en: "Activities", color: "#7c8ea3" },
}
const MODE_SPORT: Record<string, Sport> = { fb11: "football", fb7: "football", "k-fb": "football", futsal: "futsal", bb: "basketball", hb: "handball", vb: "volleyball" }
export const playSport = (p: Play): Sport | null => MODE_SPORT[p.mode] ?? null

// ---------- knowledge graph: skill ↔ drill ↔ play (links come from the content itself) ----------
export type NodeKey = `${"s" | "d" | "p"}:${string}`
export const byKey = new Map<NodeKey, { t: "s" | "d" | "p"; name: string; en: string }>()
DRILLS.forEach((x) => byKey.set(`d:${x.id}`, { t: "d", name: x.ar.name, en: x.en.name }))
SKILLS.forEach((x) => byKey.set(`s:${x.id}`, { t: "s", name: x.ar.n, en: x.en.n }))
PLAYS.forEach((x) => byKey.set(`p:${x.id}`, { t: "p", name: x.name.ar, en: x.name.en }))
export const ADJ = new Map<NodeKey, Set<NodeKey>>()
const link = (a: NodeKey, b: NodeKey): void => {
  if (!byKey.has(a) || !byKey.has(b)) return
  if (!ADJ.has(a)) ADJ.set(a, new Set()); if (!ADJ.has(b)) ADJ.set(b, new Set())
  ADJ.get(a)?.add(b); ADJ.get(b)?.add(a)
}
SKILLS.forEach((s) => { s.links?.d?.forEach((i) => link(`s:${s.id}`, `d:${i}`)); s.links?.p?.forEach((i) => link(`s:${s.id}`, `p:${i}`)) })
export const skillsForPlay = (id: string): Skill[] => SKILLS.filter((s) => s.links?.p?.includes(id))
export const skillsForDrill = (id: string): Skill[] => SKILLS.filter((s) => s.links?.d?.includes(id))

// ---------- the coach's request: words → filters (simple matching now; the AI assistant plugs in here later) ----------
export interface Ask { sp: Sport | null; age: number | null; min: number; few: boolean; focus: string[] }
const SP_WORDS: [string, Sport][] = [["صالات", "futsal"], ["قدم", "football"], ["سلة", "basketball"], ["يد", "handball"], ["طائرة", "volleyball"]]
export const FOCUS: Record<string, string[]> = {
  "سرعة": ["سرع", "sprint", "speed", "انطلاق"], "رشاقة": ["رشاق", "agil", "اتجاه", "direction"], "تحمل": ["تحمل", "endur", "aerobic"],
  "قوة": ["قوة", "strength", "power"], "تمرير": ["تمرير", "pass"], "تسديد": ["تسديد", "shoot", "finish"], "مراوغة": ["مراوغ", "dribbl"],
  "ضغط": ["ضغط", "press"], "دفاع": ["دفاع", "defen"], "استلام": ["استلام", "receiv", "first touch"], "مرونة": ["مرون", "stretch", "mobility"],
}
const DEFAULT_MINUTES = 60
const SCORE = { base: 40, focusHit: 26, fewEqHit: 12, fewEqMiss: -10, ageNear: 8, ageWindow: 4, max: 99, shortEq: 14 } as const
const MIN_WORD = 3
// Age limit: accepts "تحت 12" or "U12" (captures 12); rejects "12 سنة".  https://regex101.com/?regex=(%3F%3A%D8%AA%D8%AD%D8%AA%7CU)%5Cs*(%5Cd%2B)&flags=i
const AGE_RE = /(?:تحت|U)\s*(\d+)/i
// Duration: accepts "60 دقيقة" or "45 min" (captures the number); rejects "60".  https://regex101.com/?regex=(%5Cd%2B)%5Cs*(%3F%3A%D8%AF%D9%82%D9%8A%D9%82%D8%A9%7Cmin)
const MIN_RE = /(\d+)\s*(?:دقيقة|min)/
// Few equipment: accepts "أدوات قليلة" / "بدون أدوات" / "من غير أدوات"; rejects "أدوات كثيرة".
const FEW_RE = /أدوات قليلة|بدون أدوات|من غير أدوات/
// Light equipment list: accepts "أقماع" or "" ; rejects "حواجز، سلالم".
const FEW_EQ_RE = /^(أقماع|كرات|كرة|أقماع، كرات|كرات، أقماع|لا يوجد|—|-)?$/
// Word splitter: splits "سرعة، رشاقة U12" on spaces and Arabic/Latin commas.
const SPLIT_RE = /[\s،,]+/

export function parseAsk(q: string): Ask {
  const sp = SP_WORDS.find(([w]) => q.includes(w))?.[1] ?? null
  const a = AGE_RE.exec(q); const m = MIN_RE.exec(q)
  return { sp, age: a ? Number(a[1]) : null, min: m ? Number(m[1]) : DEFAULT_MINUTES, few: FEW_RE.test(q), focus: Object.keys(FOCUS).filter((w) => q.includes(w)) }
}
export function scoreDrill(x: Drill, f: Ask): number {
  if (f.sp && !x.sp.includes(f.sp)) return 0
  if (f.age && x.age > f.age) return 0
  const txt = `${x.ar.name} ${x.en.name} ${x.ar.obj}`.toLowerCase()
  let s: number = SCORE.base
  f.focus.forEach((w) => { if (FOCUS[w].some((k) => txt.includes(k))) s += SCORE.focusHit })
  if (f.few) s += FEW_EQ_RE.test(x.ar.eq.trim()) || x.ar.eq.length < SCORE.shortEq ? SCORE.fewEqHit : SCORE.fewEqMiss
  if (f.age && x.age >= f.age - SCORE.ageWindow) s += SCORE.ageNear
  return Math.max(0, Math.min(SCORE.max, s))
}
export function textMatch(q: string, ...parts: string[]): boolean {
  const t = parts.join(" ").toLowerCase()
  return q.toLowerCase().split(SPLIT_RE).filter((w) => w.length >= MIN_WORD).some((w) => t.includes(w))
}
