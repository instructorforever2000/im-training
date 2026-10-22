// Official playing-area geometry for each sport, as dotted floor lines.
// Units: metres ÷ (half of the long side), so the long side always spans -1..1.
// Sources: FIFA, FIBA, IHF, FIVB, ITF, World Athletics, World Taekwondo competition rules.
export type Point = readonly [number, number]
export type Polyline = readonly Point[]
export interface Court {
  /** half of the short side, in the same units */
  vh: number
  /** first polyline is the outer boundary; the rest are inner markings */
  lines: readonly Polyline[]
}

const PI = Math.PI
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n = 40): Polyline =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
  })
const rect = (x0: number, y0: number, x1: number, y1: number): Polyline => [
  [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0],
]
const seg = (a: number, b: number, c: number, d: number): Polyline => [[a, b], [c, d]]

function football(): Court {
  const u = 52.5, vh = 34 / u, d = 16.5 / u, hw = 20.16 / u, g = 5.5 / u, gw = 9.16 / u
  const r = 9.15 / u, sx = 1 - 11 / u, a = Math.acos((d - (1 - sx)) / r)
  return {
    vh,
    lines: [
      rect(-1, -vh, 1, vh), seg(0, -vh, 0, vh), arc(0, 0, r, 0, 2 * PI),
      rect(-1, -hw, -1 + d, hw), rect(1 - d, -hw, 1, hw),
      rect(-1, -gw, -1 + g, gw), rect(1 - g, -gw, 1, gw),
      arc(-sx, 0, r, -a, a), arc(sx, 0, r, PI - a, PI + a),
    ],
  }
}

function basketball(): Court {
  const u = 14, vh = 7.5 / u, bx = 1 - 1.575 / u, r3 = 6.75 / u, y3 = 6.6 / u
  const a = Math.asin(y3 / r3), kd = 5.8 / u, kw = 2.45 / u, c = 1.8 / u, ra = 1.25 / u
  const ex = r3 * Math.cos(a)
  return {
    vh,
    lines: [
      rect(-1, -vh, 1, vh), seg(0, -vh, 0, vh), arc(0, 0, c, 0, 2 * PI),
      rect(-1, -kw, -1 + kd, kw), rect(1 - kd, -kw, 1, kw),
      arc(-1 + kd, 0, c, -PI / 2, PI / 2), arc(1 - kd, 0, c, PI / 2, (3 * PI) / 2),
      arc(-bx, 0, r3, -a, a), seg(-1, -y3, -bx + ex, -y3), seg(-1, y3, -bx + ex, y3),
      arc(bx, 0, r3, PI - a, PI + a), seg(1, -y3, bx - ex, -y3), seg(1, y3, bx - ex, y3),
      arc(-bx, 0, ra, -PI / 2, PI / 2, 16), arc(bx, 0, ra, PI / 2, (3 * PI) / 2, 16),
    ],
  }
}

function handball(): Court {
  const u = 20, vh = 0.5, p = 1.5 / u
  const goalLine = (side: -1 | 1, r: number): Polyline[] =>
    side < 0
      ? [arc(-1, p, r, 0, PI / 2), seg(-1 + r, -p, -1 + r, p), arc(-1, -p, r, -PI / 2, 0)]
      : [arc(1, p, r, PI / 2, PI), seg(1 - r, -p, 1 - r, p), arc(1, -p, r, PI, (3 * PI) / 2)]
  return {
    vh,
    lines: [
      rect(-1, -vh, 1, vh), seg(0, -vh, 0, vh),
      ...goalLine(-1, 6 / u), ...goalLine(1, 6 / u), ...goalLine(-1, 9 / u), ...goalLine(1, 9 / u),
      seg(-1 + 7 / u, -0.015, -1 + 7 / u, 0.015), seg(1 - 7 / u, -0.015, 1 - 7 / u, 0.015),
    ],
  }
}

function volleyball(): Court {
  const vh = 0.5
  return {
    vh,
    lines: [rect(-1, -vh, 1, vh), seg(0, -vh - 0.06, 0, vh + 0.06), seg(-1 / 3, -vh, -1 / 3, vh), seg(1 / 3, -vh, 1 / 3, vh)],
  }
}

function tennis(): Court {
  const u = 11.885, vh = 5.485 / u, s = 4.115 / u, sv = 6.4 / u
  return {
    vh,
    lines: [
      rect(-1, -vh, 1, vh), seg(-1, -s, 1, -s), seg(-1, s, 1, s),
      seg(-sv, -s, -sv, s), seg(sv, -s, sv, s), seg(-sv, 0, sv, 0), seg(0, -vh - 0.04, 0, vh + 0.04),
    ],
  }
}

function athletics(): Court {
  // 400 m track: 84.39 m straights, 36.5 m inner radius, eight 1.22 m lanes
  const half = 0.536, r0 = 0.464, w = 0.0155
  const lanes: Polyline[] = []
  for (let i = 0; i <= 8; i++) {
    const r = r0 + w * i
    lanes.push([...arc(-half, 0, r, PI / 2, (3 * PI) / 2), ...arc(half, 0, r, -PI / 2, PI / 2), [-half, r] as const])
  }
  return { vh: r0 + w * 8, lines: lanes }
}

function taekwondo(): Court {
  // 10×10 m competition area incl. safety zone, 8×8 m contest area, 60 cm alert band
  return { vh: 1, lines: [rect(-1, -1, 1, 1), rect(-0.8, -0.8, 0.8, 0.8), rect(-0.72, -0.72, 0.72, 0.72)] }
}

const BUILDERS: Record<string, () => Court> = {
  football, basketball, handball, volleyball, tennis, athletics, taekwondo,
}
const cache = new Map<string, Court>()

/** Court geometry for a sport id, or undefined when the sport has no drawn court yet. */
export function courtFor(sportId: string): Court | undefined {
  const hit = cache.get(sportId)
  if (hit) return hit
  const build = BUILDERS[sportId]
  if (!build) return undefined
  const court = build()
  cache.set(sportId, court)
  return court
}
