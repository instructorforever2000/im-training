// البطولات — pure tournament logic (no database): fixtures, standings, knockout progression.
// Systems follow src/content/legacy-v28/tournament-systems.json (league · knockout · groups then knockout).

export interface Entry { readonly id: string; readonly name: string; readonly grp: number; readonly seed: number | null; readonly result: number | null }
export interface Match {
  readonly id: string; readonly stage: string; readonly grp: number; readonly round: number; readonly slot: number
  readonly home_id: string | null; readonly away_id: string | null
  readonly home_score: number | null; readonly away_score: number | null
  readonly home_pen: number | null; readonly away_pen: number | null
}
export type NewMatch = Omit<Match, "id" | "home_score" | "away_score" | "home_pen" | "away_pen">
export interface Points { readonly win: number; readonly draw: number; readonly loss: number }
export interface Row { id: string; name: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; form: ("w" | "d" | "l")[] }

/** Round robin (circle method). Odd counts get a rest ("bye") each round. Two legs mirror home/away. */
export function roundRobin(ids: readonly string[], legs: 1 | 2, grp = 1, stage = "league"): NewMatch[] {
  const list: (string | null)[] = [...ids]
  if (list.length % 2) list.push(null)
  const n = list.length, out: NewMatch[] = []
  if (n < 2) return out
  let arr = list
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i], b = arr[n - 1 - i]
      if (a && b) { const swap = r % 2 === 1 && i === 0; out.push({ stage, grp, round: r + 1, slot: i, home_id: swap ? b : a, away_id: swap ? a : b }) }
    }
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)]
  }
  if (legs === 2) { const first = out.length; for (let k = 0; k < first; k++) { const m = out[k]; out.push({ ...m, round: m.round + n - 1, home_id: m.away_id, away_id: m.home_id }) } }
  return out
}

const played = (m: Match): boolean => m.home_score !== null && m.away_score !== null

/** League table: points, then goal difference, goals for, then head-to-head points, then name. */
export function standings(entries: readonly Entry[], matches: readonly Match[], pts: Points, grp?: number): Row[] {
  const es = grp === undefined ? entries : entries.filter((e) => e.grp === grp)
  const rows = new Map<string, Row>(es.map((e) => [e.id, { id: e.id, name: e.name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]))
  const ms = matches.filter((m) => m.stage !== "ko" && played(m) && rows.has(m.home_id ?? "") && rows.has(m.away_id ?? "")).sort((a, b) => a.round - b.round)
  for (const m of ms) {
    const h = rows.get(m.home_id as string) as Row, a = rows.get(m.away_id as string) as Row, hs = m.home_score as number, as = m.away_score as number
    h.p++; a.p++; h.gf += hs; h.ga += as; a.gf += as; a.ga += hs
    if (hs > as) { h.w++; a.l++; h.pts += pts.win; a.pts += pts.loss; h.form.push("w"); a.form.push("l") }
    else if (hs < as) { a.w++; h.l++; a.pts += pts.win; h.pts += pts.loss; a.form.push("w"); h.form.push("l") }
    else { h.d++; a.d++; h.pts += pts.draw; a.pts += pts.draw; h.form.push("d"); a.form.push("d") }
  }
  const h2h = (x: Row, y: Row): number => {
    let px = 0, py = 0
    for (const m of ms) {
      const xy = m.home_id === x.id && m.away_id === y.id, yx = m.home_id === y.id && m.away_id === x.id
      if (!xy && !yx) continue
      const xs = xy ? m.home_score as number : m.away_score as number, ys = xy ? m.away_score as number : m.home_score as number
      if (xs > ys) px += pts.win; else if (xs < ys) py += pts.win; else { px += pts.draw; py += pts.draw }
    }
    return py - px
  }
  return [...rows.values()].sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || h2h(x, y) || x.name.localeCompare(y.name, "ar"))
}

/** Knockout winner of one tie (null while undecided). Draws are settled by the penalty fields. */
export function winner(m: Match): string | null {
  if (!m.home_id) return m.away_id
  if (!m.away_id) return m.home_id
  if (!played(m)) return null
  const hs = m.home_score as number, as = m.away_score as number
  if (hs !== as) return hs > as ? m.home_id : m.away_id
  if (m.home_pen === null || m.away_pen === null || m.home_pen === m.away_pen) return null
  return m.home_pen > m.away_pen ? m.home_id : m.away_id
}

const pow2 = (n: number): number => { let p = 1; while (p < n) p *= 2; return p }
/** Standard bracket order for seeds 1..size so that 1 and 2 can only meet in the final. */
function bracketOrder(size: number): number[] {
  let o = [1]
  while (o.length < size) { const s = o.length * 2 + 1; o = o.flatMap((x) => [x, s - x]) }
  return o
}

/** First knockout round from a seeded list (best first). Missing places become byes for the top seeds. */
export function knockoutFirstRound(seeded: readonly string[], round = 1): NewMatch[] {
  const size = pow2(Math.max(2, seeded.length)), order = bracketOrder(size), out: NewMatch[] = []
  for (let i = 0; i < size; i += 2) {
    const a = seeded[order[i] - 1] ?? null, b = seeded[order[i + 1] - 1] ?? null
    out.push({ stage: "ko", grp: 0, round, slot: i / 2, home_id: a, away_id: b })
  }
  return out
}

/** Next knockout round once every tie of the latest round has a winner. Returns [] when not ready or finished. */
export function nextKnockoutRound(matches: readonly Match[]): NewMatch[] {
  const ko = matches.filter((m) => m.stage === "ko")
  if (!ko.length) return []
  const last = Math.max(...ko.map((m) => m.round)), cur = ko.filter((m) => m.round === last).sort((a, b) => a.slot - b.slot)
  if (cur.length < 2) return []
  const ws = cur.map(winner)
  if (ws.some((w) => w === null)) return []
  const out: NewMatch[] = []
  for (let i = 0; i < ws.length; i += 2) out.push({ stage: "ko", grp: 0, round: last + 1, slot: i / 2, home_id: ws[i], away_id: ws[i + 1] })
  return out
}

/** Name of a knockout round from the number of ties in it. */
export function koRoundName(ties: number): { ar: string; en: string } {
  if (ties === 1) return { ar: "النهائي", en: "Final" }
  if (ties === 2) return { ar: "نصف النهائي", en: "Semi-finals" }
  if (ties === 4) return { ar: "ربع النهائي", en: "Quarter-finals" }
  return { ar: `دور الـ${ties * 2}`, en: `Round of ${ties * 2}` }
}

/** Seeded group draw ("snake"): seed 1 → group 1, seed 2 → group 2 … then back. */
export function snakeGroups(ids: readonly string[], groups: number): number[] {
  return ids.map((_, i) => { const r = Math.floor(i / groups), c = i % groups; return (r % 2 ? groups - 1 - c : c) + 1 })
}

/** Groups → knockout: the top `q` of every group, crossed so group winners meet runners-up of another group. */
export function qualifiers(entries: readonly Entry[], matches: readonly Match[], pts: Points, groups: number, q = 2): string[] {
  const tables = Array.from({ length: groups }, (_, g) => standings(entries, matches, pts, g + 1))
  const firsts = tables.map((t) => t[0]?.id).filter(Boolean) as string[]
  const rest = q > 1 ? tables.map((t, g) => tables[(g + 1) % groups][1]?.id ?? t[1]?.id).filter(Boolean) as string[] : []
  return [...firsts, ...rest.reverse()]
}

/** Ranking events (athletics, swimming, judged sports): order by result. */
export function ranking(entries: readonly Entry[], lowerBetter: boolean): Entry[] {
  const withR = entries.filter((e) => e.result !== null).sort((a, b) => lowerBetter ? (a.result as number) - (b.result as number) : (b.result as number) - (a.result as number))
  return [...withR, ...entries.filter((e) => e.result === null)]
}

export const isPlayed = played
