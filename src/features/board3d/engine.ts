// السبورة التكتيكية ثلاثية الأبعاد (3D tactical board) — scene, players, drawing on the pitch, camera and frames.
// Formations and pitch sizes come from the roles engine (same data as the 2D board), so both boards agree.
import * as THREE from "three"
import { ENG } from "@/features/roles/engine/engine"

export type Mode = "fb11" | "fb7" | "futsal"
export type Tool = "move" | "pass" | "run" | "dribble" | "zone" | "erase"
export type Side = "A" | "B"
export type Cam = "broadcast" | "top" | "goal"
type XZ = [number, number]
export interface Token { id: string; kind: "p" | "ball"; team?: Side; num?: number; code?: string; x: number; z: number }
export interface Mark { id: string; kind: Exclude<Tool, "move" | "erase">; pts: XZ[] }
export interface BoardState { mode: Mode; form: Record<Side, string>; tokens: Token[]; marks: Mark[]; frames: Record<string, XZ>[] }

interface ModeDef { L: number; W: number }
const MODES = ENG.MODES as unknown as Record<string, ModeDef>
const FORM = ENG.FORM as unknown as Record<string, Record<string, [string, number, number, number][]>>
export const formsOf = (m: Mode): string[] => Object.keys(FORM[m])
export const TEAM_COLOR: Record<Side, string> = { A: "#E6BE3A", B: "#E0564F" }
export const MARK_COLOR: Record<Mark["kind"], string> = { pass: "#ffffff", run: "#f2c14e", dribble: "#1FB5A8", zone: "#5b6fe0" }

const Y_LINE = 0.04, Y_MARK = 0.08, HALF = 2, TAU = Math.PI * 2
const STRIPES = 12, MIN_STEP = 0.6, ARROW_HEAD = 1.4, TUBE_R = 0.18, WAVE_A = 0.45, WAVE_L = 1.6
const FRAME_MS = 1400, PICK_R = 2.2

let seq = 0
const uid = (p: string): string => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

export function newBoard(mode: Mode, form?: Partial<Record<Side, string>>): BoardState {
  const M = MODES[mode], fa = form?.A ?? formsOf(mode)[0], fb = form?.B ?? formsOf(mode)[0]
  const tokens: Token[] = []
  const put = (side: Side, key: string): void => FORM[mode][key].forEach(([c, n, x, y]) => {
    const fx = side === "A" ? x : 1 - x, fy = side === "A" ? y : 1 - y
    tokens.push({ id: uid("p"), kind: "p", team: side, num: n, code: c, x: fx * M.L - M.L / HALF, z: fy * M.W - M.W / HALF })
  })
  put("A", fa); put("B", fb)
  tokens.push({ id: uid("b"), kind: "ball", x: 0, z: 0 })
  const b: BoardState = { mode, form: { A: fa, B: fb }, tokens, marks: [], frames: [] }
  b.frames = [snap(b)]
  return b
}
export const snap = (b: BoardState): Record<string, XZ> => Object.fromEntries(b.tokens.map((t) => [t.id, [t.x, t.z] as XZ]))

/** Re-place one team on a new formation, keeping the same token ids. */
export function setFormation(b: BoardState, side: Side, key: string): void {
  const M = MODES[b.mode], mine = b.tokens.filter((t) => t.kind === "p" && t.team === side)
  FORM[b.mode][key].forEach(([c, n, x, y], i) => {
    const t = mine[i]; if (!t) return
    const fx = side === "A" ? x : 1 - x, fy = side === "A" ? y : 1 - y
    t.code = c; t.num = n; t.x = fx * M.L - M.L / HALF; t.z = fy * M.W - M.W / HALF
  })
  b.form[side] = key
}

function numberSprite(n: string, bg: string): THREE.Sprite {
  const px = 128, c = document.createElement("canvas"); c.width = c.height = px
  const x = c.getContext("2d")
  if (x) {
    x.fillStyle = bg; x.beginPath(); x.arc(px / HALF, px / HALF, px / HALF - 4, 0, TAU); x.fill()
    x.lineWidth = 6; x.strokeStyle = "#0b1b33"; x.stroke()
    x.fillStyle = "#0b1b33"; x.font = `bold ${px / HALF}px Outfit, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(n, px / HALF, px / HALF + 4)
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }))
  s.scale.set(2.6, 2.6, 1); s.renderOrder = 5
  return s
}

function pitch(M: ModeDef): THREE.Group {
  const g = new THREE.Group(), { L, W } = M
  const plane = (w: number, h: number, color: string, x: number, y: number): void => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }))
    m.rotation.x = -Math.PI / HALF; m.position.set(x, y, 0); m.receiveShadow = true; g.add(m)
  }
  plane(L + 16, W + 14, "#256f4c", 0, 0)
  for (let i = 0; i < STRIPES; i++) plane(L / STRIPES, W, i % HALF ? "#2d8a5e" : "#33966a", -L / HALF + L / STRIPES / HALF + (i * L) / STRIPES, 0.01)
  const lm = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 })
  const ln = (pts: XZ[]): void => { g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => new THREE.Vector3(x, Y_LINE, z))), lm)) }
  const hl = L / HALF, hw = W / HALF
  ln([[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw], [-hl, -hw]]); ln([[0, -hw], [0, hw]])
  const circ = (cx: number, cz: number, r: number, a0 = 0, a1 = TAU): void => ln(Array.from({ length: 49 }, (_, i): XZ => { const a = a0 + ((a1 - a0) * i) / 48; return [cx + r * Math.cos(a), cz + r * Math.sin(a)] }))
  const s = L / 105
  circ(0, 0, 9.15 * s)
  ;[-1, 1].forEach((d) => {
    const e = d * hl, bx = 16.5 * s, bz = 20.16 * s, sx = 5.5 * s, sz = 9.16 * s
    ln([[e, -bz], [e - d * bx, -bz], [e - d * bx, bz], [e, bz]])
    ln([[e, -sz], [e - d * sx, -sz], [e - d * sx, sz], [e, sz]])
    const gw = 3.66 * s, gh = 2.44, post = new THREE.MeshStandardMaterial({ color: "#ffffff" })
    ;[-gw, gw].forEach((z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, gh), post); p.position.set(e, gh / HALF, z); g.add(p) })
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, gw * HALF), post); bar.rotation.x = Math.PI / HALF; bar.position.set(e, gh, 0); g.add(bar)
    const net = new THREE.Mesh(new THREE.PlaneGeometry(gw * HALF, gh), new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.18, side: THREE.DoubleSide }))
    net.rotation.y = Math.PI / HALF; net.position.set(e + d * 1.6, gh / HALF, 0); g.add(net)
  })
  return g
}

function playerObj(t: Token): THREE.Group {
  const g = new THREE.Group(), col = TEAM_COLOR[t.team ?? "A"], gk = t.code === "GK"
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 6, 14), new THREE.MeshStandardMaterial({ color: gk ? "#2a8be0" : col, roughness: 0.45 }))
  body.position.y = 1.2; body.castShadow = true; g.add(body)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), new THREE.MeshStandardMaterial({ color: "#c68e64", roughness: 0.6 }))
  head.position.y = 2.35; head.castShadow = true; g.add(head)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.2, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75 }))
  ring.rotation.x = -Math.PI / HALF; ring.position.y = Y_LINE; ring.name = "ring"; g.add(ring)
  const sp = numberSprite(String(t.num ?? ""), col); sp.position.y = 3.6; g.add(sp)
  return g
}

function markObj(m: Mark): THREE.Object3D {
  const col = MARK_COLOR[m.kind], mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, transparent: m.kind === "zone", opacity: m.kind === "zone" ? 0.28 : 1 })
  if (m.kind === "zone") {
    const [a, b] = [m.pts[0], m.pts[m.pts.length - 1]], r = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]))
    const d = new THREE.Mesh(new THREE.CircleGeometry(r, 48), mat); d.rotation.x = -Math.PI / HALF; d.position.set(a[0], Y_MARK, a[1])
    const edge = new THREE.Mesh(new THREE.RingGeometry(r - 0.15, r, 64), new THREE.MeshBasicMaterial({ color: col })); edge.rotation.x = -Math.PI / HALF; edge.position.set(a[0], Y_MARK + 0.01, a[1])
    const g = new THREE.Group(); g.add(d, edge); return g
  }
  let pts = m.pts.map(([x, z]) => new THREE.Vector3(x, Y_MARK + 0.15, z))
  if (m.kind === "dribble" && pts.length > 1) {
    const base = new THREE.CatmullRomCurve3(pts), len = base.getLength(), n = Math.max(8, Math.round(len / 0.4))
    pts = Array.from({ length: n + 1 }, (_, i) => {
      const u = i / n, p = base.getPointAt(u), tg = base.getTangentAt(u), nx = -tg.z, nz = tg.x
      const w = Math.sin((u * len * TAU) / WAVE_L) * WAVE_A * Math.min(1, (1 - u) * 6)
      return new THREE.Vector3(p.x + nx * w, p.y, p.z + nz * w)
    })
  }
  const g = new THREE.Group()
  if (pts.length < 2) return g
  const curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength()
  if (m.kind === "pass") {
    const dash = 1.1, n = Math.floor(len / (dash * HALF))
    for (let i = 0; i < n; i++) {
      const a = (i * dash * HALF) / len, b = Math.min(1, (i * dash * HALF + dash) / len)
      const seg = new THREE.CatmullRomCurve3([curve.getPointAt(a), curve.getPointAt((a + b) / HALF), curve.getPointAt(b)])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(seg, 4, TUBE_R, 6), mat))
    }
  } else g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 2), TUBE_R, 8), mat))
  const end = curve.getPointAt(1), dir = curve.getTangentAt(1)
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.55, ARROW_HEAD, 14), mat)
  head.position.copy(end); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); g.add(head)
  return g
}

export interface Board3D {
  readonly state: () => BoardState
  load: (b: BoardState) => void
  setTool: (t: Tool) => void
  setCam: (c: Cam) => void
  frame: (i: number, animate: boolean) => void
  addFrame: () => number
  play: (onStep: (i: number) => void, onEnd: () => void) => () => void
  dark: (on: boolean) => void
  png: () => string
  dispose: () => void
}

export function mountBoard3D(canvas: HTMLCanvasElement, init: BoardState, onChange: (b: BoardState) => void): Board3D {
  let st: BoardState = init, tool: Tool = "move", fi = 0
  const rn = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
  rn.setPixelRatio(Math.min(window.devicePixelRatio, HALF)); rn.shadowMap.enabled = true
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 0.5, 900)
  sc.add(new THREE.HemisphereLight("#ffffff", "#5a6a5a", 1.15))
  const sun = new THREE.DirectionalLight("#ffffff", 1.6); sun.position.set(30, 80, 40); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 50, bottom: -50 }); sc.add(sun)
  const world = new THREE.Group(); sc.add(world)
  let field = new THREE.Group(), marks = new THREE.Group()
  const objs = new Map<string, { o: THREE.Group; to: THREE.Vector3 }>()
  const ballMesh = (): THREE.Group => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.35 })); m.position.y = 0.42; m.castShadow = true; g.add(m); return g }

  const build = (): void => {
    world.clear(); objs.clear()
    field = pitch(MODES[st.mode]); world.add(field)
    marks = new THREE.Group(); world.add(marks); st.marks.forEach((m) => marks.add(Object.assign(markObj(m), { name: m.id })))
    st.tokens.forEach((t) => { const o = t.kind === "ball" ? ballMesh() : playerObj(t); o.position.set(t.x, 0, t.z); o.userData.id = t.id; world.add(o); objs.set(t.id, { o, to: o.position.clone() }) })
  }

  // camera — orbit around the pitch centre; presets ease to their angles
  const M0 = (): ModeDef => MODES[st.mode]
  const view = { az: -0.35, el: 0.82, dist: 1, tx: 0, tz: 0 }, goal = { ...view }
  const presets = (c: Cam): typeof view => {
    const L = M0().L
    if (c === "top") return { az: 0, el: 1.5, dist: L * 1.32, tx: 0, tz: 0 }
    if (c === "goal") return { az: Math.PI / HALF, el: 0.42, dist: L * 0.62, tx: L * 0.12, tz: 0 }
    return { az: -0.3, el: 0.86, dist: L * 1.42, tx: 0, tz: 4 }
  }
  const setCam = (c: Cam): void => { Object.assign(goal, presets(c)) }
  Object.assign(view, presets("broadcast")); Object.assign(goal, view)

  const size = (): void => { const r = canvas.getBoundingClientRect(); rn.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix() }
  const ro = new ResizeObserver(size); ro.observe(canvas)

  // picking on the ground plane
  const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2()
  const onGround = (e: PointerEvent): XZ | null => {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * HALF - 1, -((e.clientY - r.top) / r.height) * HALF + 1)
    ray.setFromCamera(ndc, cam); const p = new THREE.Vector3(); return ray.ray.intersectPlane(ground, p) ? [p.x, p.z] : null
  }
  const nearest = (p: XZ): Token | null => {
    let best: Token | null = null, bd = PICK_R
    st.tokens.forEach((t) => { const d = Math.hypot(t.x - p[0], t.z - p[1]); if (d < bd) { bd = d; best = t } })
    return best
  }
  const commit = (): void => { st.frames[fi] = snap(st); onChange(st) }

  type Drag = { k: "tok"; t: Token } | { k: "draw"; m: Mark; o: THREE.Object3D } | { k: "orbit"; x: number; y: number; az: number; el: number }
  let drag: Drag | null = null
  const down = (e: PointerEvent): void => {
    canvas.setPointerCapture(e.pointerId)
    const p = onGround(e)
    if (e.button === HALF || e.button === 1 || !p) { drag = { k: "orbit", x: e.clientX, y: e.clientY, az: goal.az, el: goal.el }; return }
    if (tool === "move") { const t = nearest(p); drag = t ? { k: "tok", t } : { k: "orbit", x: e.clientX, y: e.clientY, az: goal.az, el: goal.el }; return }
    if (tool === "erase") {
      const hit = st.marks.findIndex((m) => m.pts.some(([x, z]) => Math.hypot(x - p[0], z - p[1]) < PICK_R))
      if (hit >= 0) { const [m] = st.marks.splice(hit, 1); const o = marks.getObjectByName(m.id); if (o) marks.remove(o); onChange(st) }
      return
    }
    const m: Mark = { id: uid("m"), kind: tool, pts: [p, p] }; const o = new THREE.Group(); marks.add(o); drag = { k: "draw", m, o }
  }
  const move = (e: PointerEvent): void => {
    if (!drag) return
    if (drag.k === "orbit") { goal.az = drag.az - (e.clientX - drag.x) * 0.006; goal.el = Math.max(0.25, Math.min(1.52, drag.el + (e.clientY - drag.y) * 0.005)); return }
    const p = onGround(e); if (!p) return
    if (drag.k === "tok") { const M = M0(); drag.t.x = Math.max(-M.L / HALF - 4, Math.min(M.L / HALF + 4, p[0])); drag.t.z = Math.max(-M.W / HALF - 4, Math.min(M.W / HALF + 4, p[1])); const ob = objs.get(drag.t.id); if (ob) { ob.to.set(drag.t.x, 0, drag.t.z); ob.o.position.copy(ob.to) }; return }
    const last = drag.m.pts[drag.m.pts.length - 1]
    if (drag.m.kind === "zone" || drag.m.kind === "pass") drag.m.pts = [drag.m.pts[0], p]
    else if (Math.hypot(p[0] - last[0], p[1] - last[1]) > MIN_STEP) drag.m.pts.push(p)
    marks.remove(drag.o); drag.o = markObj(drag.m); drag.o.name = drag.m.id; marks.add(drag.o)
  }
  const up = (): void => {
    if (drag?.k === "tok") commit()
    if (drag?.k === "draw") { const [a, b] = [drag.m.pts[0], drag.m.pts[drag.m.pts.length - 1]]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1) { st.marks.push(drag.m); onChange(st) } else marks.remove(drag.o) }
    drag = null
  }
  const wheel = (e: WheelEvent): void => { e.preventDefault(); const L = M0().L; goal.dist = Math.max(L * 0.25, Math.min(L * 1.6, goal.dist * (1 + e.deltaY * 0.0012))) }
  canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up)
  canvas.addEventListener("wheel", wheel, { passive: false }); canvas.addEventListener("contextmenu", (e) => e.preventDefault())

  let raf = 0
  const loop = (): void => {
    raf = requestAnimationFrame(loop)
    ;(Object.keys(view) as (keyof typeof view)[]).forEach((k) => { view[k] += (goal[k] - view[k]) * 0.12 })
    objs.forEach(({ o, to }) => o.position.lerp(to, 0.14))
    cam.position.set(view.tx + view.dist * Math.cos(view.el) * Math.sin(view.az), view.dist * Math.sin(view.el), view.tz + view.dist * Math.cos(view.el) * Math.cos(view.az))
    cam.lookAt(view.tx, 0, view.tz); rn.render(sc, cam)
  }
  const dark = (on: boolean): void => { const bg = on ? "#060b13" : "#dfe7ee"; rn.setClearColor(bg); sc.fog = new THREE.Fog(bg, 160, 320) }
  build(); size(); dark(false); loop()

  const frame = (i: number, animate: boolean): void => {
    fi = Math.max(0, Math.min(st.frames.length - 1, i)); const f = st.frames[fi]
    st.tokens.forEach((t) => { const p = f[t.id]; if (!p) return; t.x = p[0]; t.z = p[1]; const ob = objs.get(t.id); if (ob) { ob.to.set(p[0], 0, p[1]); if (!animate) ob.o.position.copy(ob.to) } })
  }
  return {
    state: () => st,
    load: (b) => { st = b; fi = 0; build(); Object.assign(goal, presets("broadcast")); onChange(st) },
    setTool: (t) => { tool = t; canvas.style.cursor = t === "move" ? "grab" : "crosshair" },
    setCam,
    frame,
    addFrame: () => { st.frames.splice(fi + 1, 0, snap(st)); fi += 1; onChange(st); return fi },
    play: (onStep, onEnd) => {
      let i = 0; frame(0, false); onStep(0)
      const t = window.setInterval(() => { i += 1; if (i >= st.frames.length) { window.clearInterval(t); onEnd(); return } frame(i, true); onStep(i) }, FRAME_MS)
      return () => window.clearInterval(t)
    },
    dark,
    png: () => rn.domElement.toDataURL("image/png"),
    dispose: () => { cancelAnimationFrame(raf); ro.disconnect(); rn.dispose() },
  }
}
