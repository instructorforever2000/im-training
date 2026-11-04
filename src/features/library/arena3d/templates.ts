/* eslint-disable ts-patterns/no-magic-numbers, ts-patterns/no-loop-statements, ts-patterns/no-nested-ternary, ts-patterns/no-param-reassign, ts-patterns/require-regex-example, ts-patterns/no-switch-statement -- drill layouts in metres on real fields; the regexes are plain keyword lists over the drill names (e.g. "rondo" matches "Rondo 4v2", not "Passing square") */
// Drill → 3D scene description. Every drill gets its real organisation: venue, area size, player numbers and roles,
// goals and equipment from its own card; exercises get the exact body position and equipment.
import type { Arrow, Area, BallKind, Player, Prop, PropKind, Spec, Team, Venue } from "./spec"
import { VENUES } from "./build"
import EX from "./exercises.json"

export interface DrillLike {
  readonly id: string
  readonly sp: readonly string[]
  readonly cat: string
  readonly age: number
  readonly en: { readonly name: string; readonly n: string; readonly area: string; readonly eq: string }
}

type P2 = [number, number]
const rad = (d: number): number => (d * Math.PI) / 180
const face = (from: P2, to: P2): number => (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI

/* ------------------------------------------------------------------ venue & ball */
const BALL: Record<Venue, BallKind> = { football: "football", futsal: "futsal", basketball: "basketball", handball: "handball", volleyball: "volleyball", hall: "football", gym: "med" }
export function venueOf(d: DrillLike, ctx?: string): Venue {
  if (d.id.startsWith("fs") || /futsal/i.test(d.en.name + d.en.area)) return "futsal"
  const s = d.sp.length === 1 ? d.sp[0] : ctx && d.sp.includes(ctx) ? ctx : d.sp[0]
  return (({ football: "football", basketball: "basketball", volleyball: "volleyball", handball: "handball", futsal: "futsal" }) as Record<string, Venue>)[s] ?? "football"
}

/* ------------------------------------------------------------------ text parsing */
const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, pairs: 2, pair: 2, threes: 3, trios: 3, fours: 4 }
function count(n: string): number {
  const t = n.toLowerCase()
  if (/whole squad|whole group|squad split/.test(t)) return 12
  if (/one ball (per|each)|a ball each|one player per|one ball each/.test(t)) return 8
  if (/^individual/.test(t)) return 6
  const nums = [...t.matchAll(/(\d+)(?:\s*[–-]\s*(\d+))?/g)].map((m) => Math.round((+m[1] + +(m[2] ?? m[1])) / 2))
  const groups = /groups? of (\d+)/.exec(t)
  if (groups) return +groups[1] * 2
  if (/^pairs|in pairs|^pair/.test(t)) return 6
  if (nums.length) return Math.min(22, nums.reduce((a, b) => a + b, 0))
  const w = Object.keys(NUM).find((k) => t.includes(k))
  return w ? NUM[w] * 2 : 8
}
function versus(name: string, n: string): [number, number] | null {
  const m = /(\d+)\s*(?:\+\s*gk\s*)?v(?:s)?\s*(\d+)/i.exec(name) ?? /(\d+)\s*(?:\+\s*gk\s*)?v(?:s)?\s*(\d+)/i.exec(n) ?? /(\d+)\s*(?:attackers?|defenders?)[^v]*v(?:s)?\s*(\d+)/i.exec(n)
  return m ? [+m[1], +m[2]] : null
}
function neutrals(name: string, n: string): number {
  const m = /(\d+)\s*neutrals?/i.exec(name + " " + n) ?? /\+\s*(\d+)\s*(?:targets|$)/i.exec(name)
  return m ? +m[1] : 0
}
function size(area: string, v: Venue): [number, number] {
  const m = /(\d+)\s*[×x]\s*(\d+)/.exec(area)
  if (m) { const a = +m[1], b = +m[2]; return [Math.max(a, b), Math.min(a, b)] }
  const V = VENUES[v], t = area.toLowerCase()
  if (/full|almost a full|length/.test(t)) return [V.L, V.W]
  if (/half|quarter/.test(t)) return [V.L / 2, V.W]
  if (/penalty|box|goal area|edge|in front|paint|basket|6–9|9 m|6 m|corner/.test(t)) return v === "football" ? [20, 40] : [9, V.W]
  if (/third/.test(t)) return [V.L / 3, V.W]
  if (/lane|track|loop|20 m|30 m/.test(t)) return [24, 10]
  if (/circle/.test(t)) return [12, 12]
  return v === "football" ? [20, 15] : [V.L / 2, V.W]
}

/* ------------------------------------------------------------------ builders */
class B {
  players: Player[] = []
  props: Prop[] = []
  arrows: Arrow[] = []
  areas: Area[] = []
  readonly venue: Venue
  constructor(venue: Venue) { this.venue = venue }
  p(x: number, z: number, team: Team, pose: string, look: P2 | number, extra: Partial<Player> = {}): P2 {
    const f = typeof look === "number" ? look : face([x, z], look)
    this.players.push({ x, z, face: f, pose, team, ...extra })
    return [x, z]
  }
  prop(kind: PropKind, x: number, z: number, extra: Partial<Prop> = {}): void { this.props.push({ kind, x, z, ...extra }) }
  ball(x: number, z: number): void { this.props.push({ kind: "ball", x, z, ball: BALL[this.venue] }) }
  arrow(from: P2, to: P2, type: Arrow["type"], bend = 0): void { this.arrows.push({ from, to, type, bend }) }
  spec(focus: Spec["focus"], close = false): Spec {
    return { venue: this.venue, ball: BALL[this.venue], players: this.players, props: this.props, arrows: this.arrows, areas: this.areas, focus, close }
  }
}
const ring = (cx: number, cz: number, r: number, n: number, a0 = 0): P2[] => Array.from({ length: n }, (_, i) => [cx + Math.cos(a0 + (i / n) * Math.PI * 2) * r, cz + Math.sin(a0 + (i / n) * Math.PI * 2) * r] as P2)
const jit = (i: number, k: number): number => (((i * 7919) % 13) / 13 - 0.5) * k

/** goal end on the right side of a venue */
const goalX = (v: Venue): number => VENUES[v].L / 2

/* ------------------------------------------------------------------ templates */
function rondo(v: Venue, outN: number, inN: number, w: number): Spec {
  const b = new B(v); b.areas.push({ x: 0, z: 0, w, d: w })
  const outside = Array.from({ length: outN }, (_, i) => { const a = (i / outN) * Math.PI * 2 + 0.4; const r = w / 2; return [Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98] as P2 })
  outside.forEach((q, i) => b.p(q[0], q[1], "a", i === 0 ? "pass" : "receive", [0, 0], i === 0 ? { ball: "feet" } : {}))
  ring(0, 0, w * 0.14, inN, 0.9).forEach((q, i) => b.p(q[0], q[1], "b", i ? "athletic" : "jog", outside[i % outN]))
  b.arrow(outside[0], outside[Math.floor(outN / 2)], "pass", 0.1); b.arrow(outside[Math.floor(outN / 2)], outside[1], "pass", -0.1)
  for (let i = 0; i < 3; i++) b.ball(w / 2 + 1.2, -w / 2 + i * 0.6)
  return b.spec({ x: 0, z: 0, w: w + 4, d: w + 4 })
}

function smallSided(v: Venue, a: number, c: number, neu: number, L: number, W: number, opts: { goals: "mini" | "full" | "none" | "four"; gk: boolean; zones?: number; ends?: number }): Spec {
  const b = new B(v), V = VENUES[v], full = L >= V.L * 0.9
  const cx = full || v !== "football" ? 0 : 0
  if (!full || v === "football") b.areas.push({ x: cx, z: 0, w: L, d: W, zones: opts.zones, ends: opts.ends })
  const gx = full ? V.L / 2 : L / 2
  if (!full && opts.goals !== "none") {
    if (opts.goals === "four") [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([s, t]) => b.prop("miniGoal", s * gx, t * W * 0.28, { rot: s > 0 ? 180 : 0, size: 1.5 }))
    else if (opts.goals === "mini") { b.prop("miniGoal", -gx, 0, { size: 2 }); b.prop("miniGoal", gx, 0, { rot: 180, size: 2 }) }
    else if (v === "football") { b.prop("goal", -gx, 0, { size: 5 }); b.prop("goal", gx, 0, { rot: 180, size: 5 }) }
  }
  const place = (n: number, side: number, team: Team): P2[] => {
    const cols = Math.max(1, Math.ceil(n / 3)), out: P2[] = []
    for (let i = 0; i < n; i++) {
      const col = Math.floor(i / 3), row = i % 3, rows = Math.min(3, n - col * 3)
      const x = side * (gx * 0.18 + (col / Math.max(1, cols)) * gx * 0.62) + jit(i, 2)
      const z = rows === 1 ? jit(i, 3) : ((row / (rows - 1)) - 0.5) * W * 0.62 + jit(i + 3, 2)
      out.push([x, z])
    }
    return out.map((q, i) => b.p(q[0], q[1], team, ["jog", "athletic", "sprint", "receive", "shuffle"][(i + (team === "b" ? 2 : 0)) % 5], [side * -gx, q[1] * 0.5]))
  }
  const A = place(a, -1, "a"), C = place(c, 1, "b")
  if (A.length) { const h = A[A.length > 2 ? 2 : 0]; b.players[b.players.findIndex((q) => q.x === h[0] && q.z === h[1])] = { ...b.players.find((q) => q.x === h[0] && q.z === h[1]) as Player, pose: "dribble", ball: "feet" }; if (A[1]) b.arrow(h, A[1], "pass", 0.12); b.arrow(h, [h[0] + gx * 0.35, h[1] + W * 0.12], "dribble") }
  if (C.length) b.arrow(C[0], [C[0][0] - gx * 0.3, C[0][1]], "run", 0.2)
  for (let i = 0; i < neu; i++) { const s = i % 2 ? 1 : -1; b.p(i < 2 ? 0 : s * gx * 0.95, i < 2 ? s * W * 0.49 : 0, "n", "athletic", [0, 0]) }
  if (opts.gk) { b.p(-gx + 0.8, 0, "gk", "gkSet", [0, 0]); b.p(gx - 0.8, 0, "gkb", "gkSet", [0, 0]) }
  return b.spec({ x: 0, z: 0, w: L + 6, d: W + 6 })
}

function finishing(v: Venue, n: number, name: string): Spec {
  const b = new B(v), gx = goalX(v)
  if (v === "basketball") {
    const hx = gx - 1.575, spots: P2[] = [[hx - 4.6, -3.4], [hx - 6.2, 0], [hx - 4.6, 3.4], [hx - 1.5, -6], [hx - 1.5, 6]]
    const lay = /lay|mikan|finishing|euro|post|box-out/i.test(name)
    const sh = lay ? b.p(hx - 1.4, 1.4, "a", "layup", [hx, 0], { ball: "hand" }) : b.p(spots[1][0], spots[1][1], "a", "bbShoot", [hx, 0], { ball: "hand" })
    b.arrow(sh, [hx, 0], "shot", 0.2)
    spots.slice(lay ? 0 : 2).slice(0, Math.max(2, Math.min(4, n - 1))).forEach((q, i) => b.p(q[0], q[1], i % 2 ? "b" : "a", i % 2 ? "bbDefense" : "bbDribble", [hx, 0], i % 2 ? {} : { ball: "hand" }))
    b.p(hx - 0.6, -1.6, "n", "catchHigh", [hx - 5, 0])
    return b.spec({ x: hx - 4, z: 0, w: 12, d: 13 })
  }
  if (v === "handball") {
    const shooters: P2[] = /wing|corner/i.test(name) ? [[gx - 4, -8.2], [gx - 4, 8.2]] : /7 m/i.test(name) ? [[gx - 7.5, 0]] : [[gx - 9.5, -2], [gx - 9.8, 2.5], [gx - 10.5, 0]]
    shooters.forEach((q, i) => b.p(q[0], q[1], "a", i ? "stand" : /7 m/i.test(name) ? "throwOver" : "hbJumpShot", [gx, 0], { ball: i ? "hands" : "hand" }))
    b.arrow(shooters[0], [gx, shooters[0][1] > 0 ? 0.8 : -0.8], "shot", 0.1)
    if (/block/i.test(name)) { b.p(gx - 7, -1.2, "b", "hbDefend", [gx - 10, 0]); b.p(gx - 7, 1.4, "b", "hbDefend", [gx - 10, 0]) }
    b.p(gx - 0.6, 0, "gk", "gkSet", [gx - 9, 0])
    for (let i = 0; i < 4; i++) b.ball(gx - 12 - i * 0.4, -5)
    return b.spec({ x: gx - 7, z: 0, w: 16, d: 18 })
  }
  // football / futsal
  const fut = v === "futsal", box = fut ? 6 : 16.5, cross = /cross|wide|wing|overlap/i.test(name)
  b.p(gx - 0.8, 0, "gk", "gkSet", [gx - 12, 0])
  if (cross) {
    const w = b.p(gx - 14, -22, "a", "kick", [gx - 6, 0], { ball: "feet" }); b.arrow(w, [gx - 7, 2], "pass", 0.25)
    ;[[gx - 13, -3], [gx - 11, 3], [gx - 16, 6]].forEach((q, i) => { const s = b.p(q[0], q[1], "a", i === 0 ? "sprint" : "jog", [gx, 0]); b.arrow(s, [s[0] + 5, s[1] - 1], "run", 0.1) })
    b.p(gx - 9, 0, "b", "athletic", [gx - 14, -10]); b.p(gx - 8, 4, "b", "athletic", [gx - 14, -10])
  } else {
    const sx = gx - (fut ? 9 : 18), s = b.p(sx, -2, "a", "kick", [gx, 0], { ball: "feet" }); b.arrow(s, [gx - 0.5, 1.6], "shot", 0.05)
    const layoff = b.p(sx + (fut ? 3 : 5), 4, "a", "receive", s); b.arrow(layoff, s, "pass", 0.1)
    if (/pressure|1v1|defend|2v1/i.test(name)) b.p(sx + 2.5, 0.5, "b", "athletic", s)
    for (let i = 0; i < Math.min(4, Math.max(2, n - 3)); i++) b.p(sx - 6 - i * 1.4, -6 + jit(i, 1), "a", "stand", [gx, 0])
    for (let i = 0; i < 6; i++) b.ball(sx - 5 + (i % 3) * 0.35, -9 - Math.floor(i / 3) * 0.35)
  }
  if (!fut) b.areas.push({ x: gx - box / 2, z: 0, w: box, d: 40.3, color: 0xf2c14e })
  return b.spec({ x: gx - (fut ? 7 : 12), z: 0, w: fut ? 16 : 30, d: fut ? 20 : 34 })
}

function goalkeeper(v: Venue, name: string): Spec {
  const b = new B(v), gx = goalX(v), small = v !== "football"
  b.p(gx - 0.9, 0.9, "gk", /cross|high/i.test(name) ? "catchHigh" : /dist|feet/i.test(name) ? "kick" : "gkDive", [gx - 10, 0])
  b.p(gx - 4, -4, "gkb", "gkSet", [gx, 0])
  const coach = b.p(gx - (small ? 7 : 11), 1, "coach", v === "handball" ? "throwOver" : "kick", [gx, 1], { ball: v === "handball" ? "hand" : "feet" })
  b.arrow(coach, [gx - 0.6, 2.4], "shot", 0.1)
  for (let i = 0; i < 6; i++) b.ball(coach[0] - 1.5 - (i % 3) * 0.35, coach[1] - 2 - Math.floor(i / 3) * 0.35)
  ;[[gx - 6, -3], [gx - 6, 3]].forEach((q) => b.prop("cone", q[0], q[1]))
  return b.spec({ x: gx - (small ? 4 : 6), z: 0, w: small ? 12 : 18, d: small ? 12 : 18 })
}

function passing(v: Venue, n: number, shape: "pairs" | "square" | "triangle" | "diamond" | "y" | "star" | "lines", W: number, aerial = false): Spec {
  const b = new B(v), ballFor = v === "football" || v === "futsal" ? "feet" : "hands"
  const passPose = v === "football" || v === "futsal" ? "pass" : v === "volleyball" ? "vbSet" : "chestPass"
  const recvPose = v === "football" || v === "futsal" ? "receive" : v === "volleyball" ? "vbDig" : "catchHigh"
  if (shape === "pairs" || shape === "lines") {
    const pairs = Math.max(2, Math.min(4, Math.round(n / 2))), gap = Math.min(10, W * 0.7)
    b.areas.push({ x: 0, z: 0, w: gap + 3, d: pairs * 3.4 + 2 })
    for (let i = 0; i < pairs; i++) {
      const z = (i - (pairs - 1) / 2) * 3.4, a = b.p(-gap / 2, z, "a", aerial && i === 0 ? "header" : passPose, [gap / 2, z], i % 2 ? {} : { ball: ballFor }), c = b.p(gap / 2, z, "a", recvPose, [-gap / 2, z])
      if (i % 2 === 0) b.arrow(a, c, "pass", aerial ? 0 : 0.05)
      b.prop("disc", -gap / 2 - 0.8, z); b.prop("disc", gap / 2 + 0.8, z)
    }
    return b.spec({ x: 0, z: 0, w: gap + 8, d: pairs * 3.4 + 6 })
  }
  const pts: P2[] = shape === "square" ? [[-W / 2, -W / 2], [W / 2, -W / 2], [W / 2, W / 2], [-W / 2, W / 2]]
    : shape === "triangle" ? ring(0, 0, W / 2, 3, -Math.PI / 2)
    : shape === "star" ? ring(0, 0, W / 2, 5, -Math.PI / 2)
    : shape === "y" ? [[-W, 0], [-W / 3, 0], [W / 3, -W / 2.2], [W / 3, W / 2.2]]
    : [[-W / 2, 0], [0, -W / 2], [W / 2, 0], [0, W / 2]]
  b.areas.push({ x: 0, z: 0, w: W * (shape === "y" ? 1.6 : 1.1) + 3, d: W * 1.1 + 3 })
  pts.forEach((q, i) => {
    b.prop("cone", q[0], q[1], { color: 0xf2c14e })
    b.p(q[0] + jit(i, 0.8), q[1] + 0.9, "a", i === 0 ? passPose : i === 1 ? recvPose : "stand", pts[(i + 1) % pts.length], i === 0 ? { ball: ballFor } : {})
    if (n > pts.length + i) b.p(q[0] - 0.8, q[1] - 0.7, "a", "stand", pts[(i + 1) % pts.length])
  })
  b.arrow(pts[0], pts[1], "pass", 0.08); b.arrow([pts[0][0] + 0.6, pts[0][1] + 1], [pts[1][0] + 0.6, pts[1][1] + 1.2], "run", -0.25)
  if (pts[2]) b.arrow(pts[1], pts[2], "pass", 0.08)
  return b.spec({ x: 0, z: 0, w: W * (shape === "y" ? 1.8 : 1.3) + 6, d: W * 1.3 + 6 })
}

function ballMastery(v: Venue, n: number, L: number, W: number, gates: boolean): Spec {
  const b = new B(v), hands = v === "basketball" || v === "handball" || v === "volleyball"
  b.areas.push({ x: 0, z: 0, w: L, d: W })
  const k = Math.min(10, n)
  for (let i = 0; i < k; i++) {
    const x = ((i % 4) / 3 - 0.5) * L * 0.7 + jit(i, 2), z = (Math.floor(i / 4) / Math.max(1, Math.ceil(k / 4) - 1) - 0.5) * W * 0.6 + jit(i + 5, 2)
    const pos = b.p(x, z, "a", hands ? (v === "basketball" ? "bbDribble" : "catchHigh") : i % 3 === 0 ? "juggle" : "dribble", (i * 47) % 360, { ball: hands ? "hand" : "feet" })
    if (i % 3 === 1) b.arrow(pos, [pos[0] + Math.cos(i) * 3, pos[1] + Math.sin(i) * 3], "dribble")
  }
  if (gates) for (let i = 0; i < 6; i++) { const x = ((i % 3) / 2 - 0.5) * L * 0.6, z = (Math.floor(i / 3) - 0.5) * W * 0.5; const c = [0xf2c14e, 0x1fb5a8, 0xe4572e][i % 3]; b.prop("cone", x - 0.8, z, { color: c }); b.prop("cone", x + 0.8, z, { color: c }) }
  return b.spec({ x: 0, z: 0, w: L + 4, d: W + 4 })
}

function lanes(v: Venue, n: number, kind: "sprint" | "agility" | "slides" | "jog" | "land", len: number): Spec {
  const b = new B(v), k = Math.max(3, Math.min(5, Math.ceil(n / 3)))
  for (let i = 0; i < k; i++) {
    const z = (i - (k - 1) / 2) * 2.6, x0 = -len / 2
    b.prop("cone", x0, z, { color: 0xf28c28 }); b.prop("cone", x0 + len, z, { color: 0xf28c28 })
    if (kind === "agility") { if (i % 2 === 0) b.prop("ladder", x0 + len * 0.3, z, { rot: 90, size: 4 }); else { for (let h = 0; h < 4; h++) b.prop("hurdle", x0 + len * 0.22 + h * 1.1, z, { rot: 90 }) } for (let c = 0; c < 4; c++) b.prop("pole", x0 + len * 0.62 + c * 1.6, z + (c % 2 ? 0.5 : -0.5)) }
    if (kind === "land") b.prop("box", x0 + len * 0.35, z, { size: 0.4 })
    const pose = kind === "sprint" ? (i % 2 ? "sprint" : "startSplit") : kind === "slides" ? "bbDefense" : kind === "agility" ? (i % 2 ? "fastFeet" : "shuffle") : kind === "land" ? (i % 2 ? "landing" : "squatJump") : "jog"
    const at = kind === "sprint" ? x0 + (i % 2 ? len * 0.45 : 0.6) : x0 + len * (0.2 + (i % 3) * 0.2)
    const p = b.p(at, z, "ath", pose, kind === "slides" ? 90 : 0)
    b.arrow([p[0] + 0.8, z], [x0 + len - 0.6, z], "run")
    if (n > k) b.p(x0 - 1.4, z, "ath", "stand", 0)
  }
  return b.spec({ x: 0, z: 0, w: len + 6, d: k * 2.6 + 6 })
}

function squad(v: Venue, kind: "warm" | "cool", n: number, name: string): Spec {
  const b = new B(v), k = Math.min(12, Math.max(6, n))
  if (kind === "cool") {
    const poses = ["hamSit", "butterfly", "quadStretch", "child", "straddle", "seatedTwist", "calfWall", "triceps"]
    for (let i = 0; i < k; i++) { const x = (i % 4) * 2.4 - 3.6, z = Math.floor(i / 4) * 2.6 - 2.6; b.prop("mat", x, z, { rot: 90 }); b.p(x, z, "a", poses[i % poses.length], 90 + jit(i, 30)) }
    b.p(-7, 0, "coach", "point", 0)
    return b.spec({ x: -1.5, z: 0, w: 16, d: 10 })
  }
  const course = /11\+|course|cone pairs/i.test(name)
  for (let i = 0; i < 6; i++) { b.prop("cone", -8 + i * 3.2, -3); b.prop("cone", -8 + i * 3.2, 3) }
  const poses = ["jog", "kneeHug", "shuffle", "jog", "lungeReach", "sprint", "frankenstein", "jog"]
  for (let i = 0; i < k; i++) { const lane = i % 2 ? 3 : -3, x = -8 + (i >> 1) * 3.4 + (lane > 0 ? 1.2 : 0); b.p(x, lane, "a", poses[i % poses.length], 0, v === "basketball" && !course ? { ball: "hand" } : {}) }
  b.arrow([-9, -3], [9, -3], "run"); b.arrow([9, 3], [-9, 3], "run")
  b.p(-11, 0, "coach", "point", 0)
  return b.spec({ x: -1, z: 0, w: 24, d: 12 })
}

function halfCourtBB(n: number, name: string): Spec {
  const b = new B("basketball"), hx = goalX("basketball") - 1.575
  const spots: P2[] = [[hx - 7.2, 0], [hx - 6, -4.6], [hx - 6, 4.6], [hx - 1.4, -6.4], [hx - 1.4, 6.4]]
  const att = Math.min(5, Math.max(2, /2v2|pick/i.test(name) ? 2 : /3v3/i.test(name) ? 3 : Math.ceil(n / 2)))
  const use = att === 2 ? [spots[0], [hx - 5.6, -1.2] as P2] : spots.slice(0, att)
  use.forEach((q, i) => {
    const a = b.p(q[0], q[1], "a", i === 0 ? "bbDribble" : "receive", [hx, 0], i === 0 ? { ball: "hand" } : {})
    b.p(q[0] + 1.2 + (q[0] < hx - 3 ? 0 : 0), q[1] * 0.85, "b", "bbDefense", [q[0] - 2, q[1]])
    if (i === 1) b.arrow(use[0], a, "pass", 0.1)
  })
  if (/pick|pnr|screen|dho|hand-off/i.test(name)) b.arrow(use[1], [use[0][0] + 0.8, use[0][1] - 0.8], "run", 0.2)
  b.arrow(use[0], [hx - 2, 1], "dribble")
  return b.spec({ x: hx - 4.5, z: 0, w: 13, d: 16 })
}

function fullCourt(v: Venue, a: number, c: number, name: string): Spec {
  const b = new B(v), V = VENUES[v], L = V.L, W = V.W
  const lanesZ = [-W * 0.3, 0, W * 0.3]
  for (let i = 0; i < Math.min(5, a); i++) { const z = lanesZ[i % 3] + (i > 2 ? W * 0.12 : 0), x = -L * 0.12 + (i === 1 ? L * 0.05 : 0); const p = b.p(x, z, "a", i === 1 ? (v === "basketball" ? "bbDribble" : "dribble") : "sprint", 0, i === 1 ? { ball: v === "football" || v === "futsal" ? "feet" : "hand" } : {}); b.arrow([p[0] + 1, z], [L * 0.32, z * 0.6], i === 1 ? "dribble" : "run") }
  for (let i = 0; i < Math.min(5, c); i++) b.p(L * 0.26 + (i % 2) * 2, (i - (c - 1) / 2) * 3, "b", v === "basketball" ? "bbDefense" : "athletic", 180)
  if (v === "handball" || v === "futsal" || /gk|keeper/i.test(name)) b.p(L / 2 - 0.8, 0, "gk", "gkSet", 180)
  if (/weave/i.test(name)) b.arrow([-L * 0.12, lanesZ[0]], [-L * 0.06, lanesZ[2]], "pass", 0.2)
  return b.spec({ x: L * 0.08, z: 0, w: L * 0.9, d: W + 4 })
}

function hbDefense(name: string): Spec {
  const b = new B("handball"), gx = goalX("handball")
  const sys = /5-1|5:1/.test(name) ? [6.2, 6.2, 6.2, 6.2, 6.2, 9] : /3-2-1|3:2:1/.test(name) ? [6.2, 6.2, 6.2, 8, 8, 10] : [6.2, 6.2, 6.2, 6.2, 6.2, 6.2]
  sys.forEach((r, i) => { const a = (i / 5 - 0.5) * 2.2, x = gx - Math.cos(a) * r, z = Math.sin(a) * r * 1.15; b.p(x, z, "b", "hbDefend", [gx - 14, z]) })
  ;[-7, -3, 0, 3, 7].forEach((z, i) => b.p(gx - 10.5 + Math.abs(z) * 0.2, z, "a", i === 2 ? "throwOver" : "receive", [gx, 0], i === 2 ? { ball: "hand" } : {}))
  b.p(gx - 6.6, 0.5, "a", "athletic", [gx, 0])
  b.p(gx - 0.6, 0, "gk", "gkSet", [gx - 9, 0])
  b.arrow([gx - 10.5, 0], [gx - 10.1, 3], "pass", 0.2)
  return b.spec({ x: gx - 8, z: 0, w: 18, d: 22 })
}

function volleyball(name: string, n: number): Spec {
  const b = new B("volleyball"), L = 9
  const team = (side: number, team: Team, pose: string): void => {
    const pos: P2[] = [[side * 2, -3], [side * 2, 0], [side * 2, 3], [side * 6.5, -3], [side * 6.5, 0], [side * 6.5, 3]]
    pos.forEach((q, i) => b.p(q[0], q[1], team, i < 3 ? (pose === "vbBlock" && i === 1 ? "vbBlock" : "athletic") : "vbDig", [0, q[1]]))
  }
  if (/serv/i.test(name) && !/receive/i.test(name)) {
    ;[-3, 0, 3].forEach((z, i) => b.p(-L - 0.8, z, "a", i === 1 ? "vbServe" : "stand", 0, i === 1 ? { ball: "hand" } : {}))
    b.arrow([-L - 0.5, 0], [6, 2.5], "shot", 0.1)
    ;[[6, -3], [6, 2.5], [3, 0]].forEach((q) => b.prop("hoop", q[0], q[1]))
    return b.spec({ x: -1, z: 0, w: 22, d: 13 })
  }
  if (/receive|reception|butterfly|target/i.test(name)) {
    b.p(-L - 0.6, 0, "b", "vbServe", 0, { ball: "hand" }); b.arrow([-L - 0.5, 0], [6, -2], "shot", 0.05)
    ;[[6, -2.6], [6.5, 0], [6, 2.6]].forEach((q, i) => b.p(q[0], q[1], "a", i === 0 ? "vbDig" : "athletic", 180))
    b.p(1, 1.2, "a", "vbSet", 180); b.arrow([6, -2.6], [1, 1.2], "pass", 0.2)
    return b.spec({ x: 0, z: 0, w: 22, d: 13 })
  }
  if (/block/i.test(name)) {
    ;[-2.8, 0, 2.8].forEach((z, i) => b.p(0.7, z, "a", i === 1 ? "vbBlock" : "athletic", 180))
    b.p(-0.8, -0.4, "b", "vbSpike", 0); b.p(-2.5, 2, "b", "vbSet", 0)
    return b.spec({ x: 0, z: 0, w: 14, d: 12 })
  }
  if (/set|setter/i.test(name)) {
    b.p(1, 1.5, "a", "vbSet", 180); b.p(3, -3, "coach", "throwUnder", 180); b.arrow([3, -3], [1, 1.4], "pass", 0.2); b.arrow([1, 1.5], [1, -3.5], "pass", 0.3)
    ;[[1.5, -3.5], [1.5, 3.8]].forEach((q) => b.prop("hoop", q[0], q[1]))
    b.p(3.2, -3.6, "a", "vbSpike", 180)
    return b.spec({ x: 2, z: 0, w: 12, d: 12 })
  }
  if (/pepper|pairs|wall|triangle|sprawl/i.test(name) || n <= 4) return passing("volleyball", n, /triangle/i.test(name) ? "triangle" : "pairs", 6)
  if (/dig|box/i.test(name)) { b.p(1.2, 0, "coach", "vbSpike", 180, { ball: "hand" }); b.prop("box", 1.2, 0, { size: 0.6 }); [[6, -2.5], [6.5, 0.5], [6, 3]].forEach((q, i) => b.p(q[0], q[1], "a", i === 1 ? "vbDig" : "athletic", 180)); b.arrow([1.2, 0], [6.4, 0.4], "shot"); return b.spec({ x: 3, z: 0, w: 14, d: 12 }) }
  team(-1, "a", "athletic"); team(1, "b", /attack|transition|spike|hit/i.test(name) ? "vbBlock" : "athletic")
  b.p(-2.2, 1, "a", "vbSpike", 0); b.arrow([-2.2, 1], [5, -2], "shot", 0.1)
  return b.spec({ x: 0, z: 0, w: 22, d: 13 })
}

/* ------------------------------------------------------------------ exercises (body positions) */
/** distance to the partner (negative: the partner stands behind, facing the same way) */
const PARTNER_GAP: Record<string, number> = { rowSit: 1.15, partnerPush: -0.75, "px-wheelbarrow": -1.45, "px-pair-pistol": 0.85, "px-pair-squat": 1.0, "px-mb-chest": 3.2, "px-mb-rot-pass": -0.45, "px-pair-carry": -0.3 }
type ExDef = { p: string; v?: "gym" | "hall"; h?: Player["hold"]; o?: string; n?: number; m?: string }
const EXS = EX as unknown as Record<string, ExDef>
function exercise(d: DrillLike, e: ExDef): Spec {
  const venue = e.v ?? (/weights|machine|barbell/i.test(d.en.area + d.en.eq) ? "gym" : "hall")
  const b = new B(venue), props = (e.o ?? "").split("+").filter(Boolean)
  const n = e.n ?? 1
  const moving = /walk|jog|run|shuffle|crawl|carry|lunge-walk|hop/i.test(d.en.name) && n > 1
  const wallFace = /^(wall|cable)/.test(e.o ?? "") && e.o !== "wallSide" ? (e.o === "wallBack" ? 0 : 180) : 90
  const gap = PARTNER_GAP[d.id] ?? PARTNER_GAP[e.m ?? ""] ?? 1.2
  for (let i = 0; i < n; i++) {
    const second = !!e.m && i === 1
    const x = second ? gap : moving ? -1.6 + i * 1.6 : (i - (n - 1) / 2) * 1.6, z = moving ? (i % 2) * 0.7 : 0
    const behind = second && gap < 0
    b.p(x, z, "ath", second ? (e.m as string) : e.p, second ? (behind ? 0 : 180) : e.m ? 0 : wallFace, { hold: e.h })
    if (props.includes("mat") && !second) b.prop("mat", x, z + (e.m ? 0 : 0.2), { rot: e.m ? 90 : 0 })
  }
  const P = (k: PropKind, x: number, z: number, extra: Partial<Prop> = {}): void => b.prop(k, x, z, extra)
  props.forEach((k) => {
    switch (k) {
      case "bench": P("bench", 0, 0, { rot: e.p.startsWith("bench") || e.p === "skull" || e.p === "benchFly" ? 90 : 0 }); break
      case "benchSide": P("bench", 0, 0); break
      case "benchBack": P("bench", 0, -0.75); break
      case "incline": P("bench", 0, -0.2, { rot: 90 }); P("box", 0, -0.75, { size: 0.9, color: 0x1d232b }); break
      case "box": P("box", 0, 0.55, { size: 0.45 }); break
      case "boxBack": P("box", 0, -0.9, { size: 0.45 }); break
      case "rack": P("rack", 0, -0.4); break
      case "cable": P("cable", -1.5, 0, { rot: -90 }); break
      case "cableBack": P("cable", 0, -1.2); break
      case "machine": P("machine", 0, 0.05, { rot: 0 }); break
      case "bars": P("bars", 0, 0); break
      case "dip": P("dipBars", 0, 0); break
      case "swiss": P("swissBall", 0, 0); break
      case "wall": P("wall", -0.8, 0, { rot: 90 }); break
      case "wallBack": P("wall", -0.42, 0, { rot: 90 }); break
      case "wallSide": P("wall", -0.7, 0, { rot: 90, size: 3 }); break
      case "cones": [-3, 3].forEach((x) => [-1.5, 1.5].forEach((z) => P("cone", x, z))); break
      case "hoops": for (let i = 0; i < 5; i++) P("hoop", -2 + i * 0.9, 1.2); break
      case "hurdles": for (let i = 0; i < 5; i++) P("hurdle", -2 + i * 1, 1.2, { rot: 90 }); break
      case "beam": P("beam", 0.4, 0); break
      case "pad": P("pad", 0, 0); break
      case "rope": P("rope", 0, 0); break
      case "stick": P("stick", 0.5, 0.6); break
      case "ball": P("ball", 0.5, 0.6, { ball: "football" }); break
      case "mball": P("ball", 0.4, 0.5, { ball: "med" }); break
      case "band": P("band", 0.5, 0.5); break
      case "dbs": P("dumbbell", 0.6, 0.4); P("dumbbell", 0.7, 0.6); break
      case "plates": P("barbell", 0, -1.6, { y: 0.225 }); break
    }
  })
  return b.spec({ x: 0, z: 0, w: 3, d: 3 }, true)
}

/* ------------------------------------------------------------------ dispatcher */
/** Small football grids are set up in the half between the centre circle and the box, as on a training pitch. */
function shift(s: Spec, dx: number): Spec {
  const mv = <T extends { x: number }>(o: T): T => ({ ...o, x: o.x + dx })
  return { ...s, players: s.players.map(mv), props: s.props.map(mv), areas: s.areas.map(mv), focus: mv(s.focus), arrows: s.arrows.map((a) => ({ ...a, from: [a.from[0] + dx, a.from[1]] as const, to: [a.to[0] + dx, a.to[1]] as const })) }
}
export function specFor(d: DrillLike, ctx?: string): Spec {
  const s = rawSpec(d, ctx)
  const centred = Math.abs(s.focus.x) < 1 && !s.close
  if (s.venue === "football" && centred && s.focus.w < 46) return shift(s, -27)
  return s
}
function rawSpec(d: DrillLike, ctx?: string): Spec {
  const ex = EXS[d.id]
  if (ex) return exercise(d, ex)
  const v = venueOf(d, ctx), name = d.en.name, n = count(d.en.n), [L, W] = size(d.en.area, v), t = (name + " " + d.en.n).toLowerCase()
  const vs = versus(name, d.en.n), neu = neutrals(name, d.en.n), eq = d.en.eq.toLowerCase()
  if (d.cat === "cool") return squad(v, "cool", n, name)
  if (d.cat === "warm" && !/pass|ball-handling|shoulder|coordination|with the ball|dribble/i.test(name)) return squad(v, "warm", n, name)
  if (v === "volleyball") return /plyo|jump|landing|conditioning|shoulder|warm/i.test(name) ? (/shoulder|warm/i.test(name) ? squad(v, "warm", n, name) : lanes(v, n, /landing|jump/i.test(name) ? "land" : "sprint", 12)) : volleyball(name, n)
  if (/goalkeeper|^gk|keeper/i.test(name) && !/with keepers|flying|keepers and/i.test(name)) return goalkeeper(v, name)
  if (/rondo/i.test(name)) { const m = /(\d)v(\d)/i.exec(name); return rondo(v, m ? +m[1] : 4, m ? +m[2] : 2, Math.min(14, L)) }
  if (v === "handball" && /defen[cs]e|6:0|5-1|3-2-1|block and keeper/i.test(name) && !/footwork/i.test(name)) return hbDefense(name)
  if (/sprint|speed|agility|conditioning|slide|footwork|intervals|plyo|landing|hunter|race|relay|reaction|mirror|collect/i.test(t) && d.cat === "phys") {
    if (/landing/i.test(name)) return lanes(v, n, "land", 10)
    if (/slide|footwork/i.test(name)) return lanes(v, n, v === "basketball" ? "slides" : "agility", 12)
    if (/agility|coordination|reaction|mirror|colour/i.test(t)) return lanes(v, n, "agility", 14)
    return lanes(v, n, /interval|conditioning|4 × 4/i.test(t) ? "jog" : "sprint", Math.min(30, Math.max(14, L)))
  }
  if (/shoot|finish|cross|volley|lay-up|layup|mikan|free throw|catch-and-shoot|five-spot|7 m|wing shooting|jump shots|far-post|toe-poke|heading at|form shooting|post 1v1|box-out|rebound/i.test(name)) return finishing(v, n, name)
  if (v === "basketball" && /fast break|weave|transition|press|continuous|11-man|2v1|zigzag/i.test(name)) return fullCourt(v, vs ? vs[0] : 3, vs ? vs[1] : 2, name)
  if (v === "basketball" && /shell|pick|closeout|cut|zone|5-out|hand-off|dho|end-of-game|3v3|4v4|mini|no-dribble/i.test(name)) return halfCourtBB(n, name)
  if (v === "handball" && /fast break|waves|press|7v6/i.test(name)) return fullCourt(v, vs ? vs[0] : 3, vs ? vs[1] : 2, name)
  if (/ball mastery|sole|ball-handling|juggl|dribble through|dribbling moves|cone dribbling|running with the ball|dribble then|warm-up with the ball|weaker-foot|scanning|receive and turn|receiving and turning/i.test(name)) return ballMastery(v, n, Math.min(25, L), Math.min(20, W), /gate|scan|weaker/i.test(name))
  if (/pass|pepper|heading in pairs|aerial|weave|star|wall/i.test(name) && !vs) {
    const shape = /square/i.test(name) ? "square" : /diamond/i.test(name) ? "diamond" : /y-shape/i.test(name) ? "y" : /triangle|threes|angled|support/i.test(name) ? "triangle" : /star/i.test(name) ? "star" : "pairs"
    return passing(v, n, shape, Math.min(14, Math.max(8, W)), /aerial|heading/i.test(name))
  }
  // games, positional play, pressing, set plays, 1v1 …
  const pair = vs ?? (/1v1/i.test(name) ? [1, 1] : /2v2/i.test(name) ? [2, 2] : [Math.ceil(n / 2), Math.floor(n / 2)])
  const goals = /four goals|4 small|4 mini/i.test(eq + name) ? "four" : /mini|small goal/i.test(eq) ? "mini" : /goal/i.test(eq) ? "full" : "none"
  const zones = /three zones|three lanes|three channels|3 zones/i.test(d.en.area + name) ? 3 : /four zones/i.test(d.en.area) ? 4 : /two halves|split/i.test(d.en.area + name) ? 2 : undefined
  const ends = /end zone/i.test(d.en.area + name) ? Math.max(3, L * 0.12) : undefined
  const gk = /gk|keeper/i.test(d.en.n + eq + name) || goals === "full"
  return smallSided(v, Math.min(11, pair[0]), Math.min(11, pair[1]), neu, Math.min(L, VENUES[v].L), Math.min(W, VENUES[v].W), { goals, gk, zones, ends })
}

export const DEG = rad
