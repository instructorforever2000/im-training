import type { Sport } from "../../sports/registry"
import { courtFor, type Court, type Polyline } from "../../sports/courts"
import type { LayoutMetrics } from "../layout"

type Pt = [number, number]

const smooth = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const catmull = (a: number, b: number, c: number, d: number, t: number): number => {
  const t2 = t * t, t3 = t2 * t
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
}
function sample(ctrl: Pt[], n: number): Pt[] {
  const len = ctrl.length, out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * (len - 1), s = Math.min(Math.floor(u), len - 2), t = u - s
    const p0 = ctrl[Math.max(s - 1, 0)], p1 = ctrl[s], p2 = ctrl[s + 1], p3 = ctrl[Math.min(s + 2, len - 1)]
    out.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)])
  }
  return out
}
const PALETTE: string[] = Array.from({ length: 65 }, (_, i) => {
  const t = i / 64
  return `rgb(${Math.round(60 + 90 * t)},${Math.round(225 - 55 * t)},${Math.round(215 + 40 * t)})`
})

const HOLD_SECONDS = 6.5
const MORPH_SECONDS = 2.4
const MANUAL_HOLD_SECONDS = 8

/**
 * Draws the movement ribbon (a twisting ribbon of dots along a sport's movement path)
 * and the sport's court as a dotted floor in perspective. Pure canvas, no dependencies.
 */
export class MotionEngine {
  private readonly ctx: CanvasRenderingContext2D
  private readonly courts: (Court | undefined)[]
  private readonly order: number[]
  private W = 0
  private H = 0
  private dpr = 1
  private layout: LayoutMetrics | null = null
  private cur: number
  private nxt: number | null = null
  private morphStart = 0
  private lastSwitch = 0
  private orderPos = 0
  private shown = -1
  private now = 0
  private px = 0
  private py = 0
  private tx = 0
  private ty = 0
  private raf = 0
  private t0 = 0
  private running = false
  private readonly reduce: boolean

  private readonly canvas: HTMLCanvasElement
  private readonly root: HTMLElement
  private readonly sports: readonly Sport[]
  private readonly onChange: (index: number) => void

  constructor(
    canvas: HTMLCanvasElement,
    root: HTMLElement,
    sports: readonly Sport[],
    onChange: (index: number) => void,
  ) {
    this.canvas = canvas
    this.root = root
    this.sports = sports
    this.onChange = onChange
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D is not available")
    this.ctx = ctx
    this.courts = sports.map((s) => courtFor(s.id))
    // random order and random start, so no sport is privileged
    this.order = sports.map((_, i) => i)
    for (let i = this.order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.order[i], this.order[j]] = [this.order[j], this.order[i]]
    }
    this.cur = this.order[0]
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }

  setLayout(layout: LayoutMetrics): void {
    this.layout = layout
    this.resize()
  }

  resize(): void {
    this.W = window.innerWidth
    this.H = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(this.W * this.dpr)
    this.canvas.height = Math.round(this.H * this.dpr)
    // explicit CSS size: never let the bitmap size leak into layout (display scaling bug)
    this.canvas.style.width = `${this.W}px`
    this.canvas.style.height = `${this.H}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    if (!this.running) this.draw(this.now || 2)
  }

  setPointer(x: number, y: number): void {
    this.tx = (x / Math.max(1, this.W)) * 2 - 1
    this.ty = (y / Math.max(1, this.H)) * 2 - 1
  }

  select(index: number): void {
    if (index < 0 || index >= this.sports.length) return
    if (this.reduce) {
      this.cur = index
      this.nxt = null
      this.draw(2)
      return
    }
    if (this.nxt !== null) this.cur = (this.now - this.morphStart) / MORPH_SECONDS > 0.5 ? this.nxt : this.cur
    if (index === this.cur && this.nxt === null) return
    this.nxt = index
    this.morphStart = this.now
    this.lastSwitch = this.now + MANUAL_HOLD_SECONDS
  }

  start(): void {
    if (this.running) return
    this.draw(2)
    if (this.reduce) return
    this.running = true
    this.t0 = performance.now() / 1000 - this.now
    const tick = (): void => {
      if (!this.running) return
      this.now = performance.now() / 1000 - this.t0
      this.px += (this.tx - this.px) * 0.02
      this.py += (this.ty - this.py) * 0.02
      this.root.style.setProperty("--mx", this.px.toFixed(3))
      this.root.style.setProperty("--my", this.py.toFixed(3))
      this.draw(this.now)
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  dispose(): void {
    this.stop()
  }

  private advance(time: number): number {
    let m = 0
    if (this.nxt === null && time - this.lastSwitch > HOLD_SECONDS) {
      this.orderPos++
      let next = this.order[this.orderPos % this.order.length]
      if (next === this.cur) next = this.order[++this.orderPos % this.order.length]
      this.nxt = next
      this.morphStart = time
    }
    if (this.nxt !== null) {
      m = smooth((time - this.morphStart) / MORPH_SECONDS)
      if (m >= 1) {
        this.cur = this.nxt
        this.nxt = null
        this.lastSwitch = time
        m = 0
      }
    }
    return m
  }

  private draw(time: number): void {
    const L = this.layout
    if (!L || this.W === 0) return
    const { ctx, W, H } = this
    const m = this.reduce ? 0 : this.advance(time)
    const target = this.nxt ?? this.cur
    const a = this.sports[this.cur].motion, b = this.sports[target].motion
    const stack = L.mode === "stack"
    const ctrl: Pt[] = a.map((p, i) => {
      const w = Math.sin((Math.PI * i) / (a.length - 1))
      return [p[0] + (b[i][0] - p[0]) * m + this.px * 0.006 * w, p[1] + (b[i][1] - p[1]) * m + this.py * 0.008 * w]
    })
    const shown = m > 0.5 ? target : this.cur
    if (shown !== this.shown) {
      this.shown = shown
      this.onChange(shown)
    }
    ctx.clearRect(0, 0, W, H)
    this.drawCourt(this.courts[this.cur], 1 - m, L)
    if (target !== this.cur) this.drawCourt(this.courts[target], m, L)

    const n = L.mobile ? 260 : 520
    const k = L.mobile ? 14 : 26
    const pts = sample(ctrl, n)
    const toScreen = (p: Pt): Pt => (L.portrait ? [p[1] * W, (1 - p[0]) * H] : [p[0] * W, p[1] * H])
    const bw = L.portrait ? Math.min(W * 0.34, 130) : L.mobile ? 90 : Math.min(H * 0.19, 140)
    for (let i = 1; i < n; i++) {
      const t = i / n
      const p = toScreen(pts[i]), pr = toScreen(pts[i - 1]), nx = toScreen(pts[i + 1])
      let dx = nx[0] - pr[0], dy = nx[1] - pr[1]
      const len = Math.hypot(dx, dy) || 1
      dx /= len
      dy /= len
      const taper = Math.pow(Math.sin(Math.PI * t), 0.6)
      const width = bw * taper
      const twist = t * 7 + time * 0.55
      const ct = Math.cos(twist), st = Math.sin(twist)
      ctx.fillStyle = PALETTE[Math.round(t * 64)]
      for (let j = 0; j < k; j++) {
        const u = (j / (k - 1)) * 2 - 1
        const off = u * width * ct
        const z = u * st
        const size = (1 + (z + 1) * 0.65) * (L.mobile ? 0.9 : 1)
        ctx.globalAlpha = Math.min(1, (0.26 + (0.55 * (z + 1)) / 2) * (0.4 + taper))
        ctx.fillRect(p[0] - dy * off, p[1] + dx * off, size, size)
      }
    }
    ctx.globalAlpha = 1
    // a single bright point travels along the path (the athlete)
    const hi = Math.floor(((time * 0.09) % 1) * n)
    const hp = toScreen(pts[Math.max(1, Math.min(n - 1, hi))])
    const g = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 28)
    g.addColorStop(0, "rgba(255,255,255,.95)")
    g.addColorStop(0.25, "rgba(80,230,215,.75)")
    g.addColorStop(1, "rgba(31,181,168,0)")
    ctx.fillStyle = g
    ctx.fillRect(hp[0] - 28, hp[1] - 28, 56, 56)
    void stack
  }

  private drawCourt(court: Court | undefined, alpha: number, L: LayoutMetrics): void {
    if (!court || alpha < 0.01) return
    const { ctx, W, H } = this
    const K = 0.9, sc0 = 1 / (1 + K)
    const { vh } = court
    const stack = L.mode === "stack"
    if (stack) alpha *= 0.4 // behind scrolling content: keep it a quiet backdrop
    const hmax = stack ? L.courtH : L.courtH
    const bottom = H - (stack ? 96 : 118)
    const halfW = Math.min(W * (stack ? 0.46 : 0.44), hmax / (2 * vh * 0.28))
    const total = 2 * vh * halfW * 0.28
    const cx = W / 2
    const project = (u: number, v: number): Pt => {
      const z = (v + vh) / (2 * vh)
      const sc = 1 / (1 + K * (1 - z))
      return [cx + u * halfW * sc, bottom - (total * (1 - sc)) / (1 - sc0)]
    }
    const trace = (line: Polyline): void => {
      ctx.beginPath()
      line.forEach((p, i) => {
        const q = project(p[0], p[1])
        if (i === 0) ctx.moveTo(q[0], q[1])
        else ctx.lineTo(q[0], q[1])
      })
    }
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    trace(court.lines[0])
    ctx.fillStyle = `rgba(80,225,210,${0.07 * alpha})`
    ctx.fill()
    ctx.setLineDash([])
    ctx.lineWidth = 1.2
    ctx.strokeStyle = `rgba(240,225,185,${0.5 * alpha})`
    trace(court.lines[0])
    ctx.stroke()
    ctx.setLineDash([0.1, 6.5])
    ctx.lineWidth = 2.4
    ctx.shadowColor = `rgba(250,230,180,${0.55 * alpha})`
    ctx.shadowBlur = 6
    ctx.strokeStyle = `rgba(244,228,188,${0.9 * alpha})`
    for (let i = 1; i < court.lines.length; i++) {
      trace(court.lines[i])
      ctx.stroke()
    }
    ctx.restore()
  }
}
