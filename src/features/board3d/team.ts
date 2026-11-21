// ربط الفريق بالسبورة — places the coach's real players (training.players) on "فريقنا" slots.
// Order of fit: registered position → strong foot for the side of the pitch → shirt number.
import type { BoardState, Mode, Token } from "./engine"
import type { Player, Team } from "@/features/squad/data"

/** Board mode → the squad sport it plays (teams.sport). */
export const SPORT_OF_MODE: Partial<Record<Mode, string>> = { fb11: "football", fb7: "football", futsal: "futsal", bb: "basketball", hb: "handball", vb: "volleyball" }
export const teamsFor = (mode: Mode, teams: readonly Team[]): Team[] => teams.filter((t) => t.is_active && t.sport === SPORT_OF_MODE[mode])

/** Formation slot code → squad position codes, best first (squad-config.json positions). */
const FIT: Record<string, readonly string[]> = {
  GK: ["GK"],
  CB: ["CB"], RCB: ["CB"], LCB: ["CB"],
  RB: ["FB", "WB"], LB: ["FB", "WB"], RWB: ["WB", "FB"], LWB: ["WB", "FB"],
  DM: ["DM", "CM"], CM: ["CM", "DM", "AM"], RCM: ["CM", "DM", "AM"], LCM: ["CM", "DM", "AM"],
  RM: ["W", "CM", "WB"], LM: ["W", "CM", "WB"], CAM: ["AM", "CM"], RAM: ["AM", "W"], LAM: ["AM", "W"],
  RW: ["W", "AM"], LW: ["W", "AM"], ST: ["ST", "W", "AM"],
  FIXO: ["FIXO"], ALA: ["ALA"], PIVO: ["PIVO"],
  PG: ["PG", "SG"], SG: ["SG", "PG", "SF"], SF: ["SF", "SG", "PF"], PF: ["PF", "C", "SF"], C: ["C", "PF"],
  S: ["S"], OH: ["OH", "OPP"], MB: ["MB"], OPP: ["OPP", "OH"], L: ["L"],
  PV: ["PV"], BACK: ["BACK"], WING: ["WING"],
}
/** Handball slots use side codes; same slot names mean different squad positions there. */
const FIT_HB: Record<string, readonly string[]> = { GK: ["GK"], LW: ["WING"], RW: ["WING"], LB: ["BACK", "CB"], RB: ["BACK", "CB"], CB: ["CB", "BACK"], PV: ["PV"] }

/** Slot side from its code: "RB" → R, "LCM" → L; the volleyball libero "L" has no side. */
const SIDE_OF: readonly { side: "R" | "L"; test: (c: string) => boolean }[] = [
  { side: "R", test: (c) => c.startsWith("R") },
  { side: "L", test: (c) => c.startsWith("L") && c !== "L" },
]
const NO_NUMBER = 999
const WRONG_FOOT = 0.5, OTHER_POS = 3, KEEPER_SWAP = 9
function cost(mode: Mode, code: string, p: Player): number {
  const fit = (mode === "hb" ? FIT_HB : FIT)[code] ?? []
  const pos = p.position ?? ""
  const keeper = code === "GK", isGk = pos === "GK"
  if (keeper !== isGk && (keeper || isGk)) return KEEPER_SWAP
  const i = fit.indexOf(pos)
  let c = i < 0 ? OTHER_POS : i
  const side = SIDE_OF.find((x) => x.test(code))?.side ?? ""
  if (side && p.strong_foot && p.strong_foot !== "B" && p.strong_foot !== side) c += WRONG_FOOT
  return c
}

/** Players who are available by default: ready or limited, active. */
export const availableByDefault = (p: Player): boolean => p.is_active && (p.status === "ready" || p.status === "limited")

// Spaces between name parts: matches " " and "  "; rejects "-". https://regex101.com/?regex=%5Cs%2B&testString=%D9%85%D8%AD%D9%85%D8%AF%20%D8%B9%D9%8A%D8%A7%D8%AF
const SPACES = /\s+/
/** Words that are only half a name: "عبد الله"، "أبو بكر"، "عبد الرحمن" stay together. */
const JOINED: ReadonlySet<string> = new Set(["عبد", "عبدال", "أبو", "ابو", "أبي", "ابي", "بن", "ابن", "آل", "ال", "Abdul", "Abd", "Abu", "Al", "El", "Bin"])
/** Name parts with "عبد / أبو …" kept with the word after them: "عبد الله محمد" → ["عبد الله", "محمد"]. */
export function nameParts(full: string): string[] {
  return full.trim().split(SPACES).filter(Boolean).reduce<string[]>((out, w) => {
    const last = out.at(-1)
    return last !== undefined && JOINED.has(last) ? [...out.slice(0, -1), `${last} ${w}`] : [...out, w]
  }, [])
}
/** First name only — keeps the pitch readable ("10 · محمد"). */
export const shortName = (full: string): string => nameParts(full)[0] ?? full.trim()

/** Pitch labels for a squad: first name; when two players share it, add the father's initial ("محمد ع."), then the full father's name. */
const LEVELS = [0, 1, 2, 3]
export function pitchNames(players: readonly Player[]): Map<string, string> {
  const parts = new Map(players.map((p) => [p.id, nameParts(p.full_name)]))
  /** Each name gets longer only as far as its parts allow: محمد → محمد ع. → محمد علي → محمد علي ح. */
  const forms = (ps: readonly string[]): string[] => [
    ps[0], ...(ps[1] ? [`${ps[0]} ${ps[1][0]}.`, `${ps[0]} ${ps[1]}`] : []), ...(ps[1] && ps[2] ? [`${ps[0]} ${ps[1]} ${ps[2][0]}.`] : []),
  ].filter((x): x is string => !!x)
  const label = (p: Player, depth: number): string => {
    const f = forms(parts.get(p.id) ?? [])
    return f[Math.min(depth, f.length - 1)] ?? p.full_name
  }
  const clash = (p: Player, depth: number): boolean => players.some((o) => o.id !== p.id && label(o, depth) === label(p, depth))
  return new Map(players.map((p) => [p.id, label(p, LEVELS.find((d) => !clash(p, d)) ?? LEVELS.length - 1)]))
}

const LINK_KEYS = new Set(["pid", "nm", "ps"])
const unlink = (t: Token): Token => Object.fromEntries(Object.entries(t).filter(([k]) => !LINK_KEYS.has(k))) as unknown as Token

/** Put the chosen players on our side's slots. Returns the new board and the players left on the bench. */
export function placeSquad(b: BoardState, team: Team, chosen: readonly Player[]): { board: BoardState; bench: Player[] } {
  const slots = b.tokens.filter((t) => t.kind === "p" && t.team === "A")
  const pairs = slots.flatMap((t) => chosen.map((p) => ({ t, p, c: cost(b.mode, t.code ?? "", p) })))
    .sort((a, z) => a.c - z.c || (a.p.shirt_number ?? NO_NUMBER) - (z.p.shirt_number ?? NO_NUMBER))
  const match = pairs.reduce<Map<string, Player>>((m, { t, p }) => {
    const taken = m.has(t.id) || [...m.values()].some((x) => x.id === p.id)
    return taken ? m : m.set(t.id, p)
  }, new Map())
  const names = pitchNames(chosen)
  const tokens = b.tokens.map((t): Token => {
    const p = match.get(t.id)
    if (!p) return unlink(t)
    return { ...unlink(t), pid: p.id, nm: names.get(p.id) ?? shortName(p.full_name), ps: p.status, num: p.shirt_number ?? t.num }
  })
  const placed = new Set([...match.values()].map((p) => p.id))
  return { board: { ...b, tokens, subs: [], squad: { id: team.id, name: team.name } }, bench: chosen.filter((p) => !placed.has(p.id)) }
}

/** Remove real names: used when the viewer has no access to the saved board's team (privacy). */
export function stripSquad(b: BoardState): BoardState {
  return { ...b, squad: undefined, subs: [], tokens: b.tokens.map(unlink) }
}
