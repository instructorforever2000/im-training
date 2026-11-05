// المعايير (Norms engine): where a result sits against the published tables of tests-bank.json.
// pct  = percentile table (90th…10th) → interpolated percentile.
// class = classification cut-offs (ascending lower bounds; or upper bounds when "lower is better").
// ref  = reference means ± SD of sports populations (shown, not scored).
// derive = a value computed from the result (e.g. VO2max from Yo-Yo, peak power from the jump).
import bank from "./tests-bank.json"

export type Sex = "m" | "f"
export interface Group { sex: string; ages?: number[]; label: string; v?: (number | null)[]; cuts?: number[] }
export interface PctNorm { type: "pct"; p: number[]; groups: Group[]; src: string; note?: string }
export interface ClassNorm { type: "class"; labels: string[]; groups: Group[]; src: string; note?: string; lower?: boolean; on?: string }
export interface RefNorm { type: "ref"; items: { pop: string; sex: string; mean: number; sd: number | null }[]; src: string }
export interface MultiNorm { type: "multi"; list: (PctNorm | ClassNorm)[] }
export type Norm = PctNorm | ClassNorm | RefNorm | MultiNorm
export interface Derive { key: string; ar: string; unit: string; a: number; b: number; mass?: number; src: string }
export interface Test {
  k: string; c: string; ar: string; en: string; unit: string; lower: boolean; dp: number; eq: string[]; setup: string; steps: string[]
  score: string; safety: string; why: string; sp: string[]; ages: string; norms?: Norm; derive?: Derive
}
export interface Comp { k: string; ar: string; en: string; color: string }

export const TESTS: readonly Test[] = bank.tests as unknown as Test[]
export const COMPS: readonly Comp[] = bank.comps
export const COMP: Readonly<Record<string, Comp>> = Object.fromEntries(COMPS.map((c) => [c.k, c]))
export const TEST: Readonly<Record<string, Test>> = Object.fromEntries(TESTS.map((t) => [t.k, t]))

export interface Who { age: number | null; sex: Sex; mass?: number | null }
export interface Rating { label: string; tone: number; pct?: number; group: string; src: string }

/** Bands for a percentile → words and a 0..4 tone (0 = needs work, 4 = excellent). */
const BANDS: readonly { min: number; ar: string }[] = bank.bands
const HALF = 2
const ONE_DP = 10
const TONES = BANDS.length - 1
const band = (pct: number): { ar: string; tone: number } => {
  const i = BANDS.findIndex((b) => pct >= b.min)
  return { ar: BANDS[i].ar, tone: TONES - i }
}

const ageFits = (g: Group, age: number | null): boolean => !g.ages || (age !== null && age >= g.ages[0] && age <= g.ages[1])
const sexFits = (g: Group, sex: Sex): boolean => g.sex === "*" || g.sex === sex
/** The group that fits the person (age + sex), or the one the coach picked by label. */
export function pickGroup(groups: readonly Group[], who: Who, label?: string): Group | undefined {
  if (label) return groups.find((g) => g.label === label)
  return groups.find((g) => sexFits(g, who.sex) && ageFits(g, who.age) && !!g.ages) ?? groups.find((g) => sexFits(g, who.sex) && !g.ages)
}

/** Interpolated percentile of a value in a 90…10 table (null cells skipped). */
function percentile(p: readonly number[], v: readonly (number | null)[], x: number, lower: boolean): number {
  const pts = p.map((q, i) => ({ q, y: v[i] })).filter((o): o is { q: number; y: number } => o.y !== null)
  const better = (a: number, b: number): boolean => (lower ? a <= b : a >= b)
  const top = pts[0], low = pts[pts.length - 1]
  if (better(x, top.y)) return top.q
  if (!better(x, low.y)) return Math.max(1, low.q - (low.q / HALF))
  const i = pts.findIndex((o) => better(x, o.y))
  const hi = pts[i - 1], lo = pts[i]
  const span = hi.y - lo.y
  return span === 0 ? lo.q : Math.round(lo.q + ((x - lo.y) / span) * (hi.q - lo.q))
}

function rateOne(n: PctNorm | ClassNorm, t: Test, x: number, who: Who, label?: string): Rating | null {
  const g = pickGroup(n.groups, who, label)
  if (!g) return null
  if (n.type === "pct" && g.v) {
    const pct = percentile(n.p, g.v, x, t.lower)
    const b = band(pct)
    return { label: b.ar, tone: b.tone, pct, group: g.label, src: n.src }
  }
  if (n.type === "class" && g.cuts) {
    const idx = n.lower ? g.cuts.filter((c) => x > c).length : g.cuts.filter((c) => x >= c).length
    const label2 = n.labels[idx]
    const tone = n.lower ? Math.round(TONES * (1 - idx / (n.labels.length - 1))) : Math.round(TONES * (idx / (n.labels.length - 1)))
    return { label: label2, tone, group: g.label, src: n.src }
  }
  return null
}

/** The value that is rated: the result itself, or the derived value (VO2max) when the norms are "on" it. */
export function derived(t: Test, x: number, who: Who): number | null {
  const d = t.derive
  if (!d) return null
  if (d.mass !== undefined) return who.mass ? Math.round(d.a * x + d.mass * who.mass + d.b) : null
  return Math.round((d.a * x + d.b) * ONE_DP) / ONE_DP
}

export function rate(t: Test, x: number, who: Who, label?: string): Rating | null {
  const n = t.norms
  if (!n || n.type === "ref") return null
  const list = n.type === "multi" ? n.list : [n]
  const tryOne = (one: PctNorm | ClassNorm): Rating | null => {
    const on = one.type === "class" && one.on ? derived(t, x, who) : x
    return on === null ? null : rateOne(one, t, on, who, label)
  }
  return list.map(tryOne).find((r) => r !== null) ?? null
}

export const TONE_COLOR: readonly string[] = ["#d9483b", "#e09a1c", "#c9b23a", "#4fb37a", "#1FB5A8"]
export const ageOn = (birth: string | null | undefined, on = new Date()): number | null => {
  if (!birth) return null
  const b = new Date(birth)
  const a = on.getFullYear() - b.getFullYear() - (on < new Date(on.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0)
  return a > 0 ? a : null
}
