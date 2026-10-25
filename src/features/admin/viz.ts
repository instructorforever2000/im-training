// Drawing helpers for لوحة المدير — gauges, health rings, the dot-matrix region map and the
// two live canvases (hero network + system pulse). All geometry lives in viz-config.json.
import V from "./viz-config.json"

type LonLat = readonly [number, number]
const TWO = 2
const TAU = Math.PI * TWO
const dpr = (): number => window.devicePixelRatio || 1
const OUTLINE = V.outline as unknown as Readonly<Record<string, readonly LonLat[]>>
const LABEL = V.label as unknown as Readonly<Record<string, LonLat>>
const ANCHOR: Readonly<Record<string, LonLat>> = { ...LABEL, ...(V.anchorOverride as unknown as Record<string, LonLat>) }
const DOT_FILL: Readonly<Record<string, string>> = { home: "#1FB5A855", region: "#5b6fe044", none: "#ffffff10" }
const HOME = "السعودية"

export function gaugeSvg(id: string, value: number, max: number, color: string, label: string): string {
  const g = V.gauge
  const f = max > 0 ? Math.min(1, value / max) : 0
  const C = Math.PI * g.rArc
  const ticks = Array.from({ length: g.ticks + 1 }, (_, i) => {
    const a = Math.PI + (Math.PI * i) / g.ticks
    const on = f > 0 && i / g.ticks <= f
    return `<line x1="${g.cx + g.rIn * Math.cos(a)}" y1="${g.cy + g.rIn * Math.sin(a)}" x2="${g.cx + g.rOut * Math.cos(a)}" y2="${g.cy + g.rOut * Math.sin(a)}" stroke="${on ? color : "#ffffff18"}" stroke-width="2" stroke-linecap="round" class="tk" style="animation-delay:${i * g.tickMs}ms"/>`
  }).join("")
  const arcD = `M${g.cx - g.rArc} ${g.cy} A${g.rArc} ${g.rArc} 0 0 1 ${g.cx + g.rArc} ${g.cy}`
  return `<defs><linearGradient id="gg${id}" x1="0" x2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}"/></linearGradient></defs>${ticks}
<path d="${arcD}" fill="none" stroke="#ffffff10" stroke-width="12" stroke-linecap="round"/>
<path d="${arcD}" fill="none" stroke="url(#gg${id})" stroke-width="12" stroke-linecap="round" class="arc" style="--l:${C * f};--c:${C};filter:drop-shadow(0 0 8px ${color})"/>
<text x="${g.cx}" y="${g.textY}" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="${g.font}" fill="#fff">${label}</text>`
}

export interface RingPart { readonly label: string; readonly value: number; readonly color: string }
export function healthSvg(parts: readonly RingPart[], score: number): string {
  const r = V.ring
  const rings = parts.map((m, i) => {
    const rad = r.r0 - i * r.step
    const C = TAU * rad
    return `<circle cx="${r.c}" cy="${r.c}" r="${rad}" fill="none" stroke="#ffffff0d" stroke-width="${r.w}"/><circle cx="${r.c}" cy="${r.c}" r="${rad}" fill="none" stroke="${m.color}" stroke-width="${r.w}" stroke-linecap="round" stroke-dasharray="${(C * m.value) / V.full + r.epsilon} ${C}" transform="rotate(-90 ${r.c} ${r.c})"/>`
  }).join("")
  return `${rings}<text x="${r.c}" y="${r.textY}" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="${r.font}" fill="#fff">${score}</text>`
}

function inside(p: LonLat, poly: readonly LonLat[]): boolean {
  return poly.reduce((c, [a, b], i) => {
    const [e, f] = poly[(i + poly.length - 1) % poly.length]
    const crosses = (b > p[1]) !== (f > p[1]) && p[0] < ((e - a) * (p[1] - b)) / (f - b) + a
    return crosses ? !c : c
  }, false)
}

const dotKind = (country: string | undefined): string => {
  if (!country) return "none"
  return country === HOME ? "home" : "region"
}

export interface GeoPoint { readonly name: string; readonly country: string }
export function geoSvg(points: readonly GeoPoint[]): { viewBox: string; html: string } {
  const g = V.geo
  const pr = ([lo, la]: LonLat): [number, number] => [(lo - g.lonMin) * g.scale, (g.latMax - la) * g.scale]
  const W = (g.lonMax - g.lonMin) * g.scale
  const H = (g.latMax - g.latMin) * g.scale
  const rows = Math.round((g.latMax - g.latMin) / g.step)
  const cols = Math.round((g.lonMax - g.lonMin) / g.step)
  const dots = Array.from({ length: rows * cols }, (_, n) => {
    const ll: LonLat = [g.lonMin + (n % cols) * g.step, g.latMax - Math.floor(n / cols) * g.step]
    const k = Object.keys(OUTLINE).find((name) => inside(ll, OUTLINE[name]))
    const [X, Y] = pr(ll)
    return `<circle cx="${X}" cy="${Y}" r="${k ? g.dotOn : g.dotOff}" fill="${DOT_FILL[dotKind(k)]}"/>`
  }).join("")
  const labels = Object.entries(LABEL).map(([n, ll]) => {
    const [X, Y] = pr(ll)
    return `<text x="${X}" y="${Y}" fill="#8696ab" font-size="10" text-anchor="middle" font-family="IBM Plex Sans Arabic">${n}</text>`
  }).join("")
  const pins = points.filter((p) => ANCHOR[p.country]).map((p, i) => {
    const [ox, oy0] = pr(ANCHOR[p.country])
    const oy = oy0 + i * g.pinGap
    return `<circle cx="${ox}" cy="${oy}" r="6" fill="#5ef0d8"><animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite"/></circle><circle cx="${ox}" cy="${oy}" r="6" fill="none" stroke="#5ef0d8"><animate attributeName="r" values="6;26" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite"/></circle><text x="${ox}" y="${oy - g.labelLift}" fill="#fff" font-size="11" text-anchor="middle" font-family="IBM Plex Sans Arabic">${p.name}</text>`
  }).join("")
  return { viewBox: `0 0 ${W} ${H}`, html: dots + labels + pins }
}

/** Size a canvas to its box at device resolution; returns the pixel size. */
function fit(canvas: HTMLCanvasElement, fixedH?: number): { W: number; H: number; k: number } {
  const k = dpr()
  const el = canvas
  el.width = el.offsetWidth * k
  el.height = (fixedH ?? el.offsetHeight) * k
  return { W: el.width, H: el.height, k }
}

/** Hero network: the organisations hub with orbiting system nodes and data pulses. */
export function startNetwork(canvas: HTMLCanvasElement): () => void {
  const n = V.net
  const x = canvas.getContext("2d")
  if (!x) return () => undefined
  let raf = 0
  let t = 0
  const nodes = Array.from({ length: n.nodes }, (_, i) => ({
    a: (i / n.nodes) * TAU + n.phase, d: n.base + (i % n.orbits) * n.ring,
    r: i % TWO ? n.rBig : n.rSmall, c: i % n.orbits ? "#5b6fe0" : "#1FB5A8",
  }))
  const frame = (): void => {
    const { W, H, k } = fit(canvas)
    t += n.speed
    const ox = W * n.ox
    const oy = H * V.half
    x.clearRect(0, 0, W, H)
    nodes.forEach((nd, i) => {
      const nx = ox + Math.cos(nd.a + t * n.spin) * nd.d * k
      const ny = oy + Math.sin(nd.a + t * n.spin) * nd.d * k * n.squash
      x.strokeStyle = "#1FB5A82a"; x.lineWidth = k
      x.beginPath(); x.moveTo(ox, oy); x.lineTo(nx, ny); x.stroke()
      const p = (t * n.flow + i * n.flowGap) % 1
      x.fillStyle = "#5ef0d8"; x.beginPath(); x.arc(ox + (nx - ox) * p, oy + (ny - oy) * p, n.dot * k, 0, TAU); x.fill()
      x.fillStyle = nd.c; x.beginPath(); x.arc(nx, ny, nd.r * k, 0, TAU); x.fill()
    })
    x.fillStyle = "#1FB5A833"; x.beginPath(); x.arc(ox, oy, (n.glow + Math.sin(t * n.glowRate) * n.glowAmp) * k, 0, TAU); x.fill()
    x.fillStyle = "#5ef0d8"; x.beginPath(); x.arc(ox, oy, n.hub * k, 0, TAU); x.fill()
    raf = requestAnimationFrame(frame)
  }
  frame()
  return () => cancelAnimationFrame(raf)
}

/** System pulse: a calm heartbeat; each real audit event adds a visible spike. */
export function startPulse(canvas: HTMLCanvasElement): { stop: () => void; spike: () => void } {
  const p = V.pulse
  const x = canvas.getContext("2d")
  const spikes: number[] = []
  if (!x) return { stop: () => undefined, spike: () => undefined }
  let raf = 0
  let t = 0
  let pts: number[] = []
  const frame = (): void => {
    const { W, H, k } = fit(canvas, p.h)
    const len = Math.ceil(W / (p.gap * k))
    if (pts.length !== len) pts = new Array<number>(len).fill(0)
    t += 1
    const base = Math.sin(t * p.fast) * p.baseAmp + Math.sin(t * p.slow) * p.amp
    const beat = p.shape[t % p.beat] ?? 0
    const sp = spikes[0] ?? 0
    if (spikes.length) { spikes[0] -= p.decay; if (spikes[0] <= 0) spikes.shift() }
    pts = [...pts.slice(1), base + beat + sp]
    x.clearRect(0, 0, W, H)
    const g = x.createLinearGradient(0, 0, W, 0)
    g.addColorStop(0, "#1FB5A800"); g.addColorStop(1, "#5ef0d8")
    x.strokeStyle = g; x.lineWidth = p.line * k; x.shadowColor = "#5ef0d8"; x.shadowBlur = p.blur
    x.beginPath()
    pts.forEach((v, i) => { const X = i * p.gap * k; const Y = H / TWO - v * p.amp * k; if (i) x.lineTo(X, Y); else x.moveTo(X, Y) })
    x.stroke(); x.shadowBlur = 0
    raf = requestAnimationFrame(frame)
  }
  frame()
  return { stop: () => cancelAnimationFrame(raf), spike: () => { spikes.push(p.spike) } }
}
